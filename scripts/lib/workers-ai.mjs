// scripts/lib/workers-ai.mjs
//
// Minimal REST client for Workers AI, shared by the offline content generators.
//
// The generators deliberately call the REST API instead of the Worker's own `AI`
// binding: the binding spends the account's daily neuron allowance, which speech
// recognition also draws from. A batch render through the binding would starve
// the ASR fallback in production.
//
// Credentials live in .dev.vars (gitignored):
//   CLOUDFLARE_API_TOKEN   a token with the "Account > Workers AI > Read" permission
//   CLOUDFLARE_ACCOUNT_ID  the account id the token belongs to

import { readFileSync } from 'node:fs';

// Cloudflare routes this alias to llama-3.3-70b-instruct-sd. It answers with
// structured JSON already parsed onto result.response, so callers get an object.
export const DEFAULT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

// Paid-tier pricing, printed after every run so a batch never surprises anyone.
// Free tier: the first 10,000 neurons per day are not billed.
const USD_PER_NEURON = 0.011 / 1000;

export const readDevVars = (path = '.dev.vars') => {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    throw new Error(
      `${path} not found. Create it with CLOUDFLARE_API_TOKEN=... and CLOUDFLARE_ACCOUNT_ID=... ` +
        '(see the header of this file).',
    );
  }
  const vars = Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter((line) => line && !line.trimStart().startsWith('#') && line.includes('='))
      .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()]),
  );
  for (const name of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID']) {
    if (!vars[name]) throw new Error(`${name} is missing from ${path}.`);
  }
  return vars;
};

// Models usually answer with clean JSON, but a stray code fence or a preamble
// would otherwise crash a long batch, so recover the first JSON object we can see.
const parseLooseJson = (value) => {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  const text = value.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '');
  try {
    return JSON.parse(text);
  } catch {
    /* fall through to the brace scan */
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const createWorkersAi = ({ token, accountId, model = DEFAULT_MODEL, log = console.warn }) => {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
  let calls = 0;
  let neurons = 0;

  const once = async (messages, { maxTokens = 256, temperature, schema } = {}) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        max_tokens: maxTokens,
        ...(temperature === undefined ? {} : { temperature }),
        // JSON Mode: the runtime enforces the schema, so a reply arrives as an object and
        // a malformed one fails loudly instead of burning a retry on a stray fence or a
        // preamble. The generators pass the same shape their prompt already describes.
        ...(schema ? { response_format: { type: 'json_schema', json_schema: schema } } : {}),
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.success === false) {
      const detail = JSON.stringify(body.errors ?? body).slice(0, 300);
      const error = new Error(`HTTP ${res.status}: ${detail}`);
      // 429 is the only status worth waiting on; 5xx is usually a transient node.
      error.retryable = res.status === 429 || res.status >= 500;
      throw error;
    }
    calls += 1;
    neurons += body.result?.usage?.neurons ?? 0;
    const parsed = parseLooseJson(body.result?.response);
    if (!parsed) {
      const error = new Error(`model did not return JSON: ${JSON.stringify(body.result).slice(0, 300)}`);
      error.retryable = true;
      throw error;
    }
    return parsed;
  };

  // Generators run unattended for hours, so a single hiccup must not kill a batch.
  const call = async (messages, options = {}, { attempts = 3 } = {}) => {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await once(messages, options);
      } catch (error) {
        if (attempt >= attempts || error.retryable === false) throw error;
        log(`  retry ${attempt}/${attempts - 1} after: ${error.message}`);
        await sleep(1200 * attempt);
      }
    }
  };

  return {
    call,
    stats: () => ({ calls, neurons, usd: neurons * USD_PER_NEURON }),
    report: () => `${calls} calls, ${neurons.toFixed(1)} neurons (~$${(neurons * USD_PER_NEURON).toFixed(5)})`,
  };
};

export const formatUsd = (usd) => `$${usd.toFixed(5)}`;

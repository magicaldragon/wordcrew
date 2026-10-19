// scripts/generate-announcer.mjs
//
// Renders the four narrator callouts in /public/audio with Deepgram Aura on
// Workers AI. The lines ship with the game, so they must be rendered once and
// committed — never fetched at runtime.
//
// Aura is a hosted model, so it spends the account's neuron allowance. Four
// one-word lines are a rounding error next to the ASR fallback, but the REST
// route is used (not the Worker's own AI binding) for the same reason as the
// other generators: a batch must not eat the allowance production needs.
//
// Usage:
//   node scripts/generate-announcer.mjs
//   node scripts/generate-announcer.mjs --speaker=orion
//   node scripts/generate-announcer.mjs --only=combo,hurry-up
//
// Voices worth trying for an announcer read: zeus (energetic), orion (deep,
// confident), thalia (bright, cheerful), hera (confident female).

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readDevVars } from './lib/workers-ai.mjs';

const MODEL = '@cf/deepgram/aura-1';
const DEFAULT_SPEAKER = 'zeus';
const OUT_DIR = join('public', 'audio');

// WAV rather than MP3 on purpose: Aura's MP3 encoder is capped at 22.05 kHz /
// 48 kbps, which makes a hero line sound like a phone call. A 48 kHz WAV costs
// ~50 KB per line — noise next to the music tracks — and keeps the top end the
// announcer EQ lifts.
const FORMAT = { encoding: 'linear16', container: 'wav', sample_rate: 48000 };

// One entry per file already referenced by ANNOUNCER_CALLOUTS in constants.ts.
// The exclamation marks are load-bearing: Aura reads a bare word flat, and the
// point of these lines is the push at the end.
const LINES = [
  { key: 'combo', file: 'announcer-combo.wav', text: 'Combo!' },
  { key: 'on-fire', file: 'announcer-on-fire.wav', text: 'On fire!' },
  { key: 'unstoppable', file: 'announcer-unstoppable.wav', text: 'Unstoppable!' },
  { key: 'hurry-up', file: 'announcer-hurry-up.wav', text: 'Hurry up!' },
];

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [name, value = ''] = arg.replace(/^--/, '').split('=');
    return [name, value];
  }),
);

const speaker = args.get('speaker') || DEFAULT_SPEAKER;
const only = args.get('only')
  ? new Set(
      args
        .get('only')
        .split(',')
        .map((key) => key.trim().toLowerCase())
        .filter(Boolean),
    )
  : null;
const lines = only ? LINES.filter((line) => only.has(line.key)) : LINES;

if (!lines.length) {
  throw new Error(`No lines matched --only=${args.get('only')}. Known keys: ${LINES.map((l) => l.key).join(', ')}`);
}

const { CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID } = readDevVars();
const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const render = async (text, { attempts = 3 } = {}) => {
  for (let attempt = 1; ; attempt += 1) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, speaker, ...FORMAT }),
    });
    if (res.ok) {
      const type = res.headers.get('content-type') || '';
      const audio = Buffer.from(await res.arrayBuffer());
      if (!type.startsWith('audio/')) {
        throw new Error(`expected audio, got ${type}: ${audio.toString('utf8').slice(0, 200)}`);
      }
      return audio;
    }
    const body = await res.text().catch(() => '');
    const error = new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
    if (attempt >= attempts) throw error;
    console.warn(`  retry ${attempt}/${attempts - 1} after: ${error.message}`);
    await sleep(1200 * attempt);
  }
};

console.log(`Rendering ${lines.length} line(s) with ${MODEL} — voice "${speaker}"`);

for (const line of lines) {
  const started = Date.now();
  const audio = await render(line.text);
  const path = join(OUT_DIR, line.file);
  writeFileSync(path, audio);
  console.log(`  ${line.file.padEnd(28)} ${String(audio.length).padStart(6)} B  ${Date.now() - started} ms  "${line.text}"`);
}

console.log('Done. Rebuild the app so the new files land in dist/public.');

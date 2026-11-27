#!/usr/bin/env node
// Guards the failure mode that is easy to miss: a successful build and a successful
// `git push`, while the live site still serves the previous bundle. Production is the
// Worker at wordcrew.app, so comparing the asset hashes in dist/index.html with the
// hashes in the deployed HTML is the cheapest honest proof that the deploy landed.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const args = process.argv.slice(2);
const urlFlag = args.indexOf('--url');
const baseUrl = (urlFlag !== -1 ? args[urlFlag + 1] : 'https://wordcrew.app').replace(/\/+$/, '');
const attempts = 12;
const delayMs = 5000;

const ASSET = /assets\/index-[A-Za-z0-9_-]+\.(?:js|css)/g;

function assetsIn(html) {
  return [...new Set(html.match(ASSET) ?? [])].sort();
}

const indexPath = path.join(process.cwd(), 'dist', 'index.html');
let expected;
try {
  expected = assetsIn(await readFile(indexPath, 'utf8'));
} catch {
  console.error(`✖ ${indexPath} not found — run "npm run build" first.`);
  process.exit(1);
}
if (expected.length === 0) {
  console.error(`✖ No hashed bundles found in ${indexPath}.`);
  process.exit(1);
}

let live = [];
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    // Cache-buster on the document is what makes a stale edge copy visible instead of
    // silently passing; the header covers intermediaries that ignore query strings.
    const res = await fetch(`${baseUrl}/?deploycheck=${Date.now()}`, {
      headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
    });
    if (res.ok) {
      live = assetsIn(await res.text());
      if (live.length === expected.length && live.every((asset, i) => asset === expected[i])) {
        console.log(`✔ ${baseUrl} is serving this build: ${expected.join(', ')}`);
        process.exit(0);
      }
      console.log(`  attempt ${attempt}/${attempts}: live=${live.join(', ') || '(none)'}`);
    } else {
      console.log(`  attempt ${attempt}/${attempts}: HTTP ${res.status}`);
    }
  } catch (err) {
    console.log(`  attempt ${attempt}/${attempts}: ${err.message}`);
  }
  if (attempt < attempts) await sleep(delayMs);
}

console.error(`✖ ${baseUrl} is NOT serving this build.`);
console.error(`  expected: ${expected.join(', ')}`);
console.error(`  live:     ${live.join(', ') || '(none)'}`);
console.error('  Production is the Worker; Cloudflare Pages only serves wordcrew.pages.dev.');
process.exit(1);

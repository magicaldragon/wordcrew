// scripts/generate-sfx.mjs
//
// Regenerates the three short mechanic cues that are still synthesised here. Everything
// this file writes is built from oscillators and filtered noise, so the output is an
// original work of this project and carries no third-party licence — that is the whole
// point: the build can be shown to contain no borrowed sound.
//
// Usage:
//   node scripts/generate-sfx.mjs              write into public/audio
//   node scripts/generate-sfx.mjs --out=DIR    write somewhere else and compare
//
// The other cues in public/audio are NOT produced here and must not be overwritten:
//   correct-sound.wav      — synthesised here, kept as WAV (constants.ts expects .wav)
//   time-freeze.mp3        — synthesised here, encoded to MP3 (constants.ts expects .mp3)
//   skip-freebie-used.mp3  — synthesised here, encoded to MP3
//   skip-sound.mp3         — hand-picked render (see docs/am-thanh/danh-sach-thay-the.md)
//   try-again.wav          — hand-picked render
// The MP3s need ffmpeg: set FFMPEG to a binary path, or have `ffmpeg` on PATH. Without it
// the WAVs are still written and the script says which files it skipped.
//
// Every cue is normalised to -3 dBFS peak with 5 ms fades so it cannot click, and is
// mono 44.1 kHz to match the rest of the effect bus.

import { spawnSync } from 'node:child_process';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SR = 44100;
const TAU = Math.PI * 2;
const args = process.argv.slice(2);
const outDir = args.find((a) => a.startsWith('--out='))?.slice(6) ?? join('public', 'audio');
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg';

const buf = (seconds) => new Float32Array(Math.round(seconds * SR));

function add(target, startSec, src, gain = 1) {
  const off = Math.round(startSec * SR);
  for (let i = 0; i < src.length; i++) {
    const j = off + i;
    if (j >= 0 && j < target.length) target[j] += src[i] * gain;
  }
  return target;
}

const sine = (freq, dur, amp = 1, phase = 0) => {
  const out = buf(dur);
  for (let i = 0; i < out.length; i++) out[i] = amp * Math.sin(TAU * freq * (i / SR) + phase);
  return out;
};

// A struck bell: fundamental plus two inharmonic partials, exponential decay.
function bell(freq, dur, amp = 1) {
  const out = buf(dur);
  const partials = [[1, 1], [2.01, 0.35], [3.02, 0.14]];
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const env = Math.exp(-t * 7.5) * (1 - Math.exp(-t * 900));
    let s = 0;
    for (const [mul, g] of partials) s += g * Math.sin(TAU * freq * mul * t);
    out[i] = amp * env * s * 0.62;
  }
  return out;
}

function noise(dur) {
  const out = buf(dur);
  let seed = 0x2f6e2b1;
  for (let i = 0; i < out.length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    out[i] = (seed / 0xffffffff) * 2 - 1;
  }
  return out;
}

// State-variable band-pass whose centre frequency follows a linear sweep.
function sweptNoise(dur, f0, f1, q = 1.2) {
  const n = noise(dur);
  const out = buf(dur);
  let low = 0;
  let band = 0;
  for (let i = 0; i < n.length; i++) {
    const p = i / n.length;
    const fc = f0 + (f1 - f0) * p;
    const f = 2 * Math.sin((Math.PI * fc) / SR);
    low += f * band;
    const high = n[i] - low - q * band;
    band += f * high;
    out[i] = band;
  }
  return out;
}

function expDecay(dur, rate) {
  const out = buf(dur);
  for (let i = 0; i < out.length; i++) out[i] = Math.exp(-(i / SR) * rate);
  return out;
}

function attackDecay(dur, attackSec, rate) {
  const out = expDecay(dur, rate);
  const a = Math.round(attackSec * SR);
  for (let i = 0; i < a && i < out.length; i++) out[i] *= i / a;
  return out;
}

const mul = (a, b) => {
  const out = buf(a.length / SR);
  for (let i = 0; i < out.length; i++) out[i] = a[i] * b[i];
  return out;
};

// 1. correct-sound — two ascending bell notes, C5 then G5.
function correctSound() {
  const out = buf(0.5);
  add(out, 0.0, bell(523.25, 0.42), 1);
  add(out, 0.09, bell(783.99, 0.36), 0.8);
  return out;
}

// 2. time-freeze — falling sweep, ice shimmer and a short wash.
function timeFreeze() {
  const out = buf(1.3);
  const sweep = buf(1.0);
  for (let i = 0; i < sweep.length; i++) {
    const t = i / SR;
    const f = 1400 * Math.exp(-2.2 * t) + 240;
    sweep[i] = Math.sin(TAU * f * t) * Math.exp(-t * 2.6) * 0.5;
  }
  add(out, 0, sweep, 1);
  const shimmer = buf(1.25);
  for (const f of [2093, 2637, 3136]) {
    add(shimmer, 0, mul(sine(f, 1.25), attackDecay(1.25, 0.03, 2.4)), 0.12);
  }
  add(out, 0.08, shimmer, 1);
  add(out, 0.0, mul(sweptNoise(0.9, 5000, 1800, 1.6), attackDecay(0.9, 0.05, 4)), 0.22);
  return out;
}

// 3. skip-freebie-used — click plus a short dry sweep, lighter than skip-sound.
function skipFreebie() {
  const out = buf(0.5);
  add(out, 0.0, mul(noise(0.012), expDecay(0.012, 220)), 0.4);
  add(out, 0.012, mul(sweptNoise(0.3, 1400, 700, 1.4), attackDecay(0.3, 0.01, 12)), 0.8);
  return out;
}

function writeWav(file, samples) {
  // Normalise to -3 dBFS, then add 5 ms fades so the cue cannot click.
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const gain = peak > 0 ? 0.708 / peak : 1;
  const fade = Math.round(0.005 * SR);
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    let v = samples[i] * gain;
    if (i < fade) v *= i / fade;
    if (i > samples.length - fade) v *= (samples.length - i) / fade;
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(file, Buffer.concat([header, data]));
}

// Peak of a rendered file, read back from ffmpeg. MP3 overshoots on bright transients, so
// the -3 dBFS from writeWav is a starting point rather than the delivered level.
function peakDb(file) {
  const res = spawnSync(ffmpeg, ['-hide_banner', '-i', file, '-af', 'volumedetect', '-f', 'null', '-']);
  const match = /max_volume:\s*(-?[\d.]+) dB/.exec(res.stderr.toString());
  return match ? Number(match[1]) : null;
}

function encodeMp3(wav, mp3) {
  let gainDb = 0;
  for (let pass = 0; pass < 2; pass++) {
    const res = spawnSync(ffmpeg, [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', wav,
      '-af', `volume=${gainDb}dB`,
      '-ac', '1', '-ar', String(SR), '-c:a', 'libmp3lame', '-b:a', '128k',
      mp3,
    ]);
    if (res.status !== 0) return null;
    const peak = peakDb(mp3);
    if (peak === null || peak <= -2.9) return peak;
    gainDb -= peak + 3;
  }
  return peakDb(mp3);
}

// The cues constants.ts expects as .mp3; correct-sound ships as .wav.
const AS_MP3 = new Set([
  'time-freeze',
  'skip-freebie-used',
]);

const jobs = [
  ['correct-sound', correctSound()],
  ['time-freeze', timeFreeze()],
  ['skip-freebie-used', skipFreebie()],
];

mkdirSync(outDir, { recursive: true });

for (const [name, samples] of jobs) {
  const wav = join(outDir, `${name}.wav`);
  writeWav(wav, samples);
  const seconds = (samples.length / SR).toFixed(2);

  if (!AS_MP3.has(name)) {
    console.log(`${name.padEnd(20)} ${seconds} s  ${name}.wav`);
    continue;
  }

  const mp3 = join(outDir, `${name}.mp3`);
  const peak = encodeMp3(wav, mp3);
  if (peak === null) {
    console.log(`${name.padEnd(20)} ${seconds} s  ${name}.wav  (no ffmpeg: .mp3 not written)`);
    continue;
  }
  unlinkSync(wav);
  console.log(`${name.padEnd(20)} ${seconds} s  ${name}.mp3  peak ${peak.toFixed(1)} dBFS`);
}

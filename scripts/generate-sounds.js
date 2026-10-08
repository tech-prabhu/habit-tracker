#!/usr/bin/env node
/**
 * Synthesizes the app's reward sounds into assets/sounds/*.wav.
 * Run with: node scripts/generate-sounds.js
 */
const fs = require('fs');
const path = require('path');

const RATE = 44100;
const outDir = path.join(__dirname, '..', 'assets', 'sounds');

/** A bell-like tone: a few harmonics with exponential decay. */
function bell(buf, startSec, freq, { amp = 0.5, decay = 3.5, partials = [1, 0.35, 0.12] } = {}) {
  const start = Math.floor(startSec * RATE);
  for (let i = start; i < buf.length; i++) {
    const t = (i - start) / RATE;
    const env = Math.exp(-decay * t) * Math.min(1, t / 0.004);
    let s = 0;
    partials.forEach((p, k) => {
      s += p * Math.sin(2 * Math.PI * freq * (k + 1) * t);
    });
    buf[i] += amp * env * s;
  }
}

function render(seconds, draw) {
  const buf = new Float64Array(Math.floor(seconds * RATE));
  draw(buf);
  const peak = buf.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  const pcm = Buffer.alloc(buf.length * 2);
  // Normalize and fade the last 20ms to avoid a click.
  const fade = Math.floor(0.02 * RATE);
  buf.forEach((v, i) => {
    const tail = Math.min(1, (buf.length - i) / fade);
    pcm.writeInt16LE(Math.round((v / peak) * 0.8 * tail * 32767), i * 2);
  });
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

const sounds = {
  // Soft "pop" for a single count increment.
  tick: render(0.12, (buf) => {
    for (let i = 0; i < buf.length; i++) {
      const t = i / RATE;
      const freq = 700 + 900 * t * 4;
      buf[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-40 * t) * Math.min(1, t / 0.002);
    }
  }),
  // Two-note rising chime for completing a habit.
  chime: render(1.0, (buf) => {
    bell(buf, 0, 1318.5); // E6
    bell(buf, 0.09, 1975.5, { amp: 0.45 }); // B6
  }),
  // Major arpeggio for a perfect day / finished challenge.
  fanfare: render(1.8, (buf) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(buf, i * 0.11, f, { decay: 2.2 }));
    [1046.5, 1318.5, 1567.98].forEach((f) => bell(buf, 0.5, f, { amp: 0.3, decay: 1.6 }));
  }),
};

fs.mkdirSync(outDir, { recursive: true });
for (const [name, data] of Object.entries(sounds)) {
  fs.writeFileSync(path.join(outDir, `${name}.wav`), data);
  console.log(`wrote assets/sounds/${name}.wav (${(data.length / 1024).toFixed(1)} KB)`);
}

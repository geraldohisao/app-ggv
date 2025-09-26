#!/usr/bin/env node
/*
  Simple load generator for Gemini calls.
  Usage: node -r dotenv/config scripts/load-test.js --n=30 --concurrency=5 --model=gemini-1.5-flash
*/
const { performance } = require('perf_hooks');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));

const N = parseInt(args.n || '20', 10);
const CONC = parseInt(args.concurrency || '5', 10);
const MODEL = args.model || process.env.MODEL || 'gemini-1.5-flash';
const QUESTION = process.env.QUESTION || 'Explique rapidamente como qualificar leads B2B.';
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('GEMINI_API_KEY ausente no ambiente.');
  process.exit(1);
}

async function callGemini(prompt) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 512 }
  };
  const t0 = performance.now();
  const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const t1 = performance.now();
  const ms = t1 - t0;
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(`HTTP ${res.status} ${res.statusText} ${j?.error?.message || ''}`);
  }
  await res.json();
  return ms;
}

async function run() {
  const times = [];
  let inFlight = 0;
  let i = 0;

  async function spawn() {
    if (i >= N) return;
    const idx = i++;
    inFlight++;
    try {
      const ms = await callGemini(`${QUESTION}\n#${idx}`);
      times.push(ms);
    } catch (e) {
      console.error('erro:', e.message);
    } finally {
      inFlight--;
      if (i < N) spawn();
    }
  }

  for (let c = 0; c < Math.min(CONC, N); c++) spawn();
  while (times.length + inFlight < N) await new Promise(r => setTimeout(r, 50));

  times.sort((a, b) => a - b);
  const p = (q) => times[Math.floor((times.length - 1) * q)];
  const avg = times.reduce((s, x) => s + x, 0) / (times.length || 1);
  console.log(JSON.stringify({ count: times.length, p50: p(0.5), p95: p(0.95), avg }, null, 2));
}

run();



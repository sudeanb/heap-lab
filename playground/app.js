import { FreeList } from './js/free-list.js';
import { Buddy } from './js/buddy.js';
import { Slab } from './js/slab.js';
import { makeTrace, replay } from './js/trace.js';
import { benchAllocator } from './js/bench.js';

const POOL = 64 * 1024;                 // small pool so single blocks are visible on canvas
const ALLOCATORS = [
  { key: 'free-list', label: 'free-list · first-fit', color: '#58a6ff', make: () => new FreeList(POOL) },
  { key: 'buddy', label: 'buddy · power-of-2', color: '#3fb950', make: () => new Buddy(POOL) },
  { key: 'slab', label: 'slab · 64-byte objects', color: '#d29922', make: () => new Slab(64, POOL) },
];

const SIZE_CLASS_COLORS = ['#79c0ff', '#a5d6ff', '#7ee787', '#ffa657', '#f778ba', '#d2a8ff', '#ffa198'];

let trace = null;
let cursor = 0;
let timer = null;
const state = ALLOCATORS.map(() => ({ alloc: null, ptrById: new Map(), lastOp: '' }));

const panels = document.getElementById('panels');
const canvases = ALLOCATORS.map((a, i) => {
  const div = document.createElement('div');
  div.className = 'panel';
  div.innerHTML = `
    <h2><span class="dot" style="background:${a.color}"></span>${a.label}</h2>
    <canvas width="720" height="96"></canvas>
    <div class="metrics"></div>
    <div class="oplog"></div>`;
  panels.appendChild(div);
  return div.querySelector('canvas');
});

function freshState() {
  trace = makeTrace({ seed: Number(document.getElementById('preset').value), ops: 260 });
  cursor = 0;
  ALLOCATORS.forEach((a, i) => {
    state[i].alloc = a.make();
    state[i].ptrById = new Map();
    state[i].lastOp = 'ready';
  });
  stop();
  renderAll();
}

function applyStep() {
  if (cursor >= trace.ops.length) { stop(); return; }
  const op = trace.ops[cursor++];
  ALLOCATORS.forEach((a, i) => {
    const s = state[i];
    if (op.op === 'alloc') {
      const p = a.key === 'slab' ? undefined : op.size;
      if (p === null) s.lastOp = `#${op.id} alloc ${op.size} → FAIL`;
      else { s.ptrById.set(op.id, p); s.lastOp = `#${op.id} alloc ${op.size}B @${p}`; }
    } else if (s.ptrById.has(op.id)) {
      const p = s.ptrById.get(op.id);
      s.alloc.free(p);
      s.lastOp = `#${op.id} free @${p}`;
    } else {
      s.lastOp = `#${op.id} free skipped (never allocated here)`;
    }
  });
}

function drawClass(canvas, alloc) {
  const ctx = canvas.getContext('2d');
  const { width: W, height: H } = canvas;
  ctx.clearRect(0, 0, W, H);
  const blocks = alloc.map().filter((b) => b.alive);
  for (const b of blocks) {
    const x = (b.offset / POOL) * W;
    const w = Math.max(1.5, (b.size / POOL) * W);
    const cls = Math.min(SIZE_CLASS_COLORS.length - 1, Math.floor(Math.log2(Math.max(2, b.size)) / 2));
    ctx.fillStyle = SIZE_CLASS_COLORS[cls];
    ctx.fillRect(x, 8, w, H - 16);
  }
}

function fmt(n) { return n.toLocaleString('en-US'); }

function metricsHTML(alloc) {
  const s = alloc.stats();
  const usedPct = ((POOL - s.freeBytes) / POOL * 100).toFixed(1);
  const fragPct = (s.fragRatio * 100).toFixed(1);
  return `
    <span>utilization <b>${usedPct}%</b></span>
    <span>frag (ext.) <b>${fragPct}%</b></span>
    <span>largest free <b>${fmt(s.largestFree)} B</b></span>
    <span>free chunks <b>${fmt(s.freeChunks)}</b></span>
    <span>allocs / fails <b>${fmt(s.totalAllocs)} / ${alloc.failed}</b></span>
    <span>peak bytes <b>${fmt(s.peakBytes)}</b></span>`;
}

function renderAll() {
  ALLOCATORS.forEach((a, i) => {
    const s = state[i];
    drawClass(canvases[i], s.alloc);
    const panel = canvases[i].closest('.panel');
    panel.querySelector('.metrics').innerHTML = metricsHTML(s.alloc);
    panel.querySelector('.oplog').textContent = s.lastOp + `   ·   op ${cursor}/${trace.ops.length}`;
  });
}

function play() {
  if (timer) return;
  if (cursor >= trace.ops.length) freshState();
  document.getElementById('play').textContent = '⏸ pause';
  const perSec = Number(document.getElementById('speed').value);
  timer = setInterval(() => { applyStep(); renderAll(); }, 1000 / perSec);
}
function stop() {
  clearInterval(timer);
  timer = null;
  document.getElementById('play').textContent = '▶ play';
}

document.getElementById('play').onclick = () => (timer ? stop() : play());
document.getElementById('step').onclick = () => { stop(); applyStep(); renderAll(); };
document.getElementById('reset').onclick = freshState;
document.getElementById('preset').onchange = freshState;
document.getElementById('speed').oninput = (e) => {
  document.getElementById('speedVal').textContent = `${e.target.value} ops/s`;
  if (timer) { stop(); play(); }
};
document.getElementById('bench').onclick = () => {
  const out = document.getElementById('benchOut');
  const bars = document.getElementById('benchBars');
  out.hidden = false;
  bars.innerHTML = '';
  const maxMs = 90;
  const results = ALLOCATORS.map((a) => ({ a, r: benchAllocator(a.make(), { ms: maxMs, size: 96 }) }));
  const best = Math.max(...results.map((x) => x.r.opsPerSec));
  results.forEach(({ a, r }) => {
    const div = document.createElement('div');
    div.className = 'bar';
    const h = Math.max(6, Math.round((r.opsPerSec / best) * 100));
    div.innerHTML = `
      <div style="text-align:center;font-size:12px">${fmt(r.opsPerSec)} ops/s</div>
      <div class="fill" style="height:${h}%;background:${a.color}"></div>
      <div class="lbl">${a.key}</div>`;
    bars.appendChild(div);
  });
};

freshState();

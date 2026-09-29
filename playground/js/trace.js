/* Seeded deterministic workloads shared by all three allocators.
   The trace is generated ONCE; every allocator replays the identical
   op sequence so comparisons are fair. Free ops reference the op id of
   the allocation they release; allocators skip frees for ids they
   could not allocate (e.g. slab only serves its own size class). */

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PHASES = [
  { name: 'small-heavy', min: 16, max: 256 },    // object churn
  { name: 'mixed', min: 64, max: 2048 },         // realistic mix
  { name: 'large-heavy', min: 1024, max: 8192 }, // fragmentation pressure
];

export function makeTrace({ seed = 1, ops = 240, freeProb = 0.45 } = {}) {
  const rng = mulberry32(seed);
  const trace = [];
  const live = [];
  let nextId = 0;
  for (let i = 0; i < ops; i++) {
    const phase = PHASES[Math.min(PHASES.length - 1, Math.floor((i / ops) * PHASES.length))];
    const wantFree = live.length > 0 && rng() < freeProb;
    if (wantFree) {
      const k = Math.floor(rng() * live.length);
      const id = live[k];
      live[k] = live[live.length - 1];
      live.pop();
      trace.push({ op: 'free', id });
    } else {
      const size = Math.ceil(phase.min + rng() * (phase.max - phase.min));
      const id = nextId++;
      live.push(id);
      trace.push({ op: 'alloc', size, id });
    }
  }
  return { ops: trace, seed, phases: PHASES.map((p) => p.name) };
}

/* Replay a trace on any allocator exposing alloc(size)/free(offset).
   Returns the trace-id → pointer map for visualization. */
export function replay(allocator, trace) {
  const ptrById = new Map();
  for (const step of trace.ops) {
    if (step.op === 'alloc') {
      const p = allocator.alloc(step.size);
      if (p !== null) ptrById.set(step.id, p);
    } else if (ptrById.has(step.id)) {
      allocator.free(ptrById.get(step.id));
    }
  }
  return ptrById;
}

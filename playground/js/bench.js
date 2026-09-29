/* In-browser / in-process benchmark harness (used by the playground). */

const now = () => (globalThis.performance ? performance.now() : Date.now());

/* Churn an allocator for `ms` milliseconds and report throughput. */
export function benchAllocator(allocator, { ms = 120, size = 128, live = 256 } = {}) {
  const ptrs = [];
  let allocs = 0, frees = 0, fails = 0;
  const end = now() + ms;
  let i = 0;
  while (now() < end) {
    const p = allocator.alloc(size + (i % 3) * 32);
    if (p === null) { fails++; allocator.free(ptrs.shift()); continue; }
    ptrs.push(p);
    allocs++;
    if (ptrs.length > live) { allocator.free(ptrs.shift()); frees++; }
    i++;
  }
  return { opsPerSec: Math.round(((allocs + frees) / ms) * 1000), allocs, frees, fails };
}

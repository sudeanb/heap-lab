import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FreeList } from '../playground/js/free-list.js';
import { Buddy } from '../playground/js/buddy.js';
import { Slab } from '../playground/js/slab.js';
import { makeTrace, replay, benchAllocator } from '../playground/js/index.js';

const K = 1024;

test('free-list: round-trip, alignment and reuse of the first hole', () => {
  const h = new FreeList(64 * K);
  const a = h.alloc(100);
  const b = h.alloc(100);
  assert.equal(a, 0);
  assert.equal(b, 100, '100 is already 4-byte aligned, so the next block starts right after');
  assert.equal(h.free(a), true);
  const c = h.alloc(48);
  assert.equal(c, 0, 'first-fit must reuse the freed hole at offset 0');
  const s = h.stats();
  assert.ok(s.fragRatio >= 0 && s.fragRatio <= 1);
  assert.equal(h.free(12345), false, 'unknown offset');
});

test('free-list: OOM returns null and counts the failure', () => {
  const h = new FreeList(4 * K);
  assert.equal(h.alloc(5 * K), null);
  assert.equal(h.failed, 1);
});

test('free-list: no two live allocations ever overlap on a seeded trace', () => {
  const h = new FreeList(64 * K);
  const trace = makeTrace({ seed: 7, ops: 400 });
  replay(h, trace);
  const live = h.blocks.filter((b) => b.alive).sort((x, y) => x.offset - y.offset);
  for (let i = 1; i < live.length; i++) {
    assert.ok(live[i].offset >= live[i - 1].offset + live[i - 1].size, 'overlap detected');
  }
});

test('buddy: fresh pool is one free block spanning everything', () => {
  const h = new Buddy(64 * K);
  const s = h.stats();
  assert.equal(s.largestFree, 64 * K);
  assert.equal(s.fragRatio, 0);
});

test('buddy: allocated blocks sit at order-aligned offsets', () => {
  const h = new Buddy(64 * K);
  const ps = [h.alloc(64), h.alloc(64), h.alloc(256), h.alloc(300)];
  for (const p of ps) assert.notEqual(p, null);
  assert.equal(ps[0], 0);
  assert.equal(ps[1], 64);
  for (const p of [h.alloc(64), h.alloc(64), h.alloc(64)]) assert.equal(p % 8, 0);
});

test('buddy: freeing adjacent buddies coalesces back to the full pool', () => {
  const h = new Buddy(64 * K);
  const a = h.alloc(100), b = h.alloc(100);
  h.free(a);
  h.free(b);
  const s = h.stats();
  assert.equal(s.largestFree, 64 * K, 'two adjacent orders must merge all the way up');
  assert.equal(s.currentBytes, 0, 'free must decrement current_bytes');
});

test('buddy: same-seed traces keep block sizes at powers of two', () => {
  const h = new Buddy(64 * K);
  replay(h, makeTrace({ seed: 3, ops: 200 }));
  for (const r of h.blocks) {
    const order = Math.max(1, 1 << Math.ceil(Math.log2(Math.max(1, r.size))));
    assert.equal(r.block & (r.block - 1), 0, 'block size is a power of two');
    assert.ok(r.block >= order);
    assert.equal(r.offset % r.block, 0, 'block offset aligned to its order');
  }
});

test('slab: bump allocation at fixed slots, frees do not reclaim', () => {
  const h = new Slab(64, 4 * K);
  const a = h.alloc(), b = h.alloc();
  assert.equal(a, 0);
  assert.equal(b, 64);
  h.free(a);
  const c = h.alloc();
  assert.equal(c, 128, 'no reclaim — the next slot is fresh');
  const s = h.stats();
  assert.equal(s.fragRatio, 0);
  assert.equal(s.internalFrag, 64);
});

test('slab: capacity is enforced', () => {
  const h = new Slab(64, 256);
  for (let i = 0; i < 4; i++) assert.notEqual(h.alloc(), null);
  assert.equal(h.alloc(), null);
  assert.equal(h.failed, 1);
});

test('all three allocators survive the same seeded trace with valid frees', () => {
  const trace = makeTrace({ seed: 11, ops: 500 });
  const allocs = [new FreeList(64 * K), new Buddy(64 * K), new Slab(128, 64 * K)];
  for (const h of allocs) {
    const ptrs = replay(h, trace);
    assert.ok(ptrs.size > 0);
    const s = h.stats();
    assert.ok(s.freeBytes >= 0 && s.freeBytes <= 64 * K);
    assert.ok(s.totalFrees > 0, 'the trace frees anything it allocated');
  }
});

test('bench harness returns positive throughput', () => {
  const r = benchAllocator(new FreeList(256 * K), { ms: 30 });
  assert.ok(r.opsPerSec > 0);
});

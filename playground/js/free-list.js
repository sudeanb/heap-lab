/* Browser port of kernel/free_list.c — implicit free-list, first-fit.
   Pointers are integer offsets into the pool (the C version offsets into
   a byte array; the placement algorithm is unchanged). */

export class FreeList {
  constructor(size = 1 << 20) {
    this.size = size;
    this.blocks = [];               // alloc records, alive flag mirrors the C struct
    this.totals = { totalAllocs: 0, totalFrees: 0, currentBytes: 0, peakBytes: 0 };
    this.failed = 0;
  }

  alloc(size) {
    if (!size) return null;
    size = (size + 3) & ~3;                       // 4-byte alignment, as in C
    let offset = 0;
    let placed = false;
    while (offset + size <= this.size && !placed) {
      placed = true;
      for (const b of this.blocks) {
        if (!b.alive) continue;
        if (offset < b.offset + b.size && offset + size > b.offset) {
          offset = b.offset + b.size;             // overlap → resume after it
          placed = false;
          break;
        }
      }
    }
    if (!placed || offset + size > this.size) { this.failed++; return null; }
    const rec = { offset, size, alive: true, seq: this.totals.totalAllocs + 1 };
    this.blocks.push(rec);
    this.totals.totalAllocs++;
    this.totals.currentBytes += size;
    this.totals.peakBytes = Math.max(this.totals.peakBytes, this.totals.currentBytes);
    return offset;
  }

  free(offset) {
    const b = this.blocks.find((r) => r.alive && r.offset === offset);
    if (!b) return false;
    b.alive = false;
    this.totals.totalFrees++;
    this.totals.currentBytes -= b.size;
    return true;
  }

  /* Same numbers as fl_stats, computed from sorted records instead of a
     byte-by-byte scan over the pool. */
  stats() {
    const live = this.blocks.filter((b) => b.alive).sort((a, b) => a.offset - b.offset);
    let freeBytes = this.size - this.totals.currentBytes;
    let freeChunks = 0, largestFree = 0, run = this.size > 0 ? this.size : 0;
    let cursor = 0;
    for (const b of live) {
      const gap = b.offset - cursor;
      if (gap > 0) { freeChunks++; largestFree = Math.max(largestFree, gap); }
      cursor = b.offset + b.size;
    }
    run = this.size - cursor;
    if (run > 0) { freeChunks++; largestFree = Math.max(largestFree, run); }
    return {
      ...this.totals,
      freeBytes,
      freeChunks,
      largestFree,
      fragRatio: freeBytes > 0 ? 1 - largestFree / freeBytes : 0,
    };
  }

  map() { return this.blocks; }
}

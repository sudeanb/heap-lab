/* Browser port of kernel/slab.c — fixed-size object pools.
   Bump allocation, no per-object reclaim (pools are recycled wholesale),
   frees mark records dead for visualization. */

export class Slab {
  constructor(objSize = 64, size = 1 << 20) {
    this.objSize = Math.max(8, objSize);
    this.size = size;
    this.blocks = [];
    this.totals = { totalAllocs: 0, totalFrees: 0, currentBytes: 0, peakBytes: 0 };
    this.used = 0;
    this.failed = 0;
  }

  get capacity() { return Math.floor(this.size / this.objSize); }

  alloc() {
    if (this.used >= this.capacity) { this.failed++; return null; }
    const offset = this.used * this.objSize;
    this.used++;
    const rec = { offset, size: this.objSize, alive: true, seq: this.totals.totalAllocs + 1 };
    this.blocks.push(rec);
    this.totals.totalAllocs++;
    this.totals.currentBytes += this.objSize;
    this.totals.peakBytes = Math.max(this.totals.peakBytes, this.totals.currentBytes);
    return offset;
  }

  free(offset) {
    const rec = this.blocks.find((r) => r.alive && r.offset === offset);
    if (!rec) return false;
    rec.alive = false;
    this.totals.totalFrees++;
    /* no reclaim — mirrors the C design decision */
    return true;
  }

  stats() {
    const usedBytes = this.used * this.objSize;
    const freeBytes = this.size - usedBytes;
    const hasRoom = this.used < this.capacity;
    return {
      ...this.totals,
      freeBytes,
      freeChunks: hasRoom ? 1 : 0,
      largestFree: hasRoom ? freeBytes : 0,
      fragRatio: 0,                               // zero external fragmentation
      internalFrag: this.objSize,
    };
  }

  map() { return this.blocks; }
}

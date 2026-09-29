/* Browser port of kernel/buddy.c — power-of-2 split/merge.
   Mirrors the C version after the 2026-09-29 accounting fixes: the pool
   seeds ONE free block spanning the full pool (top order), and frees
   decrement current_bytes. */

export class Buddy {
  constructor(size = 1 << 20) {
    this.size = size;
    this.topOrder = 0;
    while (1 << this.topOrder < size) this.topOrder++;
    this.reset();
  }

  reset() {
    this.freeList = [];
    for (let o = 0; o <= this.topOrder; o++) this.freeList[o] = [];
    this.freeList[this.topOrder].push(0);
    this.blocks = [];
    this.totals = { totalAllocs: 0, totalFrees: 0, currentBytes: 0, peakBytes: 0 };
    this.failed = 0;
  }

  orderFor(size) {
    let o = 0;
    while (1 << o < size && o < this.topOrder) o++;
    return o;
  }

  alloc(size) {
    if (!size) return null;
    const need = this.orderFor(size);
    let o = need;
    while (o <= this.topOrder && this.freeList[o].length === 0) o++;
    if (o > this.topOrder) { this.failed++; return null; }
    const addr = this.freeList[o].pop();
    while (o > need) {                            // split: keep lower half, park upper half
      o--;
      const half = 1 << o;
      this.freeList[o].push(addr + half);
    }
    const rec = { offset: addr, size, block: 1 << need, alive: true, seq: this.totals.totalAllocs + 1 };
    this.blocks.push(rec);
    this.totals.totalAllocs++;
    this.totals.currentBytes += size;
    this.totals.peakBytes = Math.max(this.totals.peakBytes, this.totals.currentBytes);
    return addr;
  }

  free(offset) {
    const rec = this.blocks.find((r) => r.alive && r.offset === offset);
    if (!rec) return false;
    rec.alive = false;
    this.totals.totalFrees++;
    this.totals.currentBytes -= rec.size;
    let addr = offset;
    let o = this.orderFor(rec.size);
    while (o < this.topOrder) {                   // coalesce with the buddy while present
      const buddy = addr ^ (1 << o);
      const i = this.freeList[o].indexOf(buddy);
      if (i < 0) break;
      this.freeList[o].splice(i, 1);
      addr &= ~(1 << o);
      o++;
    }
    this.freeList[o].push(addr);
    return true;
  }

  stats() {
    let freeBytes = 0, largestFree = 0;
    for (let o = 0; o <= this.topOrder; o++) {
      freeBytes += this.freeList[o].length * (1 << o);
      if (this.freeList[o].length > 0) largestFree = 1 << o;
    }
    return {
      ...this.totals,
      freeBytes,
      freeChunks: this.freeList.reduce((n, l) => n + l.length, 0),
      largestFree,
      fragRatio: freeBytes > 0 ? 1 - largestFree / freeBytes : 0,
    };
  }

  map() { return this.blocks; }
}

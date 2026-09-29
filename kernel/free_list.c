#include "heap_lab.h"
void fl_init(free_list_t *h) { memset(h->pool, 0, HEAP_SIZE); h->alloc_count = 0; memset(&h->stats, 0, sizeof(h->stats)); }
void *fl_alloc(free_list_t *h, size_t size) {
    if (!size || h->alloc_count >= MAX_ALLOCATIONS) return NULL;
    size = (size + 3) & ~3u;
    uint32_t offset = 0;
    int placed = 0;
    while (offset + size <= HEAP_SIZE && !placed) {
        placed = 1;
        for (int i = 0; i < h->alloc_count; i++) {
            if (!h->allocs[i].alive) continue;
            if (offset < h->allocs[i].offset + h->allocs[i].size && offset + size > h->allocs[i].offset) {
                offset = h->allocs[i].offset + h->allocs[i].size; placed = 0; break;
            }
        }
    }
    if (!placed || offset + size > HEAP_SIZE) return NULL;
    h->allocs[h->alloc_count] = (alloc_record_t){ .offset = offset, .size = (uint32_t)size, .alive = 1, .alloc_seq = ++h->stats.total_allocs };
    h->alloc_count++;
    h->stats.current_bytes += (uint32_t)size;
    if (h->stats.current_bytes > h->stats.peak_bytes) h->stats.peak_bytes = h->stats.current_bytes;
    return h->pool + offset;
}
void fl_free(free_list_t *h, void *ptr) {
    uint32_t off = (uint32_t)((uint8_t *)ptr - h->pool);
    for (int i = 0; i < h->alloc_count; i++) {
        if (h->allocs[i].alive && h->allocs[i].offset == off) {
            h->allocs[i].alive = 0; h->stats.total_frees++; h->stats.current_bytes -= h->allocs[i].size; return;
        }
    }
}
void fl_stats(free_list_t *h, heap_stats_t *out) {
    *out = h->stats;
    uint32_t free_bytes = HEAP_SIZE - h->stats.current_bytes;
    out->free_bytes = free_bytes; out->free_chunks = 0; out->largest_free = 0;
    uint32_t run = 0;
    for (uint32_t i = 0; i <= HEAP_SIZE; i++) {
        int used = 0;
        if (i < HEAP_SIZE) for (int j = 0; j < h->alloc_count; j++) {
            if (h->allocs[j].alive && i >= h->allocs[j].offset && i < h->allocs[j].offset + h->allocs[j].size) { used = 1; break; }
        }
        if (i == HEAP_SIZE || used) { if (run) { out->free_chunks++; if (run > out->largest_free) out->largest_free = run; run = 0; } }
        else run++;
    }
    out->frag_ratio = free_bytes > 0 ? 1.0 - (double)out->largest_free / free_bytes : 0.0;
}

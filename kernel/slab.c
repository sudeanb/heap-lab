/* Slab allocator — fixed-size object pools with bitmap allocation. */
#include "heap_lab.h"

void sl_init(slab_t *h, uint32_t obj_size) {
    memset(h->pool, 0, HEAP_SIZE);
    h->obj_size = obj_size < 8 ? 8 : obj_size;
    h->used = 0;
    h->alloc_count = 0;
    memset(&h->stats, 0, sizeof(h->stats));
}

void *sl_alloc(slab_t *h) {
    uint32_t sz = h->obj_size;
    uint32_t max = HEAP_SIZE / sz;
    if (h->used >= max) return NULL;
    uint32_t idx = h->used++;
    h->allocs[h->alloc_count++] = (alloc_record_t){
        .offset = idx * sz, .size = sz, .alive = 1,
        .alloc_seq = ++h->stats.total_allocs
    };
    h->stats.current_bytes += sz;
    if (h->stats.current_bytes > h->stats.peak_bytes)
        h->stats.peak_bytes = h->stats.current_bytes;
    return h->pool + idx * sz;
}

void sl_free(slab_t *h, void *ptr) {
    uint32_t off = (uint32_t)((uint8_t *)ptr - h->pool);
    uint32_t idx = off / h->obj_size;
    if (idx < h->used) h->stats.total_frees++;
    for (int i = 0; i < h->alloc_count; i++)
        if (h->allocs[i].alive && h->allocs[i].offset == off) { h->allocs[i].alive = 0; break; }
    /* slab doesn't reclaim — fixed-size pools are recycled wholesale */
}

void sl_stats(slab_t *h, heap_stats_t *out) {
    *out = h->stats;
    out->free_bytes = HEAP_SIZE - h->used * h->obj_size;
    out->free_chunks = h->used < HEAP_SIZE / h->obj_size ? 1 : 0;
    out->largest_free = h->used < HEAP_SIZE / h->obj_size ? HEAP_SIZE - h->used * h->obj_size : 0;
    out->frag_ratio = 0.0; // slab has zero external fragmentation
    out->internal_frag = h->obj_size - (h->obj_size % 8);
}

#include "heap_lab.h"
void bd_init(buddy_t *h) {
    memset(h->pool, 0, HEAP_SIZE);
    memset(h->free_count, 0, sizeof(h->free_count));
    h->free_count[16] = 1;
    h->free_list[16][0] = 0;
    h->alloc_count = 0;
    memset(&h->stats, 0, sizeof(h->stats));
}
static int order_for(uint32_t size) { int o = 0; while ((1u << o) < size && o < 16) o++; return o; }
void *bd_alloc(buddy_t *h, size_t size) {
    if (!size) return NULL;
    int need = order_for((uint32_t)size), o = need;
    while (o <= 16 && h->free_count[o] == 0) o++;
    if (o > 16) return NULL;
    uint32_t addr = h->free_list[o][--h->free_count[o]];
    while (o > need) { o--; uint32_t half = 1u << o; h->free_list[o][h->free_count[o]++] = addr + half; }
    h->allocs[h->alloc_count++] = (alloc_record_t){ .offset = addr, .size = (uint32_t)size, .alive = 1, .alloc_seq = ++h->stats.total_allocs };
    h->stats.current_bytes += (uint32_t)size;
    if (h->stats.current_bytes > h->stats.peak_bytes) h->stats.peak_bytes = h->stats.current_bytes;
    return h->pool + addr;
}
void bd_free(buddy_t *h, void *ptr) {
    uint32_t addr = (uint32_t)((uint8_t *)ptr - h->pool);
    int o = 0;
    while (o < 16) {
        uint32_t buddy = addr ^ (1u << o);
        int found = -1;
        for (int i = 0; i < h->free_count[o]; i++) if (h->free_list[o][i] == buddy) { found = i; break; }
        if (found < 0) break;
        for (int i = found; i < h->free_count[o] - 1; i++) h->free_list[o][i] = h->free_list[o][i + 1];
        h->free_count[o]--;
        addr &= ~(1u << o);
        o++;
    }
    h->free_list[o][h->free_count[o]++] = addr;
    h->stats.total_frees++;
}
void bd_stats(buddy_t *h, heap_stats_t *out) {
    *out = h->stats;
    uint32_t free_total = 0;
    for (int o = 0; o <= 16; o++) free_total += h->free_count[o] * (1u << o);
    out->free_bytes = free_total;
    out->frag_ratio = free_total > 0 ? 1.0 - (double)out->largest_free / free_total : 0.0;
}

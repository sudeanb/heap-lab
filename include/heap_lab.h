/* heap-lab allocator interface — three implementations over a fixed buffer */

#ifndef HEAP_LAB_H
#define HEAP_LAB_H

#include <stdint.h>
#include <stddef.h>
#include <string.h>

#define HEAP_SIZE (1024 * 1024)   /* 1 MiB pool per allocator */
#define MAX_ALLOCATIONS 4096

/* allocation record for the visualization */
typedef struct {
    uint32_t offset, size;
    int alive;                    /* 1 = in use, 0 = freed */
    uint32_t alloc_seq;           /* monotonic allocation id */
} alloc_record_t;

/* common stats reported by all allocators */
typedef struct {
    uint32_t total_allocs, total_frees;
    uint32_t current_bytes, peak_bytes;
    uint32_t internal_frag;       /* overhead bytes inside allocations */
    uint32_t free_chunks;         /* number of free regions */
    uint32_t largest_free;        /* largest contiguous free block */
    uint32_t free_bytes;
    double   frag_ratio;          /* 1 - largest_free/total_free */
} heap_stats_t;

/* ---- allocator 1: implicit free-list (first-fit) ---- */

typedef struct {
    uint8_t pool[HEAP_SIZE];
    uint32_t pool_used;
    alloc_record_t allocs[MAX_ALLOCATIONS];
    int alloc_count;
    heap_stats_t stats;
} free_list_t;

void fl_init(free_list_t *h);
void *fl_alloc(free_list_t *h, size_t size);
void fl_free(free_list_t *h, void *ptr);
void fl_stats(free_list_t *h, heap_stats_t *out);

/* ---- allocator 2: buddy allocator ---- */

typedef struct {
    uint8_t pool[HEAP_SIZE];
    uint32_t free_list[17][MAX_ALLOCATIONS / 4];  /* per-order free lists */
    int free_count[17];
    alloc_record_t allocs[MAX_ALLOCATIONS];
    int alloc_count;
    heap_stats_t stats;
} buddy_t;

void bd_init(buddy_t *h);
void *bd_alloc(buddy_t *h, size_t size);
void bd_free(buddy_t *h, void *ptr);
void bd_stats(buddy_t *h, heap_stats_t *out);

/* ---- allocator 3: slab allocator ---- */

#define SLAB_OBJ_MAX 256
#define SLAB_SLOTS 64

typedef struct {
    uint8_t pool[HEAP_SIZE];
    uint32_t slab_bitmap[HEAP_SIZE / (SLAB_OBJ_MAX * 8) + 1];
    uint32_t obj_size;
    uint32_t used;
    alloc_record_t allocs[MAX_ALLOCATIONS];
    int alloc_count;
    heap_stats_t stats;
} slab_t;

void sl_init(slab_t *h, uint32_t obj_size);
void *sl_alloc(slab_t *h);
void sl_free(slab_t *h, void *ptr);
void sl_stats(slab_t *h, heap_stats_t *out);

#endif

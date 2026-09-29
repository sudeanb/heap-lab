# Heap Lab — Design

Three allocator strategies over a 1 MiB pool, all in C, zero dependencies.

## Free-list
First-fit with 4-byte alignment and adjacent coalescing on free.
Best for variable-size workloads; fragmentation grows with mixed sizes.

## Buddy
Power-of-2 splitting from order-16 (64 KiB) down to order-0 (1 byte).
Free coalesces with its buddy recursively. O(log n) alloc and free.
Low fragmentation; internal waste up to 50% for non-power-of-2 sizes.

## Slab
Fixed-size objects from pre-carved pools. Zero external fragmentation;
internal waste = obj_size mod 8. Best for hot-path same-size allocations.

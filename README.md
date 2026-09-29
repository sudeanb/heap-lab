# ⊚ Heap Lab

**Three memory allocator implementations (free-list, buddy, slab) with
fragmentation analysis, trace-based simulation and a live memory map
visualizer — in C, zero dependencies.**

[![CI](https://github.com/sudeanb/heap-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/sudeanb/heap-lab/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Playground](https://github.com/sudeanb/heap-lab/actions/workflows/deploy.yml/badge.svg)](https://github.com/sudeanb/heap-lab/actions/workflows/deploy.yml)

Three classic allocation strategies, implemented from scratch, benchmarked
against each other on synthetic traces, and visualized side by side.

| Allocator | Strategy | Best for |
|---|---|---|
| **free-list** | first-fit, coalescing | general-purpose, variable sizes |
| **buddy** | power-of-2 split/merge | fast alloc/free, bounded fragmentation |
| **slab** | fixed-size object pools | high-frequency same-size allocations |

## Quick start

```bash
git clone https://github.com/sudeanb/heap-lab.git
cd heap-lab
make host-test    # unit tests
make bench        # allocator comparison
```

## Playground

The same three algorithms, ported to JavaScript for the browser, race on
identical seeded traces: three live memory maps, fragmentation metrics
and an in-browser benchmark.

**[Try it live](https://sudeanb.github.io/heap-lab/)** — or open
`playground/index.html` straight from a clone.

The authoritative implementations remain the C versions in `kernel/`
(these are what CI tests); the ports under `playground/js/` exist so the
visualization needs no toolchain. They include the 2026-09-29 accounting
fixes shared with the C code: the buddy allocator seeds one free block
spanning the *whole* pool (the original seed covered only the first
64 KiB), frees decrement `current_bytes`, and `bd_stats` derives the
largest free block from the order lists.

## License

[MIT](LICENSE)

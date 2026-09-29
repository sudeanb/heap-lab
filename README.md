# ⊚ Heap Lab

**Three memory allocator implementations (free-list, buddy, slab) with
fragmentation analysis, trace-based simulation and a live memory map
visualizer — in C, zero dependencies.**

[![CI](https://github.com/sudeanb/heap-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/sudeanb/heap-lab/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

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

## License

[MIT](LICENSE)

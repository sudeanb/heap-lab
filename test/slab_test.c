#include <assert.h>
#include <stdio.h>
#include "heap_lab.h"
int main(void) {
    slab_t sl; sl_init(&sl, 64);
    void *ptrs[10];
    for (int i = 0; i < 10; i++) { ptrs[i] = sl_alloc(&sl); assert(ptrs[i] != NULL); }
    assert((uint8_t *)ptrs[1] - (uint8_t *)ptrs[0] == 64);
    printf("slab OK\n");
    return 0;
}

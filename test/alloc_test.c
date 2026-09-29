#include <assert.h>
#include <stdio.h>
#include "heap_lab.h"
int main(void) {
    free_list_t fl; fl_init(&fl);
    void *a = fl_alloc(&fl, 100); assert(a != NULL);
    void *b = fl_alloc(&fl, 200); assert(b != NULL);
    assert((uint8_t *)b - (uint8_t *)a >= 100);
    fl_free(&fl, a);
    void *c = fl_alloc(&fl, 50); assert(c != NULL);
    assert((uint8_t *)c - (uint8_t *)a < 200); // reuse freed space
    printf("free-list OK\n");

    buddy_t bd; bd_init(&bd);
    void *x = bd_alloc(&bd, 64); assert(x != NULL);
    void *y = bd_alloc(&bd, 128); assert(y != NULL);
    void *z = bd_alloc(&bd, 256); assert(z != NULL);
    bd_free(&bd, x); bd_free(&bd, y);
    void *w = bd_alloc(&bd, 192); assert(w != NULL); // buddy coalesce
    printf("buddy OK\n");
    printf("all alloc tests passed\n");
    return 0;
}
/* slab tests — separate binary since slab has a different init */

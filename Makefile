CC = cc
CFLAGS = -O2 -Wall -Wextra -Iinclude

all: test/alloc_test

test/alloc_test: test/alloc_test.c kernel/free_list.c kernel/buddy.c include/heap_lab.h
	$(CC) $(CFLAGS) -o $@ test/alloc_test.c kernel/free_list.c kernel/buddy.c

test: test/alloc_test
	./test/alloc_test

clean:
	rm -f test/alloc_test

.PHONY: all test clean

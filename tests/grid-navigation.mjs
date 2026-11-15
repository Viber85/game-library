import assert from "node:assert/strict";
import test from "node:test";
import { getGridColumnCount, gridNeighbor } from "../src/gridNavigation.ts";

test("left/right never escape the grid or wrap to another row", () => {
  assert.equal(gridNeighbor(0, 72, 6, "left"), 0);
  assert.equal(gridNeighbor(6, 72, 6, "left"), 6);
  assert.equal(gridNeighbor(12, 72, 6, "left"), 12);
  assert.equal(gridNeighbor(7, 72, 6, "left"), 6);
  assert.equal(gridNeighbor(5, 72, 6, "right"), 5);
  assert.equal(gridNeighbor(11, 72, 6, "right"), 11);
  assert.equal(gridNeighbor(3, 72, 6, "right"), 4);
  assert.equal(gridNeighbor(71, 72, 6, "right"), 71);
});

test("up/down step exactly one rendered row, at 4/5/6 columns", () => {
  for (const cols of [4, 5, 6]) {
    const total = 80;
    for (let i = 0; i < total - cols; i++) {
      assert.equal(gridNeighbor(i, total, cols, "down"), i + cols);
      assert.equal(gridNeighbor(i + cols, total, cols, "up"), i);
    }
    for (let i = 0; i < cols; i++) {
      assert.equal(gridNeighbor(i, total, cols, "up"), i);
    }
  }
});

test("final incomplete row clamps to last existing item; never wraps", () => {
  // 6 columns and 14 games: row 3 has only 2 cards.
  assert.equal(gridNeighbor(7, 14, 6, "down"), 13);
  assert.equal(gridNeighbor(8, 14, 6, "down"), 13);
  assert.equal(gridNeighbor(12, 14, 6, "down"), 12);
  assert.equal(gridNeighbor(13, 14, 6, "down"), 13);
  assert.equal(gridNeighbor(13, 14, 6, "right"), 13);
  assert.equal(gridNeighbor(13, 14, 6, "up"), 7);
});

test("real DOM row measurement overrides guessed viewport width", () => {
  const fake = {
    children: [
      ...Array.from({length:5}, () => ({offsetTop:80})),
      ...Array.from({length:5}, () => ({offsetTop:292})),
    ],
  };
  assert.equal(getGridColumnCount(fake, 6), 5);
});

test("CSS-computed grid columns are used before the second row exists", () => {
  const previousWindow=globalThis.window;
  try {
    globalThis.window={getComputedStyle:()=>({gridTemplateColumns:"190px 190px 190px 190px"})};
    assert.equal(getGridColumnCount({children:[{offsetTop:10}]},6),4);
  } finally {
    if(previousWindow===undefined)delete globalThis.window;
    else globalThis.window=previousWindow;
  }
});

test("invalid target indices cannot jump beyond the grid", () => {
  assert.equal(gridNeighbor(5, 6, 6, "down"), 5);
  assert.equal(gridNeighbor(0, 1, 6, "right"), 0);
  assert.equal(gridNeighbor(0, 0, 6, "left"), 0);
});

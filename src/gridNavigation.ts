/** Deterministic controller navigation within the full library grid.
 * D-pad movement NEVER escapes to the side rail or another Steam focus scope.
 */
export type GridDirection = "left" | "right" | "up" | "down";

/** Return the actual number of visually rendered columns, not window.innerWidth.
 * Steam embeds the Decky route in a container whose width can differ from
 * the screen width; CSS media queries can also change the column count.
 */
export function getGridColumnCount(grid: HTMLElement | null, fallback = 6): number {
  if (!grid) return fallback;
  // React renders one .gl-game per cell, and a CSS grid puts equal-row
  // children at the same offsetTop. This is more reliable than guessing
  // breakpoints from window.innerWidth.
  const cards = Array.from(grid.children) as HTMLElement[];
  if (cards.length > 1) {
    const firstRow = cards[0].offsetTop;
    let columns = 0;
    for (const card of cards) {
      if (card.offsetTop !== firstRow) break;
      columns++;
    }
    if (columns >= 2 && columns < cards.length) return columns;
  }
  // Covers the first row while cards are loading and unusual Steam scaling.
  const template = window.getComputedStyle(grid).gridTemplateColumns.trim();
  const resolved = template === "none" ? 0 : template.split(/\s+/).length;
  return resolved > 0 ? resolved : fallback;
}

/** A bounded neighbor map: no wrapping, no rail escape, no dropped focus.
 * In the final incomplete row, Down may land on its last available card.
 */
export function gridNeighbor(
  index: number,
  total: number,
  columns: number,
  direction: GridDirection,
): number {
  if (!Number.isInteger(index) || !Number.isInteger(total) ||
      !Number.isInteger(columns) || total <= 0 || columns <= 0 ||
      index < 0 || index >= total) return Math.max(0, Math.min(total - 1, index));
  const column = index % columns;
  switch (direction) {
    case "left":
      return column === 0 ? index : index - 1;
    case "right":
      return column === columns - 1 || index === total - 1 ? index : index + 1;
    case "up":
      return index < columns ? index : index - columns;
    case "down": {
      // Don't jump upwards or wrap to row 1 at the bottom.
      const bottomRow = Math.floor((total - 1) / columns);
      const row = Math.floor(index / columns);
      if (row >= bottomRow) return index;
      return Math.min(index + columns, total - 1);
    }
  }
}

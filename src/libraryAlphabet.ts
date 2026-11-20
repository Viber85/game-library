/** Display-only alphabet grouping for A–Z and Z–A Library grids.
 * No sort mutation, keyboard events, or native Steam collection changes.
 */
export const LIBRARY_LETTERS=[
  "#",..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"
] as const;

/** Croatian diacritics are folded for the Latin A–Z UI; punctuation/digits
 * are grouped under #. The underlying Steam title and sort stay untouched.
 */
export function letterForTitle(title:string):string{
  const start=title.trim().replace(/^[\s]+/,"").normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[Đđ]/g,"D")
    .charAt(0).toUpperCase();
  return /^[A-Z]$/.test(start)?start:"#";
}

export function alphabetLetters(descending:boolean):readonly string[]{
  return descending?[...LIBRARY_LETTERS].reverse():LIBRARY_LETTERS;
}

export function alphabetIndicatorEnabled(
  mode:string,sort:string,viewAll:boolean
):boolean{
  return mode==="library"&&viewAll&&
    (sort==="alphabetical"||sort==="alphabetical-desc");
}

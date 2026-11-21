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

/** First game for each letter across the ENTIRE sorted library, not just the
 * mounted 60-card grid. Preserves the underlying sort order within a letter.
 */
export function firstGameByLetter(games:readonly {title:string}[]):ReadonlyMap<string,number>{
  const targets=new Map<string,number>();
  games.forEach((game,index)=>{
    const letter=letterForTitle(game.title);
    if(!targets.has(letter))targets.set(letter,index);
  });
  return targets;
}

/** Skip empty letters, keep the direction of A-Z / Z-A sort and do not wrap
 * unexpectedly at the alphabet endpoints.
 */
export function nextPopulatedLetter(
  current:string,direction:-1|1,order:readonly string[],
  targets:ReadonlyMap<string,number>
):string{
  const position=order.indexOf(current);
  if(position<0)return current;
  for(let i=position+direction;i>=0&&i<order.length;i+=direction){
    if(targets.has(order[i]))return order[i];
  }
  return current;
}

/** D-pad right enters the alphabet rail only from a row's final poster.
 * A partially filled final row uses its actual last poster.
 */
export function isRightEdgeGame(index:number,total:number,columns:number):boolean{
  return Number.isInteger(index)&&Number.isInteger(total)&&
    Number.isInteger(columns)&&columns>0&&
    index>=0&&index<total&&
    (index%columns===columns-1||index===total-1);
}

/** Resolve the visible rail letter from a pointer Y coordinate. Padding is
 * excluded so that tiny touch rails remain aligned with the glyph rows.
 * Works for regular and reverse alphabet order; coordinates are clamped.
 */
export function letterAtRailPosition(
  clientY:number,top:number,height:number,
  order:readonly string[],paddingTop=0,paddingBottom=0
):string|null{
  if(!order.length||!Number.isFinite(clientY)||!Number.isFinite(top)||
    !Number.isFinite(height)||height<=0)return null;
  const contentHeight=Math.max(1,height-Math.max(0,paddingTop)-Math.max(0,paddingBottom));
  const relative=(clientY-top-Math.max(0,paddingTop))/contentHeight;
  const index=Math.min(order.length-1,Math.max(0,Math.floor(relative*order.length)));
  return order[index]??null;
}

/** Fingers may land over an unavailable letter on a small handheld screen.
 * Snap to the closest populated letter in the current visual alphabet order.
 * If distance ties, prefer the next letter in the current sort direction.
 */
export function nearestPopulatedLetter(
  letter:string,order:readonly string[],targets:ReadonlyMap<string,number>
):string|null{
  const index=order.indexOf(letter);
  if(index<0||targets.size===0)return null;
  if(targets.has(letter))return letter;
  for(let distance=1;distance<order.length;distance++){
    if(index+distance<order.length&&targets.has(order[index+distance]))
      return order[index+distance];
    if(index-distance>=0&&targets.has(order[index-distance]))
      return order[index-distance];
  }
  return null;
}

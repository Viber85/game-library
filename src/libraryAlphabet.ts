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

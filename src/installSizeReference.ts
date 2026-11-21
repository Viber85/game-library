/** Confirm that a separately supplied Steam AppID describes the same
 * title as a non-Steam shortcut. Steam's requirement is a comparison only,
 * never an Epic/GOG installed/download size.
 * Deliberately strict: editions and bundles can need different storage.
 */
export function normalizedStoreGameTitle(title:string):string {
  return title.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLocaleLowerCase("en-US")
    .replace(/[™®©]/g,"")
    .replace(/[^\p{L}\p{N}]+/gu," ")
    .trim().replace(/\s+/g," ");
}
export function sameStoreGameTitle(a:string,b:unknown):boolean {
  if(typeof b!=="string"||!b.trim()||b.length>200)return false;
  const aNorm=normalizedStoreGameTitle(a),bNorm=normalizedStoreGameTitle(b);
  return aNorm.length>=3&&aNorm===bNorm;
}

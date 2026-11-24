/** Accept only a directly resolved GOG catalog product page.
 * ProductID and human title are never used to fabricate a Store slug.
 */
export function validGogStoreUrl(url:string):boolean{
  return /^https:\/\/www\.gog\.com\/en\/game\/[a-z0-9][a-z0-9_-]{0,199}$/.test(url);
}

/** Session-only location for returning from native Steam Game Details.
 * Collections are not persisted here; future manual-collection storage is
 * separate. Selecting the rail entry always resets to the four-card hub.
 */
export type CollectionSection="home"|"continue"|"backlog"|"completed"|"my";
export type CollectionLocation={
  section:CollectionSection;
  tabId:string|null;
  gameId:number|null;
};
const defaultLocation:CollectionLocation={section:"home",tabId:null,gameId:null};
let current:CollectionLocation={...defaultLocation};
export function readCollectionLocation():CollectionLocation{return {...current};}
export function saveCollectionLocation(value:CollectionLocation):void{
  current={section:value.section,tabId:value.tabId,gameId:value.gameId};
}
export function resetCollectionLocation():void{current={...defaultLocation};}

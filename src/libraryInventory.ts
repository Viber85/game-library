/**
 * Read Steam's observable library collections without assuming one property
 * (allApps / visibleApps / apps) is the only hydrated source. Real Game Mode
 * versions may leave allApps empty while visibleApps and apps are populated.
 *
 * Never reach into other Decky plugins or guess an app's storefront.
 */
type AnyRecord=Record<string,any>;
const asObject=(value:unknown):AnyRecord|null=>
  value!==null && typeof value==="object" ? value as AnyRecord : null;

function normalizeID(value:unknown):number|null {
  const number=typeof value==="number" ? value :
    (typeof value==="string" && /^-?\d{1,13}$/.test(value) ? Number(value):NaN);
  if(!Number.isInteger(number) || number===0 || number< -0x80000000 ||
     number>0xffffffff)return null;
  return number>>>0;
}

export function nativeAppId(row:unknown):number|null {
  const item=asObject(row);
  return normalizeID(item?.appid??item?.app_id??item?.id??row);
}

/** Steam collections may use arrays, sets, maps, observable objects or ID sets. */
export function nativeRows(value:unknown):unknown[]{
  if(Array.isArray(value))return [...value];
  if(value instanceof Set)return [...value.values()];
  if(value instanceof Map)return [...value.entries()].map(([key,item])=>
    (item===true||item===null||item===undefined) && normalizeID(key)!==null
      ?key:item);
  const obj=asObject(value);
  if(!obj || typeof obj.then==="function")return [];
  // Use iteration before treating an observable collection as plain object.
  try{
    if(typeof obj[Symbol.iterator]==="function")return Array.from(obj as Iterable<unknown>);
  }catch{/* Ignore a briefly detached observable. */}
  return Object.entries(obj).map(([key,item])=>
    (item===true||item===null||item===undefined) && normalizeID(key)!==null
      ?key:item);
}

function uniqueRows(rows:unknown[]):unknown[]{
  const seen=new Set<number>();
  const unique:unknown[]=[];
  for(const row of rows){
    const id=nativeAppId(row);
    if(id===null || seen.has(id))continue;
    seen.add(id);unique.push(row);
  }
  return unique;
}

/** A single collection can contain a partial allApps, a complete visibleApps,
 * and a Set of IDs. Union them; ?? would silently discard all later sources. */
export function nativeCollectionRows(collection:unknown):unknown[]{
  const entry=asObject(collection);
  if(!entry)return [];
  const result:unknown[]=[];
  for(const key of ["allApps","visibleApps","apps"]){
    try{result.push(...nativeRows(entry[key]));}catch{/* lazy getter not ready */}
  }
  return uniqueRows(result);
}

export const NATIVE_LIBRARY_COLLECTIONS=[
  "type-games","type-nonsteam","desk-desktop-apps","favorite",
  "local-install","AllGames","all","all-games"
] as const;

/** Merge ALL sources: a partially populated native collection must never
 * hide the remaining appStore entries (including uninstalled games). */
export function nativeLibraryRows(collectionStore:unknown,appStore:unknown):unknown[]{
  const cs=asObject(collectionStore),store=asObject(appStore);
  const rows:unknown[]=[];
  for(const id of NATIVE_LIBRARY_COLLECTIONS){
    try{rows.push(...nativeCollectionRows(cs?.GetCollection?.(id)));}
    catch{/* One unavailable Steam collection must not hide the library. */}
  }
  try{
    const collections=nativeRows(cs?.userCollections);
    for(const collection of collections){
      if(String(asObject(collection)?.displayName??"").startsWith("[Unifideck] "))
        rows.push(...nativeCollectionRows(collection));
    }
  }catch{/* Steam collections might still be hydrating. */}
  if(store){
    try{rows.push(...nativeRows(store.GetAllApps?.()));}
    catch{/* continue with direct observable stores */}
    for(const key of ["m_rgApps","m_rgAllApps","m_mapApps","m_mapAppOverview"]){
      try{rows.push(...nativeRows(store[key]));}
      catch{/* partial/missing Steam cache */}
    }
  }
  return uniqueRows(rows);
}

/** Never treat a BIsInstalled function object as the boolean true. */
export function nativeBooleanFlag(item:unknown,keys:readonly string[]):boolean|undefined{
  const obj=asObject(item);
  if(!obj)return undefined;
  for(const key of keys){
    try{
      const value=obj[key];
      if(typeof value==="boolean")return value;
      if(value===0||value===1)return Boolean(value);
      if(typeof value==="function"){
        const called=value.call(obj);
        if(typeof called==="boolean")return called;
        if(called===0||called===1)return Boolean(called);
      }
    }catch{/* Not hydrated or getter not callable yet. */}
  }
  return undefined;
}

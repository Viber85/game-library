import {expandThemeClassAliases,type AliasRegistry} from "./themeClassAliases";

/**
 * Cache an alias-expanded stylesheet only while its exact source and all
 * referenced Steam CSS class aliases are unchanged.
 *
 * Extract keys once per CSS source. On each 6.5s Steam check compare *live*
 * class values, so lazy-loaded Settings/Game Details modules invalidate the
 * cache immediately. This is not a timer-based or persistent Steam DOM cache.
 */
type AliasReference={prefix:string;key:string;semantic:string};
type CacheEntry={
  refs:AliasReference[];
  signature:string|null;
  compiled:string;
};
const ALIAS_PATTERN=/\[class\*="([a-z][a-z0-9]*)_([A-Za-z0-9_]+)"\]/g;
const MAX_SOURCES=4;

function referencesFor(css:string):AliasReference[]{
  const found=new Map<string,AliasReference>();
  for(const match of css.matchAll(ALIAS_PATTERN)){
    const prefix=match[1],key=match[2];
    const identity=prefix+"|"+key;
    if(!found.has(identity))
      found.set(identity,{
        prefix,key,semantic:key.endsWith("_")?key.slice(0,-1):key,
      });
  }
  return [...found.values()];
}

function aliasSignature(refs:readonly AliasReference[],modules:AliasRegistry):string{
  // The same exact key/fallback resolution as expandThemeClassAliases().
  // A late-loaded module or an updated class hash must cause a recompile.
  return JSON.stringify(refs.map(({prefix,key,semantic})=>
    modules[prefix]?.[key]??modules[prefix]?.[semantic]??null));
}

export function createThemeAliasCache(
  expand:(css:string,modules:AliasRegistry)=>string=expandThemeClassAliases,
){
  const sources=new Map<string,CacheEntry>();
  return (css:string,modules:AliasRegistry):string=>{
    let cached=sources.get(css);
    if(!cached){
      if(sources.size>=MAX_SOURCES)sources.clear();
      cached={refs:referencesFor(css),signature:null,compiled:""};
      sources.set(css,cached);
    }
    const signature=aliasSignature(cached.refs,modules);
    if(cached.signature!==signature){
      cached.compiled=expand(css,modules);
      cached.signature=signature;
    }
    return cached.compiled;
  };
}

/** Structural equality avoids notifying Decky on an unchanged CSS cycle. */
export type ThemeStatusFields={
  selected:"midnight"|"off";
  appliedTabs:number;
  hasMain:boolean;
  hasMenu:boolean;
  hasQAM:boolean;
  issue:string;
};
export function sameThemeRuntimeStatus(a:ThemeStatusFields,b:ThemeStatusFields):boolean{
  return a===b || (a.selected===b.selected &&
    a.appliedTabs===b.appliedTabs &&
    a.hasMain===b.hasMain &&
    a.hasMenu===b.hasMenu &&
    a.hasQAM===b.hasQAM &&
    a.issue===b.issue);
}

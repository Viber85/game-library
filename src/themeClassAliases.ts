/**
 * Steam's CSS module classes may be minified (e.g. "_33vqr13-...")
 * instead of the stable readable "gamepadpagedsettings_PagedSettingsDialog_*".
 * Keep both forms in a single selector, without changing scope, geometry or
 * Steam focus behavior.
 */
export type AliasRegistry = Record<string,Record<string,string>>;

export function expandThemeClassAliases(css:string,modules:AliasRegistry):string {
  return css.replace(
    /\[class\*="([a-z][a-z0-9]*)_([A-Za-z0-9_]+)"\]/g,
    (original:string,prefix:string,key:string) => {
      // Steam readable CSS classes usually end with an extra underscore
      // before their generated hash (e.g. quickaccessmenu_Tab_1S76C).
      // Our scoped [class*="quickaccessmenu_Tab_"] needs the trailing
      // underscore to avoid matching TabContentColumn or TabHeader, while
      // webpack's module registry uses the semantic key "Tab".
      const semanticKey=key.endsWith("_")?key.slice(0,-1):key;
      const actual=modules[prefix]?.[key]??modules[prefix]?.[semanticKey];
      if(typeof actual!=="string" || actual.length<3 || actual.length>150 ||
         !/^[A-Za-z0-9_-]+$/.test(actual) ||
         actual===prefix+"_"+key)return original;
      // [class~=] compares a full class token and avoids CSS.escape issues
      // for minified Steam classes starting with underscores/digits.
      return `:is(${original},[class~="${actual}"])`;
    },
  );
}

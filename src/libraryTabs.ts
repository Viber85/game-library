import type {LibraryGame} from "./steam";

/** Game Library's native tab definitions; independent of other Decky plugins. */
export type TabKind="all"|"installed"|"steam"|"nonsteam"|"gog"|"favorites"|"custom";
export type TabFilter="all"|"installed"|"not-installed"|"steam"|"nonsteam"|"gog"|"favorites";
export type TabMode="smart"|"manual";
export type SmartRuleType=Exclude<TabFilter,"all"|"gog">|"not-favorites"|"played";
export type SmartJoin="all"|"any";
export type SmartRule={type:SmartRuleType};
export type LibraryTab={
  id:string;title:string;position:number;visible:boolean;
  kind:TabKind;filter:TabFilter;
  mode?:TabMode;members?:number[];
  rules?:SmartRule[];ruleJoin?:SmartJoin;
  forceInclude?:number[];forceExclude?:number[];
};
export const DEFAULT_LIBRARY_TABS:LibraryTab[]=[
  {id:"AllGames",title:"All Games",position:0,visible:true,kind:"all",filter:"all"},
  {id:"Installed",title:"Installed",position:1,visible:true,kind:"installed",filter:"installed"},
  {id:"Steam",title:"Steam",position:2,visible:true,kind:"steam",filter:"steam"},
  {id:"NonSteam",title:"Non-Steam",position:3,visible:true,kind:"nonsteam",filter:"nonsteam"},
  {id:"GOG",title:"GOG",position:4,visible:true,kind:"gog",filter:"gog"},
  {id:"Favorites",title:"Favorites",position:5,visible:true,kind:"favorites",filter:"favorites"},
];
export const OWN_FILTERS:{id:TabFilter;title:string}[]=[
  {id:"all",title:"All games"},
  {id:"installed",title:"Installed"},
  {id:"not-installed",title:"Not installed"},
  {id:"steam",title:"Steam"},
  {id:"nonsteam",title:"Non-Steam"},
  {id:"favorites",title:"Favorites"},
];
export const SMART_RULES:{id:SmartRuleType;title:string}[]=[
  {id:"installed",title:"Installed"},
  {id:"not-installed",title:"Not installed"},
  {id:"steam",title:"Steam games"},
  {id:"nonsteam",title:"Non-Steam games"},
  {id:"favorites",title:"Favorites"},
  {id:"not-favorites",title:"Not favorited"},
  {id:"played",title:"Played before"},
];
export function normalizeLibraryTabs(tabs:readonly LibraryTab[]):LibraryTab[]{
  return [...tabs].sort((a,b)=>a.position-b.position||a.title.localeCompare(b.title))
    .map((tab,i)=>({...tab,position:i}));
}
export function visibleLibraryTabs(tabs:readonly LibraryTab[]):LibraryTab[]{
  return normalizeLibraryTabs(tabs).filter(t=>t.visible);
}
/** Upgrade old per-account tabs in place, preserving all existing user
 * positions/visibility. GOG is now a persisted built-in just like Steam. */
export function withGogBuiltin(tabs:readonly LibraryTab[]):LibraryTab[]{
  if(tabs.some(tab=>tab.id==="GOG"))return normalizeLibraryTabs(tabs);
  return normalizeLibraryTabs([...tabs,{
    id:"GOG",title:"GOG",position:tabs.length,visible:true,
    kind:"gog",filter:"gog",mode:"smart",
  }]);
}
/** A legacy 0.6.0/0.6.1 single filter becomes one Smart rule on read. */
export function smartRulesForTab(tab:LibraryTab):SmartRule[]{
  if(tab.rules!==undefined)return tab.rules;
  return tab.filter==="all"||tab.filter==="gog"?[]:[{type:tab.filter}];
}
export function matchesSmartRule(game:LibraryGame,rule:SmartRule):boolean{
  switch(rule.type){
    case "installed":return game.installed;
    case "not-installed":return !game.installed;
    case "steam":return !game.nonSteam;
    case "nonsteam":return game.nonSteam;
    case "favorites":return game.favorite;
    case "not-favorites":return !game.favorite;
    // Only positive Steam history is reliable for all Steam/non-Steam IDs.
    case "played":return game.lastPlayed>0||game.playtimeMinutes>0;
  }
}
export function gamesForLibraryTab(tab:LibraryTab,games:readonly LibraryGame[]):{
  supported:boolean;games:LibraryGame[];reason?:string
}{
  if(tab.kind==="custom"&&tab.mode==="manual"){
    const ids=new Set(tab.members??[]);
    return {supported:true,games:games.filter(game=>ids.has(game.id))};
  }
  if(tab.kind==="custom"){
    const rules=smartRulesForTab(tab);
    const include=new Set(tab.forceInclude??[]);
    const exclude=new Set(tab.forceExclude??[]);
    const join=tab.ruleJoin==="any"?"any":"all";
    return {supported:true,games:games.filter(game=>{
      if(exclude.has(game.id))return false;
      if(include.has(game.id))return true;
      if(!rules.length)return true;
      return join==="all"?
        rules.every(rule=>matchesSmartRule(game,rule)):
        rules.some(rule=>matchesSmartRule(game,rule));
    })};
  }
  const filter=tab.kind==="all"?"all":tab.kind;
  return {supported:true,games:games.filter(game=>{
    switch(filter){
      case "installed":return game.installed;
      case "steam":return !game.nonSteam;
      case "nonsteam":return game.nonSteam;
      case "gog":return false; // GOG supplied by the Dashboard provider adapter.
      case "favorites":return game.favorite;
      default:return true;
    }
  })};
}
export function createLibraryTabResolver(){
  return (tab:LibraryTab,games:LibraryGame[])=>gamesForLibraryTab(tab,games);
}
export function moveLibraryTab(tabs:readonly LibraryTab[],id:string,offset:number):LibraryTab[]{
  const ordered=normalizeLibraryTabs(tabs);
  const index=ordered.findIndex(tab=>tab.id===id);
  const target=index+offset;
  if(index<0||target<0||target>=ordered.length)return ordered;
  const [moving]=ordered.splice(index,1);
  ordered.splice(target,0,moving);
  return ordered.map((tab,i)=>({...tab,position:i}));
}
export function changeLibraryTab(tabs:readonly LibraryTab[],id:string,
  patch:Partial<Pick<LibraryTab,"title"|"visible"|"filter"|"mode"|"members"|
    "rules"|"ruleJoin"|"forceInclude"|"forceExclude">>):LibraryTab[]{
  return tabs.map(tab=>tab.id===id?{...tab,...patch}:tab);
}
export function newLibraryTab(tabs:readonly LibraryTab[],title:string,
  filter:TabFilter,id:string,mode:TabMode="smart"):LibraryTab[]{
  return normalizeLibraryTabs([...tabs,{
    id,title:title.trim(),position:tabs.length,visible:true,kind:"custom" as const,
    filter,mode,members:[],
    rules:filter==="all"||filter==="gog"?[]:[{type:filter}],ruleJoin:"all" as const,
    forceInclude:[],forceExclude:[],
  }]);
}
/** Exact Steam app ID membership; IDs survive temporary library unavailability. */
export function assignManualGames(tabs:readonly LibraryTab[],id:string,
  members:readonly number[]):LibraryTab[]{
  const unique=[...new Set(members.filter(x=>Number.isSafeInteger(x)&&x>0))].sort((a,b)=>a-b);
  return tabs.map(tab=>tab.id===id&&tab.kind==="custom"&&tab.mode==="manual"
    ? {...tab,members:unique}:tab);
}
/** Force a game into / out of a Smart tab without altering its normal rules. */
export function assignSmartExceptions(tabs:readonly LibraryTab[],id:string,
  target:"include"|"exclude",members:readonly number[]):LibraryTab[]{
  const unique=[...new Set(members.filter(x=>Number.isSafeInteger(x)&&x>0))].sort((a,b)=>a-b);
  const selected=new Set(unique);
  return tabs.map(tab=>{
    if(tab.id!==id||tab.kind!=="custom"||tab.mode==="manual")return tab;
    return target==="include"?
      {...tab,forceInclude:unique,
        forceExclude:(tab.forceExclude??[]).filter(x=>!selected.has(x))}:
      {...tab,forceExclude:unique,
        forceInclude:(tab.forceInclude??[]).filter(x=>!selected.has(x))};
  });
}

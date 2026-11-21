import type {LibraryGame} from "./steam";

/** Original Game Library tab model with self-owned filters and storage. */
export type TabKind="all"|"installed"|"steam"|"nonsteam"|"favorites"|"custom";
export type TabFilter="all"|"installed"|"not-installed"|"steam"|"nonsteam"|"favorites";
export type LibraryTab={
  id:string;title:string;position:number;visible:boolean;
  kind:TabKind;filter:TabFilter;
};
export const DEFAULT_LIBRARY_TABS:LibraryTab[]=[
  {id:"AllGames",title:"All Games",position:0,visible:true,kind:"all",filter:"all"},
  {id:"Installed",title:"Installed",position:1,visible:true,kind:"installed",filter:"installed"},
  {id:"Steam",title:"Steam",position:2,visible:true,kind:"steam",filter:"steam"},
  {id:"NonSteam",title:"Non-Steam",position:3,visible:true,kind:"nonsteam",filter:"nonsteam"},
  {id:"Favorites",title:"Favorites",position:4,visible:true,kind:"favorites",filter:"favorites"},
];
export const OWN_FILTERS:{id:TabFilter;title:string}[]=[
  {id:"all",title:"All games"},
  {id:"installed",title:"Installed"},
  {id:"not-installed",title:"Not installed"},
  {id:"steam",title:"Steam"},
  {id:"nonsteam",title:"Non-Steam"},
  {id:"favorites",title:"Favorites"},
];

export function normalizeLibraryTabs(tabs:readonly LibraryTab[]):LibraryTab[]{
  return [...tabs].sort((a,b)=>a.position-b.position||a.title.localeCompare(b.title))
    .map((tab,i)=>({...tab,position:i}));
}
export function visibleLibraryTabs(tabs:readonly LibraryTab[]):LibraryTab[]{
  return normalizeLibraryTabs(tabs).filter(t=>t.visible);
}
export function gamesForLibraryTab(tab:LibraryTab,games:readonly LibraryGame[]):{
  supported:boolean;games:LibraryGame[];reason?:string
}{
  const filter=tab.kind==="custom"?tab.filter:tab.kind==="all"?"all":tab.kind;
  return {supported:true,games:games.filter(game=>{
    switch(filter){
      case "installed":return game.installed;
      case "not-installed":return !game.installed;
      case "steam":return !game.nonSteam;
      case "nonsteam":return game.nonSteam;
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
  patch:Partial<Pick<LibraryTab,"title"|"visible"|"filter">>):LibraryTab[]{
  return tabs.map(tab=>tab.id===id?{...tab,...patch}:tab);
}
export function newLibraryTab(tabs:readonly LibraryTab[],title:string,
  filter:TabFilter,id:string):LibraryTab[]{
  return normalizeLibraryTabs([...tabs,{
    id,title:title.trim(),position:tabs.length,visible:true,kind:"custom" as const,filter,
  }]);
}

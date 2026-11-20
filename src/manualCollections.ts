import {callable} from "@decky/api";
import type {LibraryGame} from "./steam";

export type ManualSection="backlog"|"completed";
export type ManualCollections=Record<ManualSection,number[]>;
type ManualResponse={
  ok:boolean;
  collections?:ManualCollections;
  reason?:string;
};
export const emptyManualCollections=():ManualCollections=>({backlog:[],completed:[]});

const fetchManual=callable<[],ManualResponse>("get_manual_collections");
const setManual=callable<[ManualSection,number,boolean],ManualResponse>(
  "set_manual_collection");

export function manualGames(
  games:readonly LibraryGame[],state:ManualCollections,section:ManualSection,
):LibraryGame[]{
  const ids=new Set(state[section]);
  return games.filter(game=>ids.has(game.id))
    .sort((a,b)=>a.title.localeCompare(b.title));
}

export async function loadManualCollections():Promise<ManualResponse>{
  return fetchManual();
}
export async function changeManualCollection(
  section:ManualSection,appid:number,included:boolean,
):Promise<ManualResponse>{
  return setManual(section,appid,included);
}

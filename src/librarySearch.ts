import type {LibraryGame} from "./steam";

/** Search stays inside the local Steam library. No network provider is queried. */
export type SearchSource="all"|"steam"|"epic"|"gog"|"other";
export type SearchInstall="all"|"installed"|"not-installed";
export type SearchMembership={
  epic:ReadonlySet<number>|null;
  gog:ReadonlySet<number>|null;
};

export function gameSearchSource(game:LibraryGame,member:SearchMembership):
  Exclude<SearchSource,"all"> {
  // Exact native Unifideck collection membership is authoritative; do not
  // guess a store by looking at shortcut names or launch paths.
  if(member.epic?.has(game.id))return "epic";
  if(member.gog?.has(game.id))return "gog";
  return game.nonSteam?"other":"steam";
}

export function normalizeSearchText(value:string):string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLocaleLowerCase().trim().replace(/\s+/g," ");
}

/** All query words may appear anywhere in the title; results rank exact,
 * prefix, word-boundary, then substring hits and sort by name within ties.
 */
export function searchLibraryGames(
  games:readonly LibraryGame[],query:string,
  source:SearchSource,installed:SearchInstall,membership:SearchMembership,
):LibraryGame[]{
  const normalized=normalizeSearchText(query);
  if(!normalized)return [];
  const words=normalized.split(" ");
  return games.filter(game=>{
    if(source!=="all"&&gameSearchSource(game,membership)!==source)return false;
    if(installed==="installed"&&!game.installed)return false;
    if(installed==="not-installed"&&game.installed)return false;
    const title=normalizeSearchText(game.title);
    return words.every(word=>title.includes(word));
  }).sort((a,b)=>{
    const rank=(title:string)=>{
      const normalizedTitle=normalizeSearchText(title);
      if(normalizedTitle===normalized)return 0;
      if(normalizedTitle.startsWith(normalized))return 1;
      if(normalizedTitle.includes(" "+normalized))return 2;
      return 3;
    };
    return rank(a.title)-rank(b.title)||a.title.localeCompare(b.title);
  });
}

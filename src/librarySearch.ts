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

/** Search matches the BEGINNING of the game's full title, not letters
 * anywhere inside it. For example "h" matches "Hades" but not "The Hobbit".
 * Full prefixes such as "dark so" match "Dark Souls", ignoring case,
 * accents and repeated spaces. Existing source/install filters are applied
 * before results are returned. Keep an exact title first, then A-Z.
 */
export function searchLibraryGames(
  games:readonly LibraryGame[],query:string,
  source:SearchSource,installed:SearchInstall,membership:SearchMembership,
):LibraryGame[]{
  const normalized=normalizeSearchText(query);
  if(!normalized)return [];
  return games.filter(game=>{
    if(source!=="all"&&gameSearchSource(game,membership)!==source)return false;
    if(installed==="installed"&&!game.installed)return false;
    if(installed==="not-installed"&&game.installed)return false;
    return normalizeSearchText(game.title).startsWith(normalized);
  }).sort((a,b)=>{
    const aExact=normalizeSearchText(a.title)===normalized;
    const bExact=normalizeSearchText(b.title)===normalized;
    return Number(bExact)-Number(aExact)||a.title.localeCompare(b.title);
  });
}

/** Home sort defaults are per tab, not a single global switch.
 * Steam's Installed tab starts with the most recently played game; every
 * other tab preserves the established A-Z default. A user's manual sort
 * choice is retained while navigating among tabs in the current session.
 */
export type HomeSort = "recent" | "alphabetical";
export type HomeSortTab = { id: string; title: string };

export function defaultSortForTab(tab: HomeSortTab): HomeSort {
  const normalize = (value:string)=>value.trim().toLowerCase().replace(/[\\s_-]+/g,"");
  return normalize(tab.id)==="installed" || normalize(tab.title)==="installed"
    ? "recent" : "alphabetical";
}

export function sortForTab(tab: HomeSortTab, overrides:Record<string,HomeSort>):HomeSort {
  return overrides[tab.id] ?? defaultSortForTab(tab);
}

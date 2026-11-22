/** Rollback-only cleanup of retired native Steam Game Details experiment.
 * No installer or layout-changing code is shipped from this module.
 * Runs in Steam CEF, not the Decky iframe. Compatible with old observer keys.
 */
export const COMPACT_DETAILS_REMOVE_SCRIPT = String.raw`(() => {
  for(const key of [
    "__gameLibraryCompactDetails11",
    "__gameLibraryCompactDetails12",
    "__gameLibraryCompactDetails14",
  ]){
    const observer=window[key];
    try{if(observer&&typeof observer.stop==="function")observer.stop();}catch{}
    try{delete window[key];}catch{}
  }
  const root=document.documentElement;
  try{
    root.removeAttribute("data-glm-compact-details");
    root.removeAttribute("data-glm-compact-poster");
    root.style?.removeProperty("--glm-compact-poster-url");
  }catch{}
  // Older Decky ZIPs could have left attributes on actual Steam DOM nodes
  // even after their timer stopped. Remove those without deleting Steam
  // controls, game information, artwork or event handlers.
  const attrs=[
    "data-glm-native-compact-hero",
    "data-glm-native-compact-playbar",
    "data-glm-native-compact-playsection",
    "data-glm-native-compact-playbutton",
    "data-glm-native-compact-title",
    "data-glm-native-compact-sections",
    "data-glm-native-compact-surface",
    "data-glm-native-compact-painted",
  ];
  for(const attr of attrs){
    try{
      for(const node of document.querySelectorAll("["+attr+"]"))
        node.removeAttribute(attr);
    }catch{}
  }
  try{delete window.__gameLibraryNativeCompactHints14;}catch{}
  return true;
})()`;

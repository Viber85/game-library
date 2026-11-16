import { findClassModule } from "@decky/ui";
import { expandThemeClassAliases, type AliasRegistry } from "./themeClassAliases";

/**
 * Resolve the *currently installed Steam client's* webpack CSS modules,
 * so themed Settings and game pages also work when Steam emits minified
 * classes instead of readable gamepadpagedsettings_/appdetails* names.
 *
 * Each group is identified by distinctive semantic keys to avoid matching
 * another module that happens to export common keys such as "Title".
 * Modules absent on a given Steam build simply retain the original selectors.
 */
const MODULE_ANCHORS:Record<string,readonly string[]> = {
  gamepadpagedsettings:[
    "PagedSettingsDialog_PageListColumn",
    "PagedSettingsDialog_PageContent",
  ],
  gamepaddialog:["Field","FieldLabel","FieldDescription"],
  gamepaddropdown:["DropDownControlButton"],
  gamepadslider:["SliderTrackActive"],
  appdetails:["ScrollContainer","ShowPlayBar"],
  appdetailsoverview:["ColumnContainer","BackdropGlass"],
  appdetailsplaysection:["PlayBar","MenuButton"],
  appdetailssection:["AppDetailsSectionContainer","Highlight"],
  basicappdetailssectionstyler:["AppDetailsRoot","PlaySection"],
  appactionbutton:["ButtonChild","ButtonText"],
  appdetailscommunityfeed:["CommunityItem","HeaderStyles"],
  appdetailsactivitysection:["ActivityFeedContainer","NoActivity"],
  appactivityday:["EventBody","Event"],
  appdetailsprimarylinkssection:["LinksSection","LinkButton"],
  appdetailsgameinfopanel:["DeckVerifiedInfo","CompatBadge"],
  appdetailsachievementssection:["AchievementCarouselItem"],
  appdetailsdlcsection:["Item","Remainder"],
  spotlightgameplaysummary:["SummaryCarouselContainer","SummaryAchievement"],
  downloads:["DownloadsPage","SectionItem"],
  progressbar:["Percent","ProgressBar"],
  // New CSS modules are discovered only when the relevant page is open.
  // This permits theme overlays for Internet, Bluetooth and Notes that
  // Valve may load lazily after navigating to the category.
  networksettings:["NetworkListItem","NetworkItem","ConnectedNetwork"],
  wifisettings:["NetworkItem","NetworkRow"],
  connectionsettings:["NetworkEntry","ConnectedNetwork"],
  wirelesssettings:["NetworkItem","NetworkRow"],
  gamepadnetwork:["NetworkItem","NetworkList"],
  gamepadsettings:["SettingsRow","SettingsSection"],
  appdetailsmediasection:["MediaSection","MediaButton","ViewMedia"],
  appdetailsmedialibrary:["MediaLibraryButton","NoMedia","OpenMedia"],
  appdetailsnotessection:["NoteLink","NotesSection","NoteBody"],
};

function getSteamModules():AliasRegistry {
  const registry:AliasRegistry={};
  for (const [prefix,anchors] of Object.entries(MODULE_ANCHORS)) {
    try {
      const module=findClassModule((candidate:any)=>{
        if(!candidate || typeof candidate!=="object")return false;
        const found=anchors.filter(k=>typeof candidate[k]==="string");
        if(found.length>=2)return true;
        // Steam updates may remove one anchor from a module. A single
        // DISTINCTIVE class name is enough to identify the module; short,
        // generic keys like "Item", "Field" or "Button" are not.
        return found.some(k=>k.length>=13 && !/^(?:Field|Button|Item|Title|Label)$/.test(k));
      });
      if(module)registry[prefix]=module as Record<string,string>;
    }catch(error){
      // CSS is still useful in readable-class Steam releases.
      console.warn("[game-library] CSS class alias lookup unavailable:",prefix,error);
    }
  }
  return registry;
}

export function compileMidnightCss(css:string):string {
  return expandThemeClassAliases(css,getSteamModules());
}

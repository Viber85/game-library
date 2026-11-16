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
  appdetailsprimarylinkssection:["LinksSection"],
  appdetailsgameinfopanel:["DeckVerifiedInfo"],
  appdetailsachievementssection:["AchievementCarouselItem"],
  appdetailsdlcsection:["Item","Remainder"],
  spotlightgameplaysummary:["SummaryCarouselContainer","SummaryAchievement"],
  downloads:["DownloadsPage","SectionItem"],
  progressbar:["Percent","ProgressBar"],
};

function getSteamModules():AliasRegistry {
  const registry:AliasRegistry={};
  for (const [prefix,anchors] of Object.entries(MODULE_ANCHORS)) {
    try {
      const module=findClassModule((candidate:any)=>{
        if(!candidate || typeof candidate!=="object")return false;
        const count=anchors.filter(k=>typeof candidate[k]==="string").length;
        return count>=Math.min(2,anchors.length);
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

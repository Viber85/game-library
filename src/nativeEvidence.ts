import type {ThemeAuditSample,ThemeProbe} from "./themeProbe";

export type NativeEvidenceSource="live"|"before-qam"|"unverified";
export type NativeEvidence={
  probe:ThemeProbe;
  source:NativeEvidenceSource;
  ageSeconds:number;
};

/**
 * Pick ONE coherent original Steam Game Details measurement. Opening
 * Game Library/Decky can leave its native hero mounted while hiding HLTB and
 * changing the painted panels; mixing live QAM and old game samples is invalid.
 * No new probe or network request is performed here.
 */
export function selectNativeEvidence(
  live:ThemeProbe,
  prior:ThemeAuditSample|null,
  now:number
):NativeEvidence {
  const liveGame=!live.libraryUIVisible&&
    (live.nativeCompactHeroStyled||live.nativeCompactPlayBarStyled);
  if(liveGame)return {probe:live,source:"live",ageSeconds:0};

  if(prior&&prior.probe.libraryUIVisible===false&&
     prior.at>0&&prior.at<=now+2000&&now-prior.at<=180000&&
     (prior.probe.nativeCompactHeroStyled||prior.probe.nativeCompactPlayBarStyled)){
    return {
      probe:prior.probe,source:"before-qam",
      ageSeconds:Math.max(0,Math.round((now-prior.at)/1000))
    };
  }
  // A live Decky/overlay measurement must NOT be advertised as genuine
  // native-game paint; UI should display NOT VERIFIED until the user visits
  // the actual Steam game screen.
  return {probe:live,source:"unverified",ageSeconds:-1};
}

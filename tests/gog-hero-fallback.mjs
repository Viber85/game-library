import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";

const read=(file)=>readFileSync(new URL("../"+file,import.meta.url),"utf8");

test("GOG Details queries SGDB hero on missing/broken GOG background only",()=>{
  const details=read("src/SharedLibraryDetails.tsx");
  const dashboard=read("src/Dashboard.tsx");
  assert.match(details,/getGogSteamGridFallback/);
  assert.match(details,/subscribeArtworkSettingsChanged/);
  assert.match(details,/const nativeHero=/);
  assert.match(details,/nativeHero&&!nativeHeroFailed\?nativeHero/);
  assert.match(details,/!remoteHeroFailed\?remoteHero:null/);
  assert.match(details,/\(nativeHero&&!nativeHeroFailed\)\|\|remoteHero\|\|remoteHeroFailed/);
  assert.match(details,/getGogSteamGridFallback\(gogAccountId,\{/);
  assert.match(details,/id:game\.storeId,title:game\.title/);
  assert.match(details,/if\(hero===nativeHero\)setNativeHeroFailed\(true\)/);
  assert.match(details,/else if\(hero\)setRemoteHeroFailed\(true\)/);
  assert.match(details,/game\.store!=="gog"/);
  assert.match(dashboard,/gogAccountId=\{gogAccountId\}/);
});

test("GOG cover and hero share deduplicated backend, no browser API key",()=>{
  const art=read("src/GogArtwork.tsx");
  const backend=read("main.py");
  assert.match(art,/export function getGogSteamGridFallback/);
  assert.match(art,/const artworkRequests=new Map/);
  assert.match(art,/const artworkCache=new Map/);
  assert.match(art,/fetchFallback=callable<\[string,string,string\],ArtworkReply>\("gog_steamgriddb_art"\)/);
  assert.match(art,/getGogSteamGridFallback\(accountId,game\)/);
  assert.match(backend,/async def gog_steamgriddb_art\(self, account_id: str, product_id: str, title: str\):/);
  assert.match(backend,/game\.get\("title"\) == title/);
  assert.match(backend,/steamgriddb_enabled/);
  assert.match(backend,/provider\.read_key\(_steamgriddb_config_dir\(\)\)/);
  assert.doesNotMatch(art,/Authorization|Bearer |api\.steamgriddb\.com/);
  assert.doesNotMatch(detailsSource(),/Authorization|Bearer |api\.steamgriddb\.com/);
});

function detailsSource(){return read("src/SharedLibraryDetails.tsx");}

test("GOG hero fallback never calls Steam app or install APIs",()=>{
  const details=detailsSource();
  assert.doesNotMatch(details,/SteamClient|RunGame\(|OpenInstallWizard/);
  assert.match(details,/className="gl-details-hero"/);
  assert.match(details,/className="gl-details-hero-shade"/);
  assert.match(details,/gl-hero-card-fallback/);
  assert.match(details,/src=\{displayedHero\}/);
});

test("Card cover provides the exact successfully loaded image when GOG/SGDB hero is missing",()=>{
  const details=read("src/SharedLibraryDetails.tsx");
  const artwork=read("src/GogArtwork.tsx");
  const dashboard=read("src/Dashboard.tsx");
  const css=read("src/theme.ts");
  assert.match(artwork,/onImageLoaded\?:\(url:string\)=>void/);
  assert.match(artwork,/onLoad=\{\(\)=>onImageLoaded\?\.\(image\)\}/);
  assert.match(details,/const \[loadedCardImage,setLoadedCardImage\]=useState/);
  assert.match(details,/loadedCardImage\?\.gameKey===game\.key/);
  assert.match(details,/const displayedHero=hero\|\|cardHero/);
  assert.match(details,/setLoadedCardImage\(previous=>/);
  assert.match(details,/cover\(onCardImageLoaded\)/);
  assert.match(dashboard,/cover=\{onImageLoaded=><GogArtwork key=\{detailGog\.id\}/);
  assert.match(dashboard,/onImageLoaded=\{onImageLoaded\}/);
  assert.match(css,/\.gl-gog-steam-details \.gl-hero\.gl-hero-card-fallback/);
  assert.match(css,/object-fit:cover/);
  assert.match(css,/filter:blur\(5px\)/);
  // This fallback must not require an extra server request.
  assert.equal((details.match(/getGogSteamGridFallback\(gogAccountId/g)||[]).length,1);
});

test("Real hero stays higher priority than any loaded card cover",()=>{
  const details=read("src/SharedLibraryDetails.tsx");
  const start=details.indexOf('  const nativeHero=');
  const end=details.indexOf('  useEffect(()=>subscribeArtworkSettingsChanged',start);
  const logic=details.slice(start,end);
  assert.match(logic,/const hero=nativeHero&&!nativeHeroFailed\?nativeHero:/);
  assert.match(logic,/!remoteHeroFailed\?remoteHero:null/);
  assert.match(logic,/const displayedHero=hero\|\|cardHero/);
  assert.match(details,/if\(hero===nativeHero\)setNativeHeroFailed\(true\)/);
  assert.match(details,/else if\(hero\)setRemoteHeroFailed\(true\)/);
  assert.match(details,/else setLoadedCardImage\(null\)/);
});

import {useEffect,useMemo,useState} from "react";
import type {LibraryGame} from "./steam";
import {heroCandidates,heroFallbackCandidates,logoCandidates} from "./steam";
import {getMissingSteamArt,subscribeArtworkSettingsChanged} from "./steamGridArtwork";
import {requestSelectedGameDetails} from "./selectedGameDetails";

/** Tries each custom/local/store asset until one actually loads. */
export function HeroBackdrop({game}:{game:LibraryGame}) {
  const [imageIndex,setImageIndex] = useState(0);
  const [artRevision,setArtRevision] = useState(0);
  const [remoteHero,setRemoteHero] = useState<string|null>(null);
  const [lookupFinished,setLookupFinished] = useState(game.nonSteam);
  useEffect(()=>subscribeArtworkSettingsChanged(()=>{
    setRemoteHero(null);
    setLookupFinished(game.nonSteam);
    setImageIndex(0);
  }),[game.id,game.nonSteam]);
  // Steam may not have loaded library assets when the game first receives focus.
  // Request only the selected game's details; never prefetch the whole library.
  useEffect(() => {
    let live=true;
    // Same selected game also mounts GameLogo: share one Steam details request.
    void requestSelectedGameDetails(game.id).then(success=>{
      if(live&&success){setImageIndex(0);setArtRevision(n=>n+1);}
    });
    return ()=>{live=false;};
  },[game.id]);
  const steamHeroes = useMemo(() => heroCandidates(game),
    [game.id,game.hero,game.poster,artRevision]);
  const lastResort = useMemo(()=>heroFallbackCandidates(game),
    [game.id,game.poster]);
  // Steam native hero first, optional SGDB hero second, and only then the
  // normal store header/poster fallback. Existing artwork is never replaced.
  const choices = [...steamHeroes,...(remoteHero?[remoteHero]:[]),
    ...(lookupFinished?lastResort:[])];
  const src=choices[imageIndex];
  useEffect(()=>{
    if(game.nonSteam || src || lookupFinished)return;
    let mounted=true;
    void getMissingSteamArt(game).then(art=>{
      if(mounted){setRemoteHero(art.hero);setLookupFinished(true);}
    }).catch(()=>{if(mounted)setLookupFinished(true);});
    return ()=>{mounted=false;};
  },[game.id,game.title,game.nonSteam,src,lookupFinished]);
  if(!src)return null;
  return <img className="gl-hero" src={src} alt="" key={src}
    onError={() => setImageIndex(n => n+1)}/>;
}

/** The user-selected title logo appears above the game's name. */
export function GameLogo({game}:{game:LibraryGame}) {
  const [sourceIndex,setSourceIndex]=useState(0);
  const [refresh,setRefresh]=useState(0);
  useEffect(()=>{
    let mounted=true;
    void requestSelectedGameDetails(game.id).then(success=>{
      if(mounted&&success){setSourceIndex(0);setRefresh(n=>n+1);}
    });
    return ()=>{mounted=false;};
  },[game.id]);
  const candidates=useMemo(()=>logoCandidates(game),[game.id,game.nonSteam,refresh]);
  const src=candidates[sourceIndex];
  return src?<img className="gl-game-logo" src={src} alt="" key={src}
    onError={()=>setSourceIndex(n=>n+1)}/>:null;
}


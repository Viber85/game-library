import {requestProtonRating,type ProtonTier,type ProtonRating} from "./metadataRequests";
import { useEffect, useState } from "react";
import { MdShield, MdVerified } from "react-icons/md";
import type { LibraryGame } from "./steam";

const label = (tier: ProtonTier) =>
  tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : "Not rated";

/**
 * Steam games query ProtonDB directly by their AppID. Epic/GOG shortcuts
 * resolve their game title to a verified Steam Store match first, then fetch
 * that matching game's actual ProtonDB community score.
 */
export function ProtonDBBadge({game}:{game:LibraryGame}) {
  const [rating,setRating] = useState<ProtonRating | null>(null);
  useEffect(() => {
    let active=true;
    setRating(null);
    const timer=window.setTimeout(() => {
      void requestProtonRating(game.id,game.title,game.nonSteam).then(r => {
        if(active)setRating(r);
      }).catch(()=>{if(active)setRating({status:"error",tier:null});});
    },450);
    return ()=>{active=false;window.clearTimeout(timer);};
  },[game.id,game.title,game.nonSteam]);

  const tier = rating?.status==="ok" ? rating.tier : null;
  const message = !rating ? "Checking…" : tier ? label(tier) :
    rating.status==="error" ? "Unavailable" : "Not rated";
  const Icon = tier==="platinum" ? MdVerified : MdShield;
  const detail = rating?.matched_title
    ? "Matched Steam title: "+rating.matched_title
    : rating?.reason || "Community compatibility from ProtonDB";
  const url = rating?.appid
    ? "https://www.protondb.com/app/"+rating.appid : undefined;

  return <div className="gl-proton-row">
    <div className={"gl-proton-badge "+(tier||"unknown")}
      title={url ? detail+" · "+url : detail}>
      <Icon className="gl-proton-icon"/>
      <span className="gl-proton-source">ProtonDB</span>
      <strong>{message}</strong>
    </div>
  </div>;
}

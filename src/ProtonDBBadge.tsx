import { callable } from "@decky/api";
import { useEffect, useState } from "react";
import { MdShield, MdVerified } from "react-icons/md";
import type { LibraryGame } from "./steam";
import { protonDbAppId } from "./steam";

type Rating = {
  status: "ok" | "unavailable" | "error";
  tier: "platinum" | "gold" | "silver" | "bronze" | "borked" | null;
  cached?: boolean;
  reason?: string;
};
const fetchRating = callable<[number], Rating>("protondb_tier");
const label = (tier: Rating["tier"]) =>
  tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : "Not rated";

/** Community tier shown only when an actual Steam game AppID is known. */
export function ProtonDBBadge({game}:{game:LibraryGame}) {
  const appid = protonDbAppId(game);
  const [rating,setRating] = useState<Rating|null>(null);
  useEffect(() => {
    let active=true;
    setRating(null);
    if(appid===null)return ()=>{active=false};
    const timer=window.setTimeout(() => {
      void fetchRating(appid).then(r => {if(active)setRating(r);})
        .catch(()=>{if(active)setRating({status:"error",tier:null});});
    },350);
    return ()=>{active=false;window.clearTimeout(timer);};
  },[appid]);

  const tier = rating?.status==="ok" ? rating.tier : null;
  const pending = appid !== null && !rating;
  const message = pending ? "Checking…" : tier ? label(tier) :
    appid===null ? "No Steam match" :
    rating?.status==="error" ? "Unavailable" : "Not rated";
  const Icon = tier==="platinum" ? MdVerified : MdShield;
  const url = appid !== null ? "https://www.protondb.com/app/"+appid : undefined;

  return <div className="gl-proton-row">
    <div className={"gl-proton-badge "+(tier||"unknown")}
      title={url ? "Community reports: "+url : "A Steam AppID is required for ProtonDB"}>
      <Icon className="gl-proton-icon"/>
      <span className="gl-proton-source">ProtonDB</span>
      <strong>{message}</strong>
    </div>
  </div>;
}

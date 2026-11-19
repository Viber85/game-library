import {MdHourglassEmpty} from "react-icons/md";

/** Compact, non-interactive metadata loader that never covers Steam's B footer.
 * A real completed/total counter drives the progress bar; unknown data stays
 * at the bottom until resolved by the selected sort provider.
 */
export function SortProgressNotice({
  kind,done,total,
}:{
  kind:"hltb"|"proton"|"achievement";
  done:number;
  total:number;
}) {
  const label=kind==="hltb"?"HOWLONGTOBEAT · MAIN + EXTRAS":
    kind==="proton"?"PROTONDB RATINGS":"ACHIEVEMENT PROGRESS";
  const percent=total>0?Math.max(0,Math.min(100,Math.round(done/total*100))):0;
  return <div className="gl-sort-progress" role="status"
    aria-label={`Loading ${label}: ${done} of ${total} games processed`}>
    <div className="gl-sort-progress-top">
      <div className="gl-sort-progress-icon" aria-hidden="true"><MdHourglassEmpty/></div>
      <div className="gl-sort-progress-name">
        <strong>{label}</strong>
        <span>Loading game data</span>
      </div>
      <strong className="gl-sort-progress-count">{done} / {total}</strong>
    </div>
    <div className="gl-sort-progress-track" role="progressbar"
      aria-label="Games processed" aria-valuemin={0}
      aria-valuemax={total} aria-valuenow={done}>
      <div className="gl-sort-progress-fill" style={{width:percent+"%"}}/>
    </div>
    <div className="gl-sort-progress-note">
      Sorting as data loads · Games without data appear last
    </div>
  </div>;
}


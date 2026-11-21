/** CAppOverview fields from Steam client steammessages_appoverview.proto.
 * Do not invent addition dates for entries without rt_purchased_time.
 * Time fields are Unix seconds; size_on_disk is bytes, not MiB.
 */
type NativeSortFields={addedAt?:number;releaseDate?:number;sizeBytes?:number;requiredBytes?:number};
function safeNonnegative(v:unknown):number|undefined{
  const n=typeof v==="number"?v:
    typeof v==="bigint"?Number(v):
    typeof v==="string"&&/^\d+$/.test(v)?Number(v):NaN;
  return Number.isSafeInteger(n)&&n>0?n:undefined;
}
export function readNativeSortFields(value:unknown):NativeSortFields{
  if(!value||typeof value!=="object")return {};
  const o=value as Record<string,unknown>;
  return {
    addedAt:safeNonnegative(o.rt_purchased_time),
    releaseDate:safeNonnegative(o.rt_original_release_date) ??
      safeNonnegative(o.rt_steam_release_date),
    sizeBytes:safeNonnegative(o.size_on_disk),
    ...(safeNonnegative(o.lDiskSpaceRequiredBytes)!==undefined?
      {requiredBytes:safeNonnegative(o.lDiskSpaceRequiredBytes)}:{}),
  };
}

/**
 * Structural equality for SteamOS status polls. Backend calls often return
 * new objects containing exactly the same status, and React should retain
 * the previous state reference when nothing visible has changed.
 */
export type Battery = {
  percent:number;
  charging:boolean|null;
  plugged:boolean|null;
};
export type Wifi = {
  enabled:boolean|null;
  connected:boolean|null;
  signal:number|null;
};
export type Bluetooth = {enabled:boolean|null};
export type DeviceStatus = {
  battery:Battery|null;
  wifi:Wifi|null;
  bluetooth:Bluetooth|null;
};
export type SteamSupplement = {
  unread:number|null;
  avatar:string|null;
};

export function sameDeviceStatus(a:DeviceStatus,b:DeviceStatus):boolean {
  if(a===b)return true;
  const ab=a.battery,bb=b.battery;
  if(ab!==bb && (!ab||!bb ||
    ab.percent!==bb.percent ||
    ab.charging!==bb.charging ||
    ab.plugged!==bb.plugged))return false;
  const aw=a.wifi,bw=b.wifi;
  if(aw!==bw && (!aw||!bw ||
    aw.enabled!==bw.enabled ||
    aw.connected!==bw.connected ||
    aw.signal!==bw.signal))return false;
  const at=a.bluetooth,bt=b.bluetooth;
  return at===bt || (!!at&&!!bt&&at.enabled===bt.enabled);
}

export function sameSteamSupplement(a:SteamSupplement,b:SteamSupplement):boolean{
  return a===b || (a.unread===b.unread&&a.avatar===b.avatar);
}

import { callable } from "@decky/api";
import { Focusable, Navigation, type GamepadEvent } from "@decky/ui";
import { useEffect, useState, type Ref } from "react";
import {
  MdAccountCircle, MdBattery20, MdBattery50, MdBattery80,
  MdBatteryChargingFull, MdBatteryFull, MdBatteryUnknown,
  MdBluetooth, MdBluetoothDisabled, MdNotificationsNone,
  MdWifi, MdWifiOff,
} from "react-icons/md";
import { getActiveUserId } from "./steam";
import {readLiveSteamClockPreference} from "./steamClock";
import {sameDeviceStatus,sameSteamSupplement,type Battery,type DeviceStatus,type SteamSupplement} from "./systemStatusSnapshot";

const readSystemStatus = callable<[], DeviceStatus>("get_system_status");
const readSteamClockFormat =
  callable<[string],{hour24:boolean|null}>("get_steam_clock_format");
const NO_DEVICE_STATUS: DeviceStatus = { battery: null, wifi: null, bluetooth: null };

/** Resolve the LOCAL Steam account's real avatar from whichever Steam UI store
 * is available on this client build; never scan random friends' pictures. */
function readSteamAvatar(root:any): string | null {
  const owners=[
    root.App?.m_CurrentUser,
    root.friendStore?.m_FriendsUIFriendStore?.m_self?.m_persona,
    root.friendStore?.m_FriendsUIFriendStore?.m_self,
    root.FriendStore?.self?.m_persona,
    root.FriendStore?.self,
    root.SteamUIStore?.m_FriendsUIFriendStore?.m_self?.m_persona,
  ];
  for(const owner of owners){
    if(!owner || typeof owner!=="object")continue;
    const hash=owner.strAvatarHash ?? owner.m_strAvatarHash ??
      owner.avatarhash ?? owner.avatar_hash;
    if(typeof hash==="string" && /^[0-9a-f]{40}$/i.test(hash) && !/^0+$/.test(hash))
      return "https://avatars.steamstatic.com/" + hash + "_medium.jpg";
    const url=owner.avatarmedium ?? owner.avatarfull ?? owner.avatar_url ??
      owner.m_strAvatarURL ?? owner.avatar;
    if(typeof url==="string" &&
      /^https:\/\/(?:avatars\.steamstatic\.com|steamcdn-a\.akamaihd\.net)\//i.test(url))
      return url;
  }
  return null;
}

/** Use Steam's live UI state only when present. No invented notification count/avatar. */
function readSteamSupplement(): SteamSupplement {
  const root = globalThis as any;
  let unread: number | null = null;
  let avatar: string | null = null;
  try {
    const notifications = root.notificationStore;
    const tray = notifications?.m_rgNotificationTray ?? notifications?.m_rgTrayNotifications;
    if (Array.isArray(tray))
      unread = tray.filter((item:any)=>item && item.bViewed !== true && item.viewed !== true).length;
  } catch { /* Steam may not expose a notification store on this build. */ }
  try {
    avatar = readSteamAvatar(root);
  } catch { /* Keep generic user icon if Steam's local account has no avatar. */ }
  return { unread, avatar };
}

function batteryIcon(status: Battery | null) {
  if (!status) return <MdBatteryUnknown />;
  if (status.charging) return <MdBatteryChargingFull />;
  if (status.percent <= 20) return <MdBattery20 />;
  if (status.percent <= 50) return <MdBattery50 />;
  if (status.percent <= 80) return <MdBattery80 />;
  return <MdBatteryFull />;
}

type Props = {
  onStatusButtonDown: (event: GamepadEvent) => void;
  statusRef: Ref<HTMLDivElement>;
};

export function SystemStatusBar({onStatusButtonDown,statusRef}:Props) {
  const [time,setTime]=useState<Date>(()=>new Date());
  const [device,setDevice] = useState<DeviceStatus>(NO_DEVICE_STATUS);
  const [steam,setSteam] = useState<SteamSupplement>(()=>readSteamSupplement());
  const [failedAvatar,setFailedAvatar] = useState<string | null>(null);
  // Prefer Steam's live Game Mode setting over the potentially stale VDF file.
  const [liveClock,setLiveClock] = useState<boolean|null>(()=>
    readLiveSteamClockPreference(globalThis));
  const [savedClock,setSavedClock] = useState<boolean|null>(null);
  const hour24=liveClock??savedClock;

  // A clock tick must never invalidate the Dashboard or game-card tree.
  useEffect(()=>{
    const clock=window.setInterval(()=>setTime(new Date()),15000);
    return ()=>window.clearInterval(clock);
  },[]);

  useEffect(()=>{
    let live = true;
    let pending = false;
    const refresh = () => {
      if (pending) return;
      pending = true;
      void readSystemStatus().then((next)=>{
        if (live && next && typeof next === "object"){
          const normalized:DeviceStatus={
            battery:next.battery??null,
            wifi:next.wifi??null,
            bluetooth:next.bluetooth??null,
          };
          setDevice(previous=>sameDeviceStatus(previous,normalized)?previous:normalized);
        }
      }).catch(()=>{
        if (live) setDevice(previous=>sameDeviceStatus(previous,NO_DEVICE_STATUS)?previous:NO_DEVICE_STATUS);
      }).finally(()=>{pending=false;});
    };
    refresh();
    const deviceTimer=window.setInterval(refresh,12000);
    const steamTimer=window.setInterval(()=>{
      const next=readSteamSupplement();
      setSteam(previous=>sameSteamSupplement(previous,next)?previous:next);
    },5000);
    return ()=>{
      live=false;
      window.clearInterval(deviceTimer);
      window.clearInterval(steamTimer);
    };
  },[]);

  useEffect(()=>{
    let active=true;
    let pending=false;
    let account="";
    const refresh=()=>{
      const current=getActiveUserId();
      if(current!==account){
        account=current;
        setSavedClock(null);
      }
      if(!/^\d{1,10}$/.test(current) || pending)return;
      pending=true;
      void readSteamClockFormat(current).then(response=>{
        if(active && account===current && typeof response?.hour24==="boolean")
          setSavedClock(response.hour24);
      }).catch(()=>{
        // No guessed Steam setting: fall back to the previous locale clock.
      }).finally(()=>{pending=false;});
    };
    refresh();
    // Picking 12h/24h in native Steam Settings updates the Home clock
    // without a plugin restart; also re-read immediately on returning Home.
    const timer=window.setInterval(refresh,15000);
    window.addEventListener("focus",refresh);
    return ()=>{
      active=false;
      window.clearInterval(timer);
      window.removeEventListener("focus",refresh);
    };
  },[]);

  useEffect(()=>{
    // Read the same m_FriendSettings object SteamOS Settings uses.
    // Changes to the 24-hour toggle are reflected without restarting Decky.
    const refreshLiveClock=()=>{
      const next=readLiveSteamClockPreference(globalThis);
      setLiveClock(previous=>previous===next?previous:next);
    };
    refreshLiveClock();
    const clockTimer=window.setInterval(refreshLiveClock,2000);
    window.addEventListener("focus",refreshLiveClock);
    document.addEventListener("visibilitychange",refreshLiveClock);
    return ()=>{
      window.clearInterval(clockTimer);
      window.removeEventListener("focus",refreshLiveClock);
      document.removeEventListener("visibilitychange",refreshLiveClock);
    };
  },[]);

  const wifi=device.wifi;
  const bt=device.bluetooth;
  const battery=device.battery;
  const wifiLabel = !wifi || wifi.enabled === null ? "Wi-Fi status unavailable" :
    wifi.enabled === false ? "Wi-Fi off" :
    wifi.connected === true ? ("Wi-Fi connected" +
      (typeof wifi.signal === "number" ? ": " + wifi.signal + "% signal" : "")) :
    wifi.connected === false ? "Wi-Fi disconnected" : "Wi-Fi enabled";
  const bluetoothLabel = !bt || bt.enabled === null ? "Bluetooth status unavailable" :
    bt.enabled ? "Bluetooth on" : "Bluetooth off";
  const batteryLabel = battery
    ? "Battery " + battery.percent + "%" + (battery.charging ? ", charging" :
      battery.plugged ? ", plugged in" : "")
    : "Battery status unavailable";

  const profile = () => {
    let id="";
    try {
      const g=globalThis as any;
      const nativeId=g.App?.m_CurrentUser?.strSteamID ??
        g.SteamClient?.User?.GetSteamID?.();
      if (nativeId && /^\d{16,20}$/.test(String(nativeId))) id=String(nativeId);
      // getActiveUserId() returns a Steam account32 identifier, not SteamID64.
      if (!id) {
        const account=getActiveUserId();
        if (/^\d{1,10}$/.test(account))
          id=(76561197960265728n+BigInt(account)).toString();
      }
    } catch { /* No active Steam account. */ }
    if (/^\d{16,20}$/.test(id))
      Navigation.NavigateToSteamWeb("https://steamcommunity.com/profiles/" + id);
    else Navigation.OpenMainMenu();
  };

  return <Focusable className="gl-topbar-status" flow-children="row">
    {/* First status control remains the D-pad Up destination from tabs. */}
    <Focusable ref={statusRef} className="gl-topbar-icon gl-topbar-notifications" noFocusRing
      focusClassName="gl-focused" onButtonDown={onStatusButtonDown}
      onActivate={()=>Navigation.Navigate("/notifications")}
      onOKActionDescription="Steam notifications" title="Steam notifications"
      aria-label={steam.unread === null ? "Steam notifications" :
        steam.unread + " unread Steam notifications"}>
      <MdNotificationsNone aria-hidden="true"/>
      {steam.unread !== null && steam.unread > 0 &&
        <span className="gl-topbar-unread">{steam.unread > 99 ? "99+" : steam.unread}</span>}
    </Focusable>
    <Focusable className={"gl-topbar-icon gl-topbar-wifi" +
      (wifi?.connected === false || wifi?.enabled === false ? " gl-status-dim" : "")}
      noFocusRing focusClassName="gl-focused" title={wifiLabel}
      aria-label={wifiLabel} onOKActionDescription="Open Steam network settings"
      onActivate={()=>Navigation.Navigate("/settings")}
      onButtonDown={onStatusButtonDown}>
      {wifi?.connected === false || wifi?.enabled === false ? <MdWifiOff/> : <MdWifi/>}
    </Focusable>
    <Focusable className={"gl-topbar-icon gl-topbar-bluetooth" +
      (bt?.enabled === false ? " gl-status-dim" : "")}
      noFocusRing focusClassName="gl-focused" title={bluetoothLabel}
      aria-label={bluetoothLabel} onOKActionDescription="Open Steam Bluetooth settings"
      onActivate={()=>Navigation.Navigate("/settings/bluetooth")}
      onButtonDown={onStatusButtonDown}>
      {bt?.enabled === false ? <MdBluetoothDisabled/> : <MdBluetooth/>}
    </Focusable>
    <Focusable className="gl-topbar-battery" noFocusRing focusClassName="gl-focused"
      title={batteryLabel} aria-label={batteryLabel}
      onOKActionDescription="Open Steam power settings"
      onActivate={()=>Navigation.Navigate("/settings")}
      onButtonDown={onStatusButtonDown}>
      <span aria-hidden="true" className={"gl-topbar-battery-icon" +
        (battery?.charging ? " gl-battery-charging" : "")}>{batteryIcon(battery)}</span>
      {battery && <span className="gl-topbar-battery-percent">{battery.percent}%</span>}
    </Focusable>
    <time className="gl-topbar-clock" dateTime={time.toISOString()}
      title={liveClock!==null
        ? "Clock format: SteamOS live setting"
        : savedClock!==null
          ? "Clock format: Steam saved setting"
          : "Clock format: system locale (Steam setting unavailable)"}>
      {time.toLocaleTimeString([],hour24===null
        ? {hour:"2-digit",minute:"2-digit"}
        : hour24
          ? {hour:"2-digit",minute:"2-digit",hourCycle:"h23"}
          : {hour:"numeric",minute:"2-digit",hour12:true})}
    </time>
    <Focusable className="gl-topbar-avatar" noFocusRing focusClassName="gl-focused"
      title="Steam profile" aria-label="Open Steam profile"
      onActivate={profile} onOKActionDescription="Steam profile"
      onButtonDown={onStatusButtonDown}>
      {steam.avatar && steam.avatar!==failedAvatar ?
        <img src={steam.avatar} alt="" referrerPolicy="no-referrer"
          onError={()=>setFailedAvatar(steam.avatar)}/> :
        <MdAccountCircle aria-hidden="true"/>}
    </Focusable>
  </Focusable>;
}

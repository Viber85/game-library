"""Read-only SteamOS telemetry for the floating Game Library status bar.

No SSIDs, IPs, account identifiers or other personal network data are exposed.
Unavailable system interfaces return None instead of fabricated information.
"""
from pathlib import Path
import re
import shutil
import subprocess

POWER_SUPPLY = Path("/sys/class/power_supply")
RFKILL = Path("/sys/class/rfkill")


def _read(path):
    try:
        return Path(path).read_text(encoding="utf-8").strip()
    except (OSError, ValueError, UnicodeError):
        return None


def _command(args):
    if shutil.which(args[0]) is None:
        return None
    try:
        proc = subprocess.run(args, capture_output=True, text=True,
                              check=False, timeout=1.5)
        return proc.stdout.strip() if proc.returncode == 0 else None
    except (OSError, subprocess.TimeoutExpired):
        return None


def battery_status():
    try:
        supplies = sorted(POWER_SUPPLY.iterdir())
    except OSError:
        return None
    for battery in supplies:
        if _read(battery / "type") != "Battery":
            continue
        raw = _read(battery / "capacity")
        if not raw or not raw.isdecimal():
            continue
        percent = int(raw)
        if not 0 <= percent <= 100:
            continue
        state = (_read(battery / "status") or "").lower()
        charging = (state == "charging") if state else None
        plugged = True if state in ("charging", "full", "not charging") else (
            False if state == "discharging" else None)
        for supply in supplies:
            if supply == battery:
                continue
            if (_read(supply / "type") or "").lower() in ("mains", "usb", "usb_pd", "usb_c"):
                online = _read(supply / "online")
                if online == "1":
                    plugged = True
        return {"percent": percent, "charging": charging, "plugged": plugged}
    return None


def wifi_status():
    radio = _command(["nmcli", "radio", "wifi"])
    enabled = (radio == "enabled") if radio in ("enabled", "disabled") else None
    raw = _command(["nmcli", "-t", "-f", "DEVICE,TYPE,STATE", "device", "status"])
    connected, device = None, None
    if raw is not None:
        devices = [line.split(":") for line in raw.splitlines()]
        wifi = [parts for parts in devices if len(parts) >= 3 and parts[1] == "wifi"]
        if wifi:
            connected = any(parts[2].startswith("connected") for parts in wifi)
            device = next((parts[0] for parts in wifi if parts[2].startswith("connected")),
                          wifi[0][0])
            if enabled is None:
                enabled = True
    if enabled is None and connected is None:
        return None
    if enabled is False:
        connected = False
    signal = None
    if connected:
        scan = _command(["nmcli", "-t", "-f", "IN-USE,SIGNAL", "device",
                         "wifi", "list", "--rescan", "no"])
        for line in (scan or "").splitlines():
            match = re.fullmatch(r"\*:(\d{1,3})", line.strip())
            if match:
                signal = min(100, int(match.group(1)))
                break
        if signal is None and device:
            try:
                for line in (_read("/proc/net/wireless") or "").splitlines():
                    if line.lstrip().startswith(device + ":"):
                        fields = line.split(":", 1)[1].split()
                        signal = max(0, min(100, round(float(fields[1].rstrip(".")) * 100 / 70)))
                        break
            except (ValueError, IndexError):
                pass
    return {"enabled": enabled, "connected": connected, "signal": signal}


def bluetooth_status():
    try:
        switches = sorted(RFKILL.iterdir())
    except OSError:
        switches = []
    for switch in switches:
        if _read(switch / "type") != "bluetooth":
            continue
        soft, hard = _read(switch / "soft"), _read(switch / "hard")
        if soft in ("0", "1") and hard in ("0", "1"):
            return {"enabled": soft == "0" and hard == "0"}
        state = _read(switch / "state")
        if state in ("0", "1"):
            return {"enabled": state == "1"}
    result = _command(["bluetoothctl", "show"])
    if result:
        match = re.search(r"^\s*Powered:\s*(yes|no)\s*$", result, re.I | re.M)
        if match:
            return {"enabled": match.group(1).lower() == "yes"}
    return None


def get_system_status():
    return {"battery": battery_status(), "wifi": wifi_status(),
            "bluetooth": bluetooth_status()}

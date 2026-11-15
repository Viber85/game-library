"""Safe release metadata validation; Decky Loader performs the installation."""
import json
import pathlib
import re
import urllib.error
import urllib.request

REPOSITORY = "Viber85/game-library"
API = f"https://api.github.com/repos/{REPOSITORY}/releases?per_page=30"
MAX_BYTES = 1_500_000
MAX_ZIP_BYTES = 25_000_000
VERSION = re.compile(r"^v?(\d+)\.(\d+)\.(\d+)(?:-test\.(\d+))?$")
DIGEST = re.compile(r"^sha256:([0-9a-fA-F]{64})$")


def parse_version(value):
    m = VERSION.fullmatch(str(value or ""))
    if not m:
        return None
    major, minor, patch, test = m.groups()
    return int(major), int(minor), int(patch), 0 if test else 1, int(test or 0)


def installed_version(package):
    data = json.loads(pathlib.Path(package).read_text(encoding="utf-8"))
    version = data.get("version")
    if parse_version(version) is None:
        raise ValueError("Unsupported installed package version")
    return version


def validate_github_feed(package, raw):
    current = installed_version(package)
    if not isinstance(raw, str) or len(raw.encode("utf-8")) > MAX_BYTES:
        raise ValueError("GitHub response missing or too large")
    releases = json.loads(raw)
    if not isinstance(releases, list):
        raise ValueError("Unexpected GitHub release format")
    best = None
    best_key = None
    for release in releases:
        if not isinstance(release, dict) or release.get("draft"):
            continue
        tag = release.get("tag_name")
        rank = parse_version(tag)
        if rank is None or (best_key is not None and rank <= best_key):
            continue
        version = str(tag).removeprefix("v")
        name = f"game-library-v{version}.zip"
        url = f"https://github.com/{REPOSITORY}/releases/download/v{version}/{name}"
        for asset in release.get("assets") or []:
            if not isinstance(asset, dict) or asset.get("name") != name:
                continue
            if asset.get("browser_download_url") != url:
                continue
            size = asset.get("size")
            if type(size) is not int or not 5_000 < size < MAX_ZIP_BYTES:
                continue
            digest = DIGEST.fullmatch(str(asset.get("digest") or ""))
            notes = release.get("body")
            best = {
                "version": version,
                "tag": f"v{version}",
                "notes": (notes[:4000] if isinstance(notes, str) else "") or "Game Library update.",
                "asset_url": url,
                "sha256": digest.group(1).lower() if digest else "",
                "release_url": f"https://github.com/{REPOSITORY}/releases/tag/v{version}",
            }
            best_key = rank
            break
    return {
        "current": current,
        "available": bool(best_key is not None and best_key > parse_version(current)),
        "latest": best,
    }


def check_github_update(package):
    request = urllib.request.Request(API, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": "Game-Library-Decky-Updater/0.2",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    try:
        with urllib.request.urlopen(request, timeout=10) as resp:
            raw = resp.read(MAX_BYTES + 1)
            if len(raw) > MAX_BYTES:
                raise ValueError("GitHub response too large")
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            raise RuntimeError(
                "GitHub returned 404. If this repository is private, "
                "Decky cannot check or install releases without authentication."
            ) from exc
        raise RuntimeError(f"GitHub API returned HTTP {exc.code}") from exc
    except (OSError, urllib.error.URLError, TimeoutError) as exc:
        raise RuntimeError("GitHub connection failed") from exc
    return validate_github_feed(package, raw.decode("utf-8"))

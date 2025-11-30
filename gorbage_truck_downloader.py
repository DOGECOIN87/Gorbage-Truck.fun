"""
Download all GORBAGIO NFTs whose background trait is "gorbage truck".

Requirements:
  - Python 3
  - requests (`pip install requests`)
  - Helius API key in env: HELIUS_API_KEY

Usage:
  export HELIUS_API_KEY=your_key_here
  python gorbage_truck_downloader.py
"""

import os
import pathlib
import re
import time
from typing import Dict, Generator, List, Optional

import requests

# === CONFIG ===

# Any known GORBAGIO mint (used to discover the collection)
SAMPLE_MINT = "B3qkk8psvGWhxuY9aZiVRVDhjoLjVi93Ki3he1xufQ8W"

# Trait filter
TARGET_TRAIT_VALUE = "gorbage truck"
BACKGROUND_KEYS = {"background", "Background", "backgrounds", "Backgrounds"}

# Output directory
OUT_DIR = pathlib.Path("gorbage_truck_images")

# Helius setup
HELIUS_API_KEY = os.getenv("HELIUS_API_KEY") or "PASTE_YOUR_HELIUS_API_KEY_HERE"
RPC_URL = f"https://mainnet.helius-rpc.com/?api-key={HELIUS_API_KEY}"

# Simple cache for off-chain metadata fetches
METADATA_CACHE: Dict[str, Dict] = {}

# IPFS gateways to rotate through when one rate-limits
IPFS_GATEWAYS: List[str] = [
    "https://cloudflare-ipfs.com/ipfs/{cid}{path}",
    "https://ipfs.io/ipfs/{cid}{path}",
    "https://gateway.pinata.cloud/ipfs/{cid}{path}",
    "https://gateway.pinit.io/ipfs/{cid}{path}",
]

# Pagination controls (override via env)
PAGE_LIMIT = int(os.getenv("GORB_PAGE_LIMIT", "100"))
PAGE_START = int(os.getenv("GORB_PAGE_START", "1"))
MAX_PAGES = os.getenv("GORB_MAX_PAGES")
MAX_PAGES = int(MAX_PAGES) if MAX_PAGES else None

# Simple cache for off-chain metadata fetches
METADATA_CACHE: Dict[str, Dict] = {}


# === HELPER FUNCTIONS ===

def get_asset(mint: str) -> Dict:
    """Fetch a single asset by mint."""
    return helius_rpc("getAsset", {"id": mint})


def helius_rpc(method: str, params: Dict) -> Dict:
    """Call a Helius DAS RPC method and return the `result` field."""
    payload = {"jsonrpc": "2.0", "id": "1", "method": method, "params": params}
    resp = requests.post(RPC_URL, json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if "error" in data:
        raise RuntimeError(f"Helius RPC error: {data['error']}")
    return data["result"]


def get_collection_for_mint(mint: str) -> str:
    """Use getAsset to find the on-chain collection ID for a given mint."""
    result = get_asset(mint)
    grouping = result.get("grouping", [])
    for group in grouping:
        if group.get("group_key") == "collection":
            return group.get("group_value")
    raise RuntimeError("No collection grouping found for this mint.")


def iter_collection_assets(
    collection_id: str, page_size: int = 1000
) -> Generator[Dict, None, None]:
    """Iterate all assets in a collection using getAssetsByGroup with pagination."""
    page = 1
    while True:
        result = helius_rpc(
            "getAssetsByGroup",
            {
                "groupKey": "collection",
                "groupValue": collection_id,
                "page": page,
                "limit": page_size,
            },
        )

        items = result.get("items", [])
        if not items:
            break

        for asset in items:
            yield asset

        total = result.get("total", 0)
        if page * page_size >= total:
            break

        page += 1


def iter_creator_assets(
    creator_address: str, page_size: int = 1000
) -> Generator[Dict, None, None]:
    """Iterate assets by verified creator as a fallback when collection is missing."""
    page = 1
    while True:
        result = helius_rpc(
            "getAssetsByCreator",
            {
                "creatorAddress": creator_address,
                "onlyVerified": True,
                "page": page,
                "limit": page_size,
            },
        )

        items = result.get("items", [])
        if not items:
            break

        for asset in items:
            yield asset

        total = result.get("total", 0)
        if page * page_size >= total:
            break

        page += 1


def iter_authority_assets(
    authority_address: str, page_size: int = 1000, page_start: int = 1, max_pages: Optional[int] = None
) -> Generator[Dict, None, None]:
    """Iterate assets by authority address."""
    page = page_start
    pages_seen = 0
    while True:
        if max_pages is not None and pages_seen >= max_pages:
            break
        result = helius_rpc(
            "getAssetsByAuthority",
            {"authorityAddress": authority_address, "page": page, "limit": page_size},
        )

        items = result.get("items", [])
        if not items:
            break

        for asset in items:
            yield asset

        pages_seen += 1
        page += 1


def rewrite_ipfs_urls(url: str) -> List[str]:
    """
    Build a list of alternate gateway URLs for an IPFS link.
    Returns the original URL first, followed by gateway rewrites.
    """
    urls = [url]
    match = re.search(r"/ipfs/([A-Za-z0-9]+)(/.*)?", url)
    if not match:
        return urls

    cid = match.group(1)
    path = match.group(2) or ""
    for tmpl in IPFS_GATEWAYS:
        rewritten = tmpl.format(cid=cid, path=path)
        if rewritten not in urls:
            urls.append(rewritten)
    return urls


def fetch_offchain_metadata(json_uri: str) -> Optional[Dict]:
    """Fetch off-chain JSON metadata with caching."""
    if json_uri in METADATA_CACHE:
        return METADATA_CACHE[json_uri]
    last_error = None
    for candidate in rewrite_ipfs_urls(json_uri):
        for attempt in range(3):
            try:
                response = requests.get(candidate, timeout=20)
                if response.status_code == 429:
                    # Back off and retry same gateway
                    time.sleep(1.0 * (attempt + 1))
                    continue
                response.raise_for_status()
                meta = response.json()
                METADATA_CACHE[json_uri] = meta
                return meta
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                continue
    if last_error:
        print(f"Failed to fetch metadata from {json_uri}: {last_error}")
    METADATA_CACHE[json_uri] = None
    return None


def has_gorbage_background(asset: Dict) -> bool:
    """Check if the asset has a background trait equal to 'gorbage truck'."""
    metadata = asset.get("content", {}).get("metadata") or {}
    attrs = metadata.get("attributes") or []

    def _matches(attributes):
        for attr in attributes or []:
            trait_type = attr.get("trait_type")
            value = attr.get("value")
            if (
                isinstance(trait_type, str)
                and trait_type in BACKGROUND_KEYS
                and isinstance(value, str)
                and value.lower() == TARGET_TRAIT_VALUE.lower()
            ):
                return True
        return False

    if _matches(attrs):
        return True

    # Fallback: fetch off-chain metadata if not present on-chain
    json_uri = asset.get("content", {}).get("json_uri")
    if isinstance(json_uri, str) and json_uri.startswith("http"):
        meta = fetch_offchain_metadata(json_uri)
        if meta and _matches(meta.get("attributes")):
            return True

    return False


def get_image_url(asset: Dict) -> Optional[str]:
    """Try to get an image URL from links, files, or the off-chain JSON."""
    content = asset.get("content", {}) or {}

    # 1) content.links.image
    links = content.get("links") or {}
    if isinstance(links, dict):
        img = links.get("image")
        if isinstance(img, str) and img.startswith("http"):
            return img

    # 2) content.files[*].uri
    files = content.get("files") or []
    for f in files:
        uri = f.get("uri")
        if isinstance(uri, str) and uri.startswith("http"):
            return uri

    # 3) Fallback: fetch json_uri and read "image"
    json_uri = content.get("json_uri")
    if isinstance(json_uri, str) and json_uri.startswith("http"):
        meta = fetch_offchain_metadata(json_uri)
        if meta:
            image = meta.get("image")
            if isinstance(image, str):
                return image

    return None


def filename_from_asset(asset: Dict, img_url: str) -> str:
    """Build a nice filename like gorbagio_3138.png using the NFT name or mint."""
    metadata = asset.get("content", {}).get("metadata") or {}
    name = metadata.get("name") or asset.get("id", "unknown")

    # Try to grab '#1234' from the name
    match = re.search(r"#(\d+)", str(name))
    if match:
        num = match.group(1)
        base = f"gorbagio_{num}"
    else:
        base = re.sub(r"\W+", "_", str(name)).strip("_") or "nft"

    suffix = pathlib.Path(img_url.split("?", 1)[0]).suffix or ".png"
    return f"{base}{suffix}"


def download_image(url: str, out_path: pathlib.Path) -> None:
    """Download image from URL to out_path."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    last_error = None
    for candidate in rewrite_ipfs_urls(url):
        try:
            with requests.get(candidate, stream=True, timeout=60) as resp:
                if resp.status_code == 429:
                    time.sleep(1.0)
                    continue
                resp.raise_for_status()
                with open(out_path, "wb") as file:
                    for chunk in resp.iter_content(8192):
                        if chunk:
                            file.write(chunk)
                return
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            continue
    if last_error:
        raise last_error


# === MAIN ===

def main() -> None:
    if "PASTE_YOUR_HELIUS_API_KEY_HERE" in HELIUS_API_KEY:
        raise SystemExit(
            "Set HELIUS_API_KEY env var or edit the script with your API key first."
        )

    print(f"Using Helius RPC: {RPC_URL}")
    print(f"Finding collection for mint: {SAMPLE_MINT}")

    sample_asset = get_asset(SAMPLE_MINT)

    collection_id: Optional[str] = None
    try:
        collection_id = get_collection_for_mint(SAMPLE_MINT)
    except RuntimeError:
        collection_id = None

    creator_fallback = None
    if not collection_id:
        creators = sample_asset.get("creators") or []
        for creator in creators:
            if creator.get("verified"):
                creator_fallback = creator.get("address")
                break

    authorities = sample_asset.get("authorities") or []
    authority_address = None
    for auth in authorities:
        addr = auth.get("address")
        if addr:
            authority_address = addr
            break

    if collection_id:
        print(f"Collection ID: {collection_id}")
        iterator = iter_collection_assets(collection_id)
    elif authority_address:
        print(
            f"No collection grouping found. Using authority: {authority_address}"
        )
        iterator = iter_authority_assets(
            authority_address,
            page_size=PAGE_LIMIT,
            page_start=PAGE_START,
            max_pages=MAX_PAGES,
        )
    elif creator_fallback:
        print(
            f"No collection grouping found. Falling back to verified creator: {creator_fallback}"
        )
        iterator = iter_creator_assets(creator_fallback)
    else:
        raise SystemExit(
            "Neither collection nor creator nor authority iterator could be determined from the sample mint."
        )

    OUT_DIR.mkdir(exist_ok=True)
    downloaded = 0

    for asset in iterator:
        mint = asset.get("id")
        print(f"[check] {mint}")
        if not has_gorbage_background(asset):
            continue

        img_url = get_image_url(asset)
        if not img_url:
            print(f"[skip] No image URL for asset {mint}")
            continue

        filename = filename_from_asset(asset, img_url)
        out_path = OUT_DIR / filename

        print(f"[download] {mint} -> {out_path}")
        try:
            download_image(img_url, out_path)
            downloaded += 1
        except Exception as exc:  # noqa: BLE001
            print(f"[error] Failed to download {mint} from {img_url}: {exc}")

        # Be gentle to APIs
        time.sleep(1.0)

    print(f"Done. Downloaded {downloaded} images into: {OUT_DIR.resolve()}")


if __name__ == "__main__":
    main()

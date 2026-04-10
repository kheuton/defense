#!/usr/bin/env python3
"""
Extract a simplified Massachusetts outline from a TopoJSON source
and output JS-ready [x, z] coordinate arrays scaled to world units.

Usage:
    conda activate defense
    python gen_ma_outline.py

Outputs coordinates to stdout — paste into config.js.
Coordinate mapping: lon → x, lat → -z  (north = -z in Three.js)
Centered at origin, ~10 world units E-W span.
"""

import json
import math
import urllib.request

# ── Source: vega-datasets us-10m TopoJSON ─────────────────────────
TOPO_URL = "https://cdn.jsdelivr.net/npm/vega-datasets@2/data/us-10m.json"
MA_FIPS = "25"

TARGET_POINTS = 70  # aim for this many points after simplification
WORLD_WIDTH = 10.0  # E-W span in world units


# ── TopoJSON decoding ─────────────────────────────────────────────
def decode_arc(arc_indices, arcs, scale, translate):
    """Decode a TopoJSON arc ring into lon/lat coordinates."""
    coords = []
    for idx in arc_indices:
        reverse = idx < 0
        arc = arcs[~idx if reverse else idx]
        decoded = []
        x, y = 0, 0
        for dx, dy in arc:
            x += dx
            y += dy
            decoded.append((
                x * scale[0] + translate[0],
                y * scale[1] + translate[1],
            ))
        if reverse:
            decoded.reverse()
        if coords:
            decoded = decoded[1:]
        coords.extend(decoded)
    return coords


# ── Douglas-Peucker simplification ────────────────────────────────
def _perp_dist(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    if dx == 0 and dy == 0:
        return math.hypot(p[0] - a[0], p[1] - a[1])
    t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
    proj = (a[0] + t * dx, a[1] + t * dy)
    return math.hypot(p[0] - proj[0], p[1] - proj[1])


def douglas_peucker(points, epsilon):
    if len(points) <= 2:
        return points
    dmax, idx = 0, 0
    for i in range(1, len(points) - 1):
        d = _perp_dist(points[i], points[0], points[-1])
        if d > dmax:
            dmax, idx = d, i
    if dmax > epsilon:
        left = douglas_peucker(points[: idx + 1], epsilon)
        right = douglas_peucker(points[idx:], epsilon)
        return left[:-1] + right
    return [points[0], points[-1]]


def simplify_to_target(points, target_n, lo=0.0, hi=1.0, iters=30):
    for _ in range(iters):
        mid = (lo + hi) / 2
        result = douglas_peucker(points, mid)
        if len(result) > target_n:
            lo = mid
        else:
            hi = mid
    return douglas_peucker(points, hi)


# ── Main ──────────────────────────────────────────────────────────
def main():
    print("Downloading us-10m TopoJSON...", flush=True)
    with urllib.request.urlopen(TOPO_URL, timeout=15) as resp:
        topo = json.loads(resp.read().decode())

    transform = topo.get("transform", {})
    scale = transform.get("scale", [1, 1])
    translate = transform.get("translate", [0, 0])
    arcs = topo["arcs"]

    # Find Massachusetts (FIPS 25)
    ma_geom = None
    for geom in topo["objects"]["states"]["geometries"]:
        if str(geom.get("id")) == MA_FIPS:
            ma_geom = geom
            break
    if ma_geom is None:
        raise RuntimeError("Massachusetts not found")

    # Get the largest polygon (mainland)
    if ma_geom["type"] == "MultiPolygon":
        rings = []
        for poly_arcs in ma_geom["arcs"]:
            ring = decode_arc(poly_arcs[0], arcs, scale, translate)
            rings.append(ring)
        raw_ring = max(rings, key=len)
    elif ma_geom["type"] == "Polygon":
        raw_ring = decode_arc(ma_geom["arcs"][0], arcs, scale, translate)
    else:
        raise RuntimeError(f"Unexpected type: {ma_geom['type']}")

    print(f"Raw mainland polygon: {len(raw_ring)} points")

    # Simplify if needed
    if len(raw_ring) > TARGET_POINTS:
        simplified = simplify_to_target(raw_ring, TARGET_POINTS)
    else:
        simplified = raw_ring
    print(f"After simplification: {len(simplified)} points")

    # Compute bounding box
    lons = [p[0] for p in simplified]
    lats = [p[1] for p in simplified]
    center_lon = (min(lons) + max(lons)) / 2
    center_lat = (min(lats) + max(lats)) / 2
    lon_span = max(lons) - min(lons)

    # Scale: lon_span → WORLD_WIDTH
    lon_scale = WORLD_WIDTH / lon_span
    # Aspect correction at MA latitude (~42°N): 1° lon ≈ 82km, 1° lat ≈ 111km
    lat_scale = lon_scale * (111.0 / 82.0)

    # Convert: lon → x, lat → -z (north = -z in Three.js)
    world_pts = []
    for lon, lat in simplified:
        x = (lon - center_lon) * lon_scale
        z = -(lat - center_lat) * lat_scale
        world_pts.append((round(x, 3), round(z, 3)))

    # Ensure closed
    if world_pts[0] != world_pts[-1]:
        world_pts.append(world_pts[0])

    # Output JS
    print(f"\n// ── Paste into config.js ──")
    print(f"// {len(world_pts)} points, centered at origin, ~{WORLD_WIDTH} units E-W")
    print(f"// Source: {TOPO_URL} (MA mainland, FIPS {MA_FIPS})")
    print("export const MA_OUTLINE = [")
    for i, (x, z) in enumerate(world_pts):
        comma = "," if i < len(world_pts) - 1 else ","
        print(f"  [{x:7.3f}, {z:7.3f}]{comma}")
    print("];")

    # Bounding box
    xs = [p[0] for p in world_pts]
    zs = [p[1] for p in world_pts]
    print(f"\n// Bounding box: x=[{min(xs):.3f}, {max(xs):.3f}], z=[{min(zs):.3f}, {max(zs):.3f}]")


if __name__ == "__main__":
    main()

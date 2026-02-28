/**
 * Safety-aware A* router on H3 hexagonal grid.
 * Preload all safety data into memory at startup for performance.
 */
import { latLngToCell, cellToLatLng, gridDisk } from "h3-js";

const EPSILON_KM = 0.05;

// ─── Min-Heap Priority Queue ─────────────────────────────────────────────────
class MinPriorityQueue {
  constructor() { this._heap = []; }
  get size() { return this._heap.length; }
  isEmpty() { return this._heap.length === 0; }

  push(item, priority) {
    this._heap.push({ item, priority });
    this._up(this._heap.length - 1);
  }

  pop() {
    if (this._heap.length === 1) return this._heap.pop();
    const top = this._heap[0];
    this._heap[0] = this._heap.pop();
    this._down(0);
    return top;
  }

  _up(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this._heap[p].priority <= this._heap[i].priority) break;
      [this._heap[p], this._heap[i]] = [this._heap[i], this._heap[p]];
      i = p;
    }
  }

  _down(i) {
    const n = this._heap.length;
    while (true) {
      let s = i;
      const l = i * 2 + 1, r = i * 2 + 2;
      if (l < n && this._heap[l].priority < this._heap[s].priority) s = l;
      if (r < n && this._heap[r].priority < this._heap[s].priority) s = r;
      if (s === i) break;
      [this._heap[s], this._heap[i]] = [this._heap[i], this._heap[s]];
      i = s;
    }
  }
}

// ─── Haversine Distance ───────────────────────────────────────────────────────
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ─── SafetyAStarRouter ────────────────────────────────────────────────────────
export class SafetyAStarRouter {
  /**
   * @param {object} cfg
   * @param {number} cfg.resolution         H3 resolution (7–9 recommended)
   * @param {Array<{lat,lng,severity?}>} cfg.crimes
   * @param {Array<{lat,lng,capacity?}>}  cfg.policeStations
   * @param {Array<{lat,lng,capacity?}>}  cfg.hospitals
   * @param {object} [cfg.weights]           {crime, police, hospital}
   * @param {number} [cfg.dangerThreshold]   0–1, default 0.80
   * @param {number} [cfg.influenceRings]    H3 rings for neighbor lookup, default 3
   */
  constructor(cfg) {
    this.resolution       = cfg.resolution ?? 9;
    this.dangerThreshold  = cfg.dangerThreshold ?? 0.80;
    this.influenceRings   = cfg.influenceRings ?? 3;

    this.weights = {
      crime:   cfg.weights?.crime   ?? 1.0,
      police:  cfg.weights?.police  ?? 0.8,
      hospital:cfg.weights?.hospital ?? 0.6,
    };

    this._centerCache = new Map();
    this._dangerCache = new Map();

    // Spatial index: H3 cell → array of points
    this._crimeIdx   = this._buildIndex(cfg.crimes   ?? [], this.resolution);
    this._policeIdx  = this._buildIndex(cfg.policeStations ?? [], this.resolution);
    this._hospitalIdx= this._buildIndex(cfg.hospitals ?? [], this.resolution);
  }

  // ── Public: find safest path ────────────────────────────────────────────────
  findSafestPath(startLatLng, goalLatLng) {
    const startHex = latLngToCell(startLatLng.lat, startLatLng.lng, this.resolution);
    const goalHex  = latLngToCell(goalLatLng.lat,  goalLatLng.lng,  this.resolution);

    if (startHex === goalHex) return [startHex];

    // Hard gate on start/goal danger
    if (this.computeDanger(goalHex) > this.dangerThreshold) {
      // Relax threshold at goal so we can still reach it
    }

    const open    = new MinPriorityQueue();
    const closed  = new Set();
    const cameFrom= new Map();
    const gScore  = new Map([[startHex, 0]]);
    const fScore  = new Map([[startHex, this._h(startHex, goalHex)]]);

    open.push(startHex, fScore.get(startHex));

    while (!open.isEmpty()) {
      const { item: cur, priority: curF } = open.pop();

      // Skip stale heap entries
      if (curF !== fScore.get(cur)) continue;
      if (closed.has(cur)) continue;
      closed.add(cur);

      if (cur === goalHex) {
        return this.reconstructPath(cameFrom, cur);
      }

      for (const nb of this._neighbors(cur)) {
        if (closed.has(nb)) continue;

        const danger = this.computeDanger(nb);
        // Allow goal even if high danger, skip everything else above threshold
        if (nb !== goalHex && danger > this.dangerThreshold) continue;

        const stepKm  = this.distKm(cur, nb);
        const edgeCost = stepKm * (1 + danger);
        const tentG    = (gScore.get(cur) ?? Infinity) + edgeCost;

        if (tentG < (gScore.get(nb) ?? Infinity)) {
          cameFrom.set(nb, cur);
          gScore.set(nb, tentG);
          const f = tentG + this._h(nb, goalHex);
          fScore.set(nb, f);
          open.push(nb, f);
        }
      }
    }

    return []; // no path found
  }

  // ── Public: danger score for a hex [0,1] ───────────────────────────────────
  computeDanger(hex) {
    const cached = this._dangerCache.get(hex);
    if (cached !== undefined) return cached;

    const [lat, lng] = this._center(hex);

    let crimeRisk    = 0;
    let safetyBoost  = 0;

    for (const p of this._nearbyPoints(this._crimeIdx, hex)) {
      const d = Math.max(haversineKm(lat, lng, p.lat, p.lng), EPSILON_KM);
      crimeRisk += this.weights.crime * (p.severity ?? 1) * (1 / d);
    }
    for (const p of this._nearbyPoints(this._policeIdx, hex)) {
      const d = Math.max(haversineKm(lat, lng, p.lat, p.lng), EPSILON_KM);
      safetyBoost += this.weights.police * (p.capacity ?? 1) * (1 / d);
    }
    for (const p of this._nearbyPoints(this._hospitalIdx, hex)) {
      const d = Math.max(haversineKm(lat, lng, p.lat, p.lng), EPSILON_KM);
      safetyBoost += this.weights.hospital * (p.capacity ?? 1) * (1 / d);
    }

    // Sigmoid normalization
    const raw    = crimeRisk - safetyBoost;
    const danger = 1 / (1 + Math.exp(-raw));
    this._dangerCache.set(hex, danger);
    return danger;
  }

  // ── Public: score a coordinate path (e.g. from OSRM) ──────────────────────
  /**
   * Sample an array of [lng,lat] coords and return aggregate safety stats.
   * @param {Array<[number,number]>} coords   [[lng,lat],...]
   * @param {number} [sampleEveryKm=0.15]
   * @returns {{ avgDanger:number, maxDanger:number, safetyScore:number }}
   */
  scoreCoordPath(coords, sampleEveryKm = 0.15) {
    if (!coords || coords.length === 0) return { avgDanger: 0.5, maxDanger: 0.5, safetyScore: 50 };

    const sampled = this._sampleCoords(coords, sampleEveryKm);
    const dangers = sampled.map(([lng, lat]) => {
      const hex = latLngToCell(lat, lng, this.resolution);
      return this.computeDanger(hex);
    });

    const avg  = dangers.reduce((s, v) => s + v, 0) / dangers.length;
    const max  = Math.max(...dangers);
    const safetyScore = Math.round((1 - avg) * 100);
    return { avgDanger: avg, maxDanger: max, safetyScore };
  }

  // ── Public: reconstruct path from cameFrom map ─────────────────────────────
  reconstructPath(cameFrom, current) {
    const path = [current];
    while (cameFrom.has(current)) {
      current = cameFrom.get(current);
      path.push(current);
    }
    return path.reverse();
  }

  // ── Public: distance between two hex centers ───────────────────────────────
  distKm(hexA, hexB) {
    const [la, lna] = this._center(hexA);
    const [lb, lnb] = this._center(hexB);
    return haversineKm(la, lna, lb, lnb);
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  _center(hex) {
    let c = this._centerCache.get(hex);
    if (!c) { c = cellToLatLng(hex); this._centerCache.set(hex, c); }
    return c;
  }

  _neighbors(hex) {
    return gridDisk(hex, 1).filter((h) => h !== hex);
  }

  _h(hexA, hexB) {
    return this.distKm(hexA, hexB); // admissible: real geo dist ≤ cost
  }

  _buildIndex(points, res) {
    const map = new Map();
    for (const p of points) {
      const cell = latLngToCell(p.lat, p.lng, res);
      if (!map.has(cell)) map.set(cell, []);
      map.get(cell).push(p);
    }
    return map;
  }

  _nearbyPoints(index, hex) {
    const cells = gridDisk(hex, this.influenceRings);
    const out = [];
    for (const c of cells) {
      const arr = index.get(c);
      if (arr) out.push(...arr);
    }
    return out;
  }

  /**
   * Downsample coordinate array to approximately one point every `targetKm`.
   */
  _sampleCoords(coords, targetKm) {
    if (coords.length <= 2) return coords;
    const sampled = [coords[0]];
    let accumulated = 0;
    for (let i = 1; i < coords.length; i++) {
      const [ln1, la1] = coords[i - 1];
      const [ln2, la2] = coords[i];
      accumulated += haversineKm(la1, ln1, la2, ln2);
      if (accumulated >= targetKm) {
        sampled.push(coords[i]);
        accumulated = 0;
      }
    }
    if (sampled[sampled.length - 1] !== coords[coords.length - 1]) {
      sampled.push(coords[coords.length - 1]);
    }
    return sampled;
  }
}

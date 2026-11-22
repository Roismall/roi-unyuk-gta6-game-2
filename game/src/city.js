// Solmar Bay world layout: road grid, districts, buildings, water, sand,
// palms, coins, shops and mission landmarks. All layout is deterministic
// from the world seed.
const WORLD_W = 4800;
const WORLD_H = 3600;
const ROAD_W = 64;

function districtAt(x, y) {
  if (x < 1300 && y < 1500) return 'harbor';
  if (y < 1400) return 'downtown';
  if (x > 3500) return 'marina';
  if (y > 2800) return 'beach';
  return 'suburbs';
}

const DISTRICT_STYLE = {
  downtown: { palette: ['#5b6b7a', '#6e7f92', '#4a5a68', '#7d8ea3'], roof: '#39434e', h: [70, 150] },
  harbor: { palette: ['#8a5a3b', '#7a4f33', '#96704a', '#6b4a35'], roof: '#4c3a2e', h: [30, 60] },
  marina: { palette: ['#e8e2d4', '#dfe6ea', '#f2ede0', '#cfd8dc'], roof: '#7fa3b0', h: [24, 48] },
  beach: { palette: ['#e6c98f', '#d9b77c', '#f0d9a8', '#c9a86a'], roof: '#b0784a', h: [18, 36] },
  suburbs: { palette: ['#c98a7a', '#a8b89a', '#d8b48a', '#9ab0c8'], roof: '#6b4a3a', h: [22, 40] }
};

function buildCity(seed) {
  const rng = makeRng(seed);
  const roadsV = [];
  const roadsH = [];
  for (let x = 400; x <= 4400; x += 400) roadsV.push(x);
  for (let y = 400; y <= 3200; y += 400) roadsH.push(y);

  const buildings = [];
  const palms = [];
  // Blocks between roads: each block gets 1-2 buildings, a park, or palms.
  for (let i = 0; i < roadsV.length - 1; i++) {
    for (let j = 0; j < roadsH.length - 1; j++) {
      const bx = roadsV[i] + ROAD_W / 2 + 24;
      const by = roadsH[j] + ROAD_W / 2 + 24;
      const bw = 400 - ROAD_W - 48;
      const bh = 400 - ROAD_W - 48;
      const cx = bx + bw / 2, cy = by + bh / 2;
      const d = districtAt(cx, cy);
      if (d === 'beach' && rng.chance(0.55)) {
        // Open sand with palms instead of buildings.
        for (let p = 0; p < rng.int(3, 6); p++) {
          palms.push({ x: rng.range(bx, bx + bw), y: rng.range(by, by + bh), s: rng.range(0.8, 1.3) });
        }
        continue;
      }
      if (rng.chance(0.12)) {
        // Park: grass + palms.
        for (let p = 0; p < rng.int(4, 8); p++) {
          palms.push({ x: rng.range(bx, bx + bw), y: rng.range(by, by + bh), s: rng.range(0.8, 1.4) });
        }
        continue;
      }
      const style = DISTRICT_STYLE[d];
      const n = rng.chance(0.4) ? 2 : 1;
      for (let b = 0; b < n; b++) {
        const w = n === 1 ? bw * rng.range(0.55, 0.8) : bw * rng.range(0.4, 0.48);
        const h = n === 1 ? bh * rng.range(0.55, 0.8) : bh * rng.range(0.4, 0.48);
        const x = n === 1 ? cx - w / 2 : bx + (b === 0 ? 0 : bw - w);
        const y = n === 1 ? cy - h / 2 : by + (b === 0 ? 0 : bh - h);
        buildings.push({
          x: x, y: y, w: w, h: h,
          color: rng.pick(style.palette), roof: style.roof,
          tall: rng.range(style.h[0], style.h[1]), district: d
        });
      }
    }
  }

  // Scattered palms along the beach and marina boardwalk.
  for (let x = 300; x < 4600; x += 90) {
    if (rng.chance(0.5)) palms.push({ x: x + rng.range(-20, 20), y: 3360 + rng.range(-30, 30), s: rng.range(0.9, 1.4) });
    if (rng.chance(0.35)) palms.push({ x: 4520 + rng.range(-20, 20), y: rng.range(300, 3300), s: rng.range(0.9, 1.3) });
  }

  // Landmarks (mission anchors).
  const landmarks = {
    motel: { x: 1000, y: 1800, label: 'Palms Motel' },
    warehouse: { x: 600, y: 1000, label: 'Harbor Warehouse' },
    casino: { x: 4000, y: 1000, label: 'Venn Casino' },
    airstrip: { x: 4200, y: 3000, label: 'Solmar Airstrip' },
    docks: { x: 300, y: 600, label: 'Harbor Docks' },
    gunshop: { x: 2000, y: 1000, label: 'Iron Works Gun Shop' },
    garage: { x: 2600, y: 2600, label: 'Rico’s Garage' },
    beach: { x: 2400, y: 3300, label: 'Sunset Beach' },
    safehouse: { x: 4200, y: 3000, label: 'Safehouse' }
  };

  // Keep every landmark reachable: clear buildings that cover one.
  for (const key of Object.keys(landmarks)) {
    const lm = landmarks[key];
    for (let i = buildings.length - 1; i >= 0; i--) {
      const b = buildings[i];
      if (lm.x > b.x - 110 && lm.x < b.x + b.w + 110 && lm.y > b.y - 110 && lm.y < b.y + b.h + 110) {
        buildings.splice(i, 1);
      }
    }
  }

  // 20 sun coins on sidewalks and plazas.
  const coins = [];
  for (let c = 0; c < 20; c++) {
    const onV = rng.chance(0.5);
    const road = onV ? rng.pick(roadsV) : rng.pick(roadsH);
    const along = rng.range(300, onV ? WORLD_H - 400 : WORLD_W - 400);
    const off = (rng.chance(0.5) ? -1 : 1) * (ROAD_W / 2 + 26);
    coins.push({
      id: c,
      x: onV ? road + off : along,
      y: onV ? along : road + off,
      taken: false
    });
  }

  return {
    w: WORLD_W, h: WORLD_H,
    roadsV: roadsV, roadsH: roadsH,
    buildings: buildings, palms: palms,
    landmarks: landmarks, coins: coins
  };
}

function onRoad(world, x, y) {
  const m = ROAD_W / 2 + 6;
  for (const rx of world.roadsV) if (Math.abs(x - rx) < m && y > 180 && y < 3420) return true;
  for (const ry of world.roadsH) if (Math.abs(y - ry) < m && x > 180 && x < 4620) return true;
  return false;
}

function inWater(x, y) {
  return x < 160 || x > 4640 || y > 3440;
}

function collideBuildings(world, c) {
  let hit = false;
  for (const b of world.buildings) {
    if (c.x + c.r < b.x || c.x - c.r > b.x + b.w || c.y + c.r < b.y || c.y - c.r > b.y + b.h) continue;
    if (circleRectResolve(c, b)) hit = true;
  }
  return hit;
}

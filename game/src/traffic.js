// Traffic cars and pedestrians for Solmar Bay. Cars follow the road grid
// and turn at intersections; pedestrians stroll the sidewalks and scatter
// from gunfire.
const CAR_COLORS = ['#c94f43', '#4a7fb5', '#d8b13c', '#7a9a5b', '#8a6fb5', '#d8d8d8', '#3a3a3a', '#e08a3c'];
const CAR_TYPES = [
  { name: 'Sedan', max: 520, accel: 480, len: 46, wid: 22 },
  { name: 'Sports', max: 720, accel: 640, len: 48, wid: 22 },
  { name: 'Truck', max: 420, accel: 360, len: 62, wid: 26 },
  { name: 'Taxi', max: 540, accel: 500, len: 46, wid: 22 },
  { name: 'Van', max: 460, accel: 400, len: 54, wid: 24 }
];

function makeTrafficCar(world, rng, near) {
  const vertical = rng.chance(0.5);
  const road = vertical ? rng.pick(world.roadsV) : rng.pick(world.roadsH);
  const along = rng.range(300, vertical ? WORLD_H - 400 : WORLD_W - 400);
  const dir = rng.chance(0.5) ? 1 : -1;
  const type = rng.pick(CAR_TYPES);
  return {
    x: vertical ? road + (dir > 0 ? 16 : -16) : along,
    y: vertical ? along : road + (dir > 0 ? 16 : -16),
    angle: vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
    speed: rng.range(150, 260),
    type: type, color: rng.pick(CAR_COLORS),
    vertical: vertical, dir: dir, taxi: type.name === 'Taxi',
    hp: 100, brake: 0
  };
}

function spawnTraffic(world, rng, n, near) {
  const cars = [];
  for (let i = 0; i < n; i++) cars.push(makeTrafficCar(world, rng, near));
  return cars;
}

function updateTrafficCar(c, dt, world, player, rng) {
  // Slow down if something is right ahead.
  let target = c.speed;
  const aheadX = c.x + Math.cos(c.angle) * 60;
  const aheadY = c.y + Math.sin(c.angle) * 60;
  if (player.car && dist2(aheadX, aheadY, player.car.x, player.car.y) < 70 * 70) target = 0;
  if (player.onFoot && dist2(aheadX, aheadY, player.x, player.y) < 60 * 60) target = 0;
  c.speed = lerp(c.speed, target, clamp(dt * 2, 0, 1));
  c.x += Math.cos(c.angle) * c.speed * dt;
  c.y += Math.sin(c.angle) * c.speed * dt;
  // At an intersection, sometimes turn onto the crossing road.
  const nearV = world.roadsV.find(rx => Math.abs(c.x - rx) < 14);
  const nearH = world.roadsH.find(ry => Math.abs(c.y - ry) < 14);
  if (nearV !== undefined && nearH !== undefined && rng.chance(dt * 0.5)) {
    const turnV = rng.chance(0.5);
    if (turnV && !c.vertical) {
      c.vertical = true;
      c.dir = rng.chance(0.5) ? 1 : -1;
      c.angle = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      c.x = nearV + (c.dir > 0 ? 16 : -16);
      c.y = nearH;
    } else if (!turnV && c.vertical) {
      c.vertical = false;
      c.dir = rng.chance(0.5) ? 1 : -1;
      c.angle = c.dir > 0 ? 0 : Math.PI;
      c.y = nearH + (c.dir > 0 ? 16 : -16);
      c.x = nearV;
    }
  }
  // Wrap around the map edges so traffic never runs dry.
  if (c.x < 200) { c.x = 200; c.angle = 0; c.vertical = false; c.dir = 1; }
  if (c.x > 4600) { c.x = 4600; c.angle = Math.PI; c.vertical = false; c.dir = -1; }
  if (c.y < 200) { c.y = 200; c.angle = Math.PI / 2; c.vertical = true; c.dir = 1; }
  if (c.y > 3400) { c.y = 3400; c.angle = -Math.PI / 2; c.vertical = true; c.dir = -1; }
}

function updateTraffic(cars, dt, world, player, rng, playerPos) {
  for (const c of cars) updateTrafficCar(c, dt, world, player, rng);
  // Keep cars near the player: respawn ones that drifted far away.
  for (let i = 0; i < cars.length; i++) {
    if (dist2(cars[i].x, cars[i].y, playerPos.x, playerPos.y) > 1600 * 1600) {
      cars[i] = makeTrafficCar(world, rng);
      // Place the respawn on a road near the player.
      const a = rng.range(0, Math.PI * 2);
      const d = rng.range(500, 900);
      cars[i].x = clamp(playerPos.x + Math.cos(a) * d, 220, 4580);
      cars[i].y = clamp(playerPos.y + Math.sin(a) * d, 220, 3380);
    }
  }
}

function makePed(world, rng) {
  const vertical = rng.chance(0.5);
  const road = vertical ? rng.pick(world.roadsV) : rng.pick(world.roadsH);
  const along = rng.range(300, vertical ? WORLD_H - 400 : WORLD_W - 400);
  const side = rng.chance(0.5) ? -1 : 1;
  return {
    x: vertical ? road + side * (ROAD_W / 2 + 14) : along,
    y: vertical ? along : road + side * (ROAD_W / 2 + 14),
    angle: rng.range(0, Math.PI * 2),
    speed: rng.range(40, 80),
    color: rng.pick(['#e08a5b', '#5b8a6a', '#b56a8a', '#6a7ab5', '#c9a86a', '#8a5b6a']),
    flee: 0, fx: 0, fy: 0
  };
}

function updatePeds(peds, dt, world, rng, playerPos, gunshot) {
  for (const p of peds) {
    if (gunshot && dist2(p.x, p.y, gunshot.x, gunshot.y) < 500 * 500) {
      p.flee = 2.5;
      const a = angTo(gunshot.x, gunshot.y, p.x, p.y);
      p.fx = Math.cos(a); p.fy = Math.sin(a);
    }
    if (p.flee > 0) {
      p.flee -= dt;
      p.x += p.fx * 220 * dt;
      p.y += p.fy * 220 * dt;
    } else {
      p.x += Math.cos(p.angle) * p.speed * dt;
      p.y += Math.sin(p.angle) * p.speed * dt;
      if (rng.chance(dt * 0.15)) p.angle += rng.range(-1.2, 1.2);
    }
    p.x = clamp(p.x, 200, 4600);
    p.y = clamp(p.y, 200, 3400);
  }
}

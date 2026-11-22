// Wanted system and Solmar Bay PD. Heat 0-100 maps to 0-5 stars; cruisers
// ram the player's car, foot cops chase on foot and shoot at 3+ stars.
const STAR_NAMES = ['Clean', 'One Star', 'Two Stars', 'Three Stars', 'Four Stars', 'Five Stars'];

function heatToStars(heat) {
  if (heat < 20) return 0;
  if (heat < 40) return 1;
  if (heat < 60) return 2;
  if (heat < 80) return 3;
  if (heat < 95) return 4;
  return 5;
}

function makeCopCar(world, rng, near) {
  const a = rng.range(0, Math.PI * 2);
  const d = rng.range(450, 750);
  return {
    kind: 'car',
    x: clamp(near.x + Math.cos(a) * d, 240, 4560),
    y: clamp(near.y + Math.sin(a) * d, 240, 3360),
    angle: rng.range(0, Math.PI * 2),
    speed: 0, hp: 100,
    color: '#1c2733', siren: true
  };
}

function makeFootCop(world, rng, near) {
  const a = rng.range(0, Math.PI * 2);
  const d = rng.range(250, 500);
  return {
    kind: 'foot',
    x: clamp(near.x + Math.cos(a) * d, 240, 4560),
    y: clamp(near.y + Math.sin(a) * d, 240, 3360),
    angle: 0, speed: 0, hp: 100,
    color: '#1c2733', shootCd: 0
  };
}

// Keep cop numbers matched to the wanted level.
function maintainCops(cops, stars, world, rng, near) {
  const wantCars = stars >= 1 ? Math.min(stars, 4) : 0;
  const wantFoot = stars >= 2 ? Math.min(stars - 1, 3) : 0;
  let cars = 0, foot = 0;
  for (const c of cops) { if (c.kind === 'car') cars++; else foot++; }
  while (cars < wantCars) { cops.push(makeCopCar(world, rng, near)); cars++; }
  while (foot < wantFoot) { cops.push(makeFootCop(world, rng, near)); foot++; }
  while (cars > wantCars) {
    const idx = cops.findIndex(c => c.kind === 'car');
    if (idx < 0) break;
    cops.splice(idx, 1); cars--;
  }
  while (foot > wantFoot) {
    const idx = cops.findIndex(c => c.kind === 'foot');
    if (idx < 0) break;
    cops.splice(idx, 1); foot--;
  }
}

function updateCopCar(c, dt, world, player, playerPos, onHit) {
  const target = angTo(c.x, c.y, playerPos.x, playerPos.y);
  const diff = angDiff(c.angle, target);
  const maxSpeed = 640;
  c.speed = lerp(c.speed, maxSpeed, clamp(dt * 0.8, 0, 1));
  c.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
  const nx = c.x + Math.cos(c.angle) * c.speed * dt;
  const ny = c.y + Math.sin(c.angle) * c.speed * dt;
  c.x = nx; c.y = ny;
  // Buildings slow a pursuing cruiser down instead of letting it clip.
  const probe = { x: c.x, y: c.y, r: 24 };
  if (collideBuildings(world, probe)) {
    c.x = probe.x; c.y = probe.y;
    c.speed *= 0.4;
  }
  // Ram the player's car.
  if (player.car && dist2(c.x, c.y, player.car.x, player.car.y) < 52 * 52) {
    const push = angTo(c.x, c.y, player.car.x, player.car.y);
    player.car.x += Math.cos(push) * 60 * dt * 4;
    player.car.y += Math.sin(push) * 60 * dt * 4;
    player.car.speed *= (1 - dt * 1.5);
    player.hp = Math.max(0, player.hp - 6 * dt);
    onHit && onHit('ram');
  }
}

function updateFootCop(c, dt, world, player, playerPos, onShoot) {
  const d = dist(c.x, c.y, playerPos.x, playerPos.y);
  const target = angTo(c.x, c.y, playerPos.x, playerPos.y);
  c.angle = target;
  if (player.onFoot && d < 30) {
    // Caught on foot: handled by the caller via c.touch.
    c.touch = (c.touch || 0) + dt;
  } else {
    c.touch = 0;
  }
  const spd = 260;
  c.x += Math.cos(c.angle) * spd * dt;
  c.y += Math.sin(c.angle) * spd * dt;
  const probe = { x: c.x, y: c.y, r: 14 };
  if (collideBuildings(world, probe)) { c.x = probe.x; c.y = probe.y; }
  c.shootCd -= dt;
  if (c.shootCd <= 0 && d < 320 && d > 60 && !player.onFoot) {
    c.shootCd = 1.1;
    onShoot && onShoot(c);
  }
}

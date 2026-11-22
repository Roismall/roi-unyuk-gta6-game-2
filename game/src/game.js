// Solmar Bay core: state, input, player/car physics, combat, taxi fares,
// coins, shops, wanted heat, mission steps, save/load, screenshot staging.
const SAVE_KEY = 'solmarbay-save-v1';
const RANKS = [
  { at: 0, name: 'Rookie' },
  { at: 500, name: 'Hustler' },
  { at: 1500, name: 'Wheelman' },
  { at: 4000, name: 'Outlaw' },
  { at: 8000, name: 'Kingpin of the Bay' }
];

function rankFor(lifetime) {
  let r = RANKS[0].name;
  for (const k of RANKS) if (lifetime >= k.at) r = k.name;
  return r;
}

function freshPlayer() {
  return {
    x: 1000, y: 1900, angle: 0, aim: 0,
    onFoot: true, hp: 100, cash: 0, lifetime: 0,
    weapon: 'Pistol', hasScatter: false,
    ammo: 36, scatterAmmo: 0,
    rank: 'Rookie', car: null, speed: 0
  };
}

function newState(seed) {
  const world = buildCity(seed);
  return {
    seed: seed,
    time: 0,
    mode: 'title',
    world: world,
    rng: makeRng((seed * 7919 + 13) >>> 0),
    runRng: makeRng((Date.now() % 2147483647) >>> 0),
    player: freshPlayer(),
    traffic: [],
    peds: [],
    cops: [],
    heat: 0, stars: 0, unseen: 0, bustTimer: 0,
    job: 0, step: 0,
    coinsJob: 0, faresDone: 0, cpIdx: 0, holdLeft: 0,
    taxiFare: null, missionTruck: null,
    camera: { x: 1000, y: 1900 },
    keys: {}, mouse: { x: 640, y: 360, down: false },
    toasts: [],
    hasSave: false,
    shopKind: null,
    bustedLoss: 0,
    shotFx: null,
    gunshot: null,
    saveTimer: 0,
    startedAt: 0
  };
}

let S = newState(7);

function toast(text) {
  S.toasts.push({ text: text, life: 3 });
  if (S.toasts.length > 4) S.toasts.shift();
}

function addHeat(n) {
  S.heat = clamp(S.heat + n, 0, 100);
  const ns = heatToStars(S.heat);
  if (ns > S.stars) {
    S.stars = ns;
    toast('Wanted level: ' + STAR_NAMES[ns]);
  }
}

function saveGame() {
  try {
    const data = {
      cash: S.player.cash, lifetime: S.player.lifetime,
      job: S.job, coins: S.world.coins.filter(c => c.taken).map(c => c.id),
      ammo: S.player.ammo, scatterAmmo: S.player.scatterAmmo,
      hasScatter: S.player.hasScatter, weapon: S.player.weapon,
      station: AudioSys.station
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    S.hasSave = true;
  } catch (e) { /* storage unavailable: play on without saving */ }
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

function applySave(data) {
  S.player.cash = data.cash || 0;
  S.player.lifetime = data.lifetime || 0;
  S.player.rank = rankFor(S.player.lifetime);
  S.job = Math.min(data.job || 0, JOBS.length - 1);
  S.step = 0;
  for (const id of data.coins || []) {
    const c = S.world.coins.find(k => k.id === id);
    if (c) c.taken = true;
  }
  S.player.ammo = data.ammo !== undefined ? data.ammo : 36;
  S.player.scatterAmmo = data.scatterAmmo || 0;
  S.player.hasScatter = !!data.hasScatter;
  S.player.weapon = data.weapon || 'Pistol';
  if (data.station !== undefined) AudioSys.station = data.station;
}

function startJob(i) {
  S.job = i;
  S.step = 0;
  S.coinsJob = 0;
  S.faresDone = 0;
  S.cpIdx = 0;
  S.holdLeft = 0;
  S.taxiFare = null;
  S.missionTruck = null;
  S.mode = 'brief';
}

function completeJob() {
  const job = JOBS[S.job];
  S.player.cash += job.reward;
  S.player.lifetime += job.reward;
  S.player.rank = rankFor(S.player.lifetime);
  AudioSys.cash();
  toast(job.title + ' complete! +$' + job.reward);
  saveGame();
  if (S.job >= JOBS.length - 1) {
    S.mode = 'win';
    AudioSys.win();
  } else {
    S.mode = 'complete';
  }
}

function advanceStep() {
  S.step++;
  S.coinsJob = 0; S.faresDone = 0; S.cpIdx = 0; S.holdLeft = 0;
  S.taxiFare = null;
  const job = JOBS[S.job];
  if (S.step >= job.steps.length) completeJob();
}

function currentStep() {
  return JOBS[S.job].steps[S.step];
}

function respawn(reason) {
  S.bustedLoss = Math.floor(S.player.cash * 0.2);
  S.player.cash -= S.bustedLoss;
  S.player.hp = 100;
  S.heat = 0; S.stars = 0; S.cops = [];
  S.player.car = null;
  S.player.onFoot = true;
  const m = S.world.landmarks.motel;
  S.player.x = m.x; S.player.y = m.y + 80;
  S.camera.x = S.player.x; S.camera.y = S.player.y;
  startJob(S.job); // restarts the current job at step 0
  S.mode = reason; // 'busted' or 'wasted'
  AudioSys.busted();
  AudioSys.setSiren(false);
  saveGame();
}

// ---- Cars ----
function spawnPlayerCar(typeName, x, y, color) {
  const type = CAR_TYPES.find(t => t.name === typeName) || CAR_TYPES[0];
  return { x: x, y: y, angle: -Math.PI / 2, speed: 0, type: type, color: color || '#c94f43', hp: 100, taxi: typeName === 'Taxi' };
}

function enterCar(car) {
  S.player.car = car;
  S.player.onFoot = false;
  S.player.x = car.x; S.player.y = car.y;
}

function exitCar() {
  if (!S.player.car) return;
  const car = S.player.car;
  car.speed = 0;
  const a = car.angle + Math.PI / 2;
  S.player.x = car.x + Math.cos(a) * 30;
  S.player.y = car.y + Math.sin(a) * 30;
  S.player.car = null;
  S.player.onFoot = true;
}

function nearestCar(maxD) {
  let best = null, bd = maxD * maxD;
  for (const c of S.traffic) {
    const d = dist2(S.player.x, S.player.y, c.x, c.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

function stealCar() {
  const car = nearestCar(70);
  if (!car) return false;
  const idx = S.traffic.indexOf(car);
  if (idx >= 0) S.traffic.splice(idx, 1);
  enterCar(car);
  addHeat(12);
  toast('Car stolen! The owner called the cops.');
  return true;
}

function interact() {
  // Shops first (on foot near a shop door).
  if (S.player.onFoot) {
    const g = S.world.landmarks.gunshop;
    if (dist(S.player.x, S.player.y, g.x, g.y) < 90) { S.shopKind = 'gun'; S.mode = 'shop'; return; }
    const gr = S.world.landmarks.garage;
    if (dist(S.player.x, S.player.y, gr.x, gr.y) < 90) { S.shopKind = 'garage'; S.mode = 'shop'; return; }
  }
  if (S.player.car) { exitCar(); return; }
  stealCar();
}

function shoot() {
  if (!S.player.onFoot) return;
  const p = S.player;
  if (p.weapon === 'Pistol' && p.ammo <= 0) { toast('No pistol ammo — buy more at Iron Works'); return; }
  if (p.weapon === 'Scattergun' && p.scatterAmmo <= 0) { toast('No shells — buy more at Iron Works'); return; }
  if (p.weapon === 'Pistol') p.ammo--; else p.scatterAmmo--;
  AudioSys.shot();
  const range = 430;
  const spread = p.weapon === 'Scattergun' ? 0.3 : 0.06;
  const aim = p.aim + (S.runRng.range(-spread, spread));
  const x2 = p.x + Math.cos(aim) * range;
  const y2 = p.y + Math.sin(aim) * range;
  S.shotFx = { x1: p.x, y1: p.y, x2: x2, y2: y2, t: 0.08 };
  S.gunshot = { x: p.x, y: p.y };
  // Find the closest target inside the cone.
  let best = null, bd = range * range, isCop = false;
  const consider = (x, y, ref, cop) => {
    const d = dist2(p.x, p.y, x, y);
    if (d > bd) return;
    const a = angTo(p.x, p.y, x, y);
    if (Math.abs(angDiff(aim, a)) > 0.4) return;
    bd = d; best = ref; isCop = cop;
  };
  for (const c of S.traffic) consider(c.x, c.y, { kind: 'car', ref: c }, false);
  for (const c of S.cops) consider(c.x, c.y, { kind: 'cop', ref: c }, true);
  for (const pd of S.peds) consider(pd.x, pd.y, { kind: 'ped', ref: pd }, false);
  if (best) {
    const dmg = p.weapon === 'Scattergun' ? 60 : 34;
    if (best.kind === 'car') {
      best.ref.hp -= dmg;
      if (best.ref.hp <= 0) { best.ref.speed = 0; best.ref.dead = true; }
      addHeat(8);
    } else if (best.kind === 'cop') {
      best.ref.hp -= dmg;
      addHeat(10);
      if (best.ref.hp <= 0) {
        const idx = S.cops.indexOf(best.ref);
        if (idx >= 0) S.cops.splice(idx, 1);
        addHeat(15);
      }
    } else {
      // Pedestrian hit: they go down and stay down.
      best.ref.down = true;
      best.ref.speed = 0;
      addHeat(15);
      toast('You hit a pedestrian! The city saw that.');
    }
  }
}

function buyShop(n) {
  const p = S.player;
  if (S.shopKind === 'gun') {
    if (n === 1 && p.cash >= 40) { p.cash -= 40; p.ammo += 12; toast('Bought 12 pistol rounds'); }
    else if (n === 2 && p.cash >= 60) { p.cash -= 60; p.scatterAmmo += 6; toast('Bought 6 shells'); }
    else if (n === 3 && !p.hasScatter && p.cash >= 300) { p.cash -= 300; p.hasScatter = true; p.weapon = 'Scattergun'; p.scatterAmmo += 6; toast('Scattergun bought! Press 2 to equip'); }
    else toast('Not enough cash, or already owned');
  } else {
    if (n === 1 && p.car && p.cash >= 80) { p.cash -= 80; p.car.hp = 100; toast('Car repaired'); }
    else if (n === 2 && p.car && p.cash >= 50) {
      p.cash -= 50;
      p.car.color = '#' + Math.floor(S.runRng.next() * 0xffffff).toString(16).padStart(6, '0');
      toast('Fresh paint job!');
    } else toast('Need a car here, or not enough cash');
  }
  AudioSys.cash();
}

// ---- Taxi fares ----
function spawnFare() {
  const lm = S.world.landmarks;
  const spots = [lm.motel, lm.casino, lm.beach, lm.docks, lm.garage, lm.gunshop];
  const pick = spots[S.runRng.int(0, spots.length - 1)];
  const drop = spots[S.runRng.int(0, spots.length - 1)];
  S.taxiFare = { x: pick.x + S.runRng.range(-60, 60), y: pick.y + S.runRng.range(-60, 60), dx: drop.x, dy: drop.y, kind: 'pickup' };
}

function updateTaxi(dt) {
  const step = currentStep();
  if (!step || step.type !== 'taxi') return;
  if (!S.player.car || !S.player.car.taxi) return;
  if (!S.taxiFare) { spawnFare(); return; }
  const f = S.taxiFare;
  if (f.kind === 'pickup' && dist(S.player.x, S.player.y, f.x, f.y) < 70) {
    S.taxiFare = { x: f.dx, y: f.dy, dx: 0, dy: 0, kind: 'dropoff' };
    toast('Rider aboard — take them to the marker');
  } else if (f.kind === 'dropoff' && dist(S.player.x, S.player.y, f.x, f.y) < 80) {
    const fare = 40 + S.runRng.int(0, 40);
    S.player.cash += fare;
    S.player.lifetime += fare;
    S.player.rank = rankFor(S.player.lifetime);
    S.faresDone++;
    AudioSys.cash();
    toast('Fare complete! +$' + fare);
    S.taxiFare = null;
    if (S.faresDone >= step.n) advanceStep();
  }
}

// ---- Mission step checks ----
function updateMission(dt) {
  const job = JOBS[S.job];
  if (!job || S.mode !== 'play') return;
  const step = job.steps[S.step];
  if (!step) return;
  if (step.type === 'steal') {
    if (S.player.car) advanceStep();
  } else if (step.type === 'taxiCar') {
    if (S.player.car && S.player.car.taxi) advanceStep();
  } else if (step.type === 'goto' || step.type === 'deliver') {
    const lm = S.world.landmarks[step.pos];
    const needCar = step.type === 'deliver';
    if (lm && dist(S.player.x, S.player.y, lm.x, lm.y) < step.r && (!needCar || S.player.car)) advanceStep();
  } else if (step.type === 'stealType') {
    if (S.missionTruck && S.player.car === S.missionTruck) advanceStep();
  } else if (step.type === 'stars') {
    if (S.stars >= step.n) advanceStep();
  } else if (step.type === 'lose') {
    if (S.stars === 0 && S.heat < 5) advanceStep();
  } else if (step.type === 'escape') {
    const lm = S.world.landmarks[step.pos];
    if (lm && dist(S.player.x, S.player.y, lm.x, lm.y) < step.r) {
      if (S.job === JOBS.length - 1) { S.heat = 0; S.stars = 0; }
      advanceStep();
    }
  } else if (step.type === 'collect') {
    if (S.coinsJob >= step.n) advanceStep();
  } else if (step.type === 'checkpoints') {
    const cp = BEACH_CHECKPOINTS[S.cpIdx];
    if (cp && dist(S.player.x, S.player.y, cp.x, cp.y) < 90) {
      S.cpIdx++;
      AudioSys.pickup();
      if (S.cpIdx >= BEACH_CHECKPOINTS.length) advanceStep();
      else toast('Checkpoint ' + S.cpIdx + '/5');
    }
  } else if (step.type === 'hold') {
    const lm = S.world.landmarks.casino;
    const near = dist(S.player.x, S.player.y, lm.x, lm.y) < step.r || dist(S.player.x, S.player.y, lm.x, lm.y) < 130;
    if (near && S.keys['KeyE']) {
      S.holdLeft -= dt;
      if (S.holdLeft <= 0) {
        addHeat(40);
        toast('Vault cracked! Four stars — RUN!');
        advanceStep();
      }
    } else if (!near) {
      S.holdLeft = step.secs;
    }
  }
  // Arm the hold timer when the step starts.
  if (step.type === 'hold' && !S.holdArmed) {
    S.holdLeft = step.secs;
    S.holdArmed = true;
  } else if (step.type !== 'hold') {
    S.holdArmed = false;
  }
  // Spawn the mission truck when the stealType step becomes active.
  if (step.type === 'stealType' && !S.missionTruck) {
    const d = S.world.landmarks.docks;
    const truck = spawnPlayerCar('Truck', d.x + 80, d.y + 40, '#c9a13c');
    S.traffic.push(truck);
    S.missionTruck = truck;
  }
}

// ---- Main update ----
function updatePlay(dt) {
  const p = S.player;
  // Aim follows the mouse.
  const cam = S.camera;
  const wx = S.mouse.x + cam.x - VIEW_W / 2;
  const wy = S.mouse.y + cam.y - VIEW_H / 2;
  p.aim = angTo(p.x, p.y, wx, wy);

  // Movement.
  const k = S.keys;
  const up = k['KeyW'] || k['ArrowUp'];
  const down = k['KeyS'] || k['ArrowDown'];
  const left = k['KeyA'] || k['ArrowLeft'];
  const right = k['KeyD'] || k['ArrowRight'];
  const sprint = k['ShiftLeft'] || k['ShiftRight'];
  if (p.car) {
    const car = p.car;
    const maxSpd = car.type.max;
    if (up) car.speed += car.type.accel * dt;
    if (down) car.speed -= car.type.accel * 0.8 * dt;
    if (!up && !down) car.speed = lerp(car.speed, 0, clamp(dt * 1.2, 0, 1));
    car.speed = clamp(car.speed, -maxSpd * 0.45, maxSpd);
    const steer = (left ? -1 : 0) + (right ? 1 : 0);
    const dir = car.speed >= 0 ? 1 : -1;
    const grip = onRoad(S.world, car.x, car.y) ? 1 : 0.55;
    car.angle += steer * 3.0 * dt * clamp(Math.abs(car.speed) / 180, 0, 1) * dir * grip;
    // Hard turns scrub speed, so the car can actually make city corners.
    if (steer !== 0 && Math.abs(car.speed) > 300) car.speed *= (1 - 0.35 * dt);
    if (k['Space']) car.speed = lerp(car.speed, 0, clamp(dt * 4, 0, 1));
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    car.x = clamp(car.x, 170, 4630);
    car.y = clamp(car.y, 170, 3430);
    const probe = { x: car.x, y: car.y, r: 24 };
    const impact = Math.abs(car.speed);
    if (collideBuildings(S.world, probe)) {
      car.x = probe.x; car.y = probe.y;
      if (impact > 300) { AudioSys.crash(); car.hp -= 5; }
      car.speed *= 0.45;
    }
    // Bump traffic cars.
    for (const t of S.traffic) {
      if (t.dead) continue;
      const d2 = dist2(car.x, car.y, t.x, t.y);
      if (d2 < 50 * 50) {
        const a = angTo(car.x, car.y, t.x, t.y);
        t.x += Math.cos(a) * 40 * dt * 4;
        t.y += Math.sin(a) * 40 * dt * 4;
        car.speed *= (1 - dt * 2);
        if (impact > 350) AudioSys.crash();
      }
    }
    p.x = car.x; p.y = car.y;
    AudioSys.setEngine(Math.abs(car.speed) / car.type.max, true);
  } else {
    const spd = sprint ? 340 : 210;
    let mx = (right ? 1 : 0) - (left ? 1 : 0);
    let my = (down ? 1 : 0) - (up ? 1 : 0);
    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      mx /= len; my /= len;
      p.x += mx * spd * dt;
      p.y += my * spd * dt;
      p.angle = Math.atan2(my, mx);
    }
    p.x = clamp(p.x, 170, 4630);
    p.y = clamp(p.y, 170, 3430);
    const probe = { x: p.x, y: p.y, r: 13 };
    if (collideBuildings(S.world, probe)) { p.x = probe.x; p.y = probe.y; }
    AudioSys.setEngine(0, false);
  }

  // Coins.
  for (const c of S.world.coins) {
    if (!c.taken && dist2(p.x, p.y, c.x, c.y) < 34 * 34) {
      c.taken = true;
      p.cash += 25;
      p.lifetime += 25;
      p.rank = rankFor(p.lifetime);
      S.coinsJob++;
      AudioSys.pickup();
      toast('Sun coin! +$25');
    }
  }

  // Traffic, peds, cops.
  updateTraffic(S.traffic, dt, S.world, p, S.runRng, p);
  updatePeds(S.peds, dt, S.world, S.runRng, p, S.gunshot);
  S.gunshot = null;
  const near = { x: p.x, y: p.y };
  maintainCops(S.cops, S.stars, S.world, S.runRng, near);
  for (const c of S.cops) {
    if (c.kind === 'car') updateCopCar(c, dt, S.world, p, near, () => AudioSys.crash());
    else updateFootCop(c, dt, S.world, p, near, () => { p.hp = Math.max(0, p.hp - 4); });
  }
  // Busted on foot: a foot cop holding contact.
  for (const c of S.cops) {
    if (c.kind === 'foot' && c.touch && c.touch > 1.2 && p.onFoot) {
      respawn('busted');
      return;
    }
  }
  // Busted in car: stopped with a cruiser on the bumper.
  if (p.car && Math.abs(p.car.speed) < 30) {
    let close = false;
    for (const c of S.cops) {
      if (c.kind === 'car' && dist2(c.x, c.y, p.car.x, p.car.y) < 75 * 75) close = true;
    }
    S.bustTimer = close ? S.bustTimer + dt : 0;
    if (S.bustTimer > 2.5) { respawn('busted'); return; }
  } else {
    S.bustTimer = 0;
  }
  // Wasted.
  if (p.hp <= 0) { respawn('wasted'); return; }
  // Slow health regen when clean.
  if (S.stars === 0 && p.hp < 100) p.hp = Math.min(100, p.hp + 3 * dt);

  // Wanted heat decay when unseen.
  let seen = false;
  for (const c of S.cops) {
    if (dist2(c.x, c.y, p.x, p.y) < 420 * 420) { seen = true; break; }
  }
  if (!seen) {
    S.unseen += dt;
    if (S.unseen > 4) {
      S.heat = Math.max(0, S.heat - 3 * dt);
      const ns = heatToStars(S.heat);
      if (ns < S.stars) { S.stars = ns; if (ns === 0) toast('You lost the heat. Clean.'); }
    }
  } else {
    S.unseen = 0;
  }
  AudioSys.setSiren(S.stars > 0);

  // Taxi + missions.
  updateTaxi(dt);
  updateMission(dt);

  // Camera follows.
  S.camera.x = lerp(S.camera.x, p.x, clamp(dt * 4, 0, 1));
  S.camera.y = lerp(S.camera.y, p.y, clamp(dt * 4, 0, 1));

  // Toasts + shot fx timers.
  for (const t of S.toasts) t.life -= dt;
  S.toasts = S.toasts.filter(t => t.life > 0);
  if (S.shotFx) { S.shotFx.t -= dt; if (S.shotFx.t <= 0) S.shotFx = null; }

  // Autosave.
  S.saveTimer += dt;
  if (S.saveTimer > 30) { S.saveTimer = 0; saveGame(); }

  AudioSys.tickRadio();
}

// ---- Screenshot staging (?shot=) ----
function applyShot(shot, seed) {
  S = newState(seed || 7);
  S.traffic = spawnTraffic(S.world, S.rng, 14);
  S.peds = [];
  for (let i = 0; i < 24; i++) S.peds.push(makePed(S.world, S.rng));
  if (shot === 'start') {
    S.mode = 'title';
    return;
  }
  if (shot === 'drive') {
    const car = spawnPlayerCar('Sports', 2000, 1000, '#c94f43');
    enterCar(car);
    S.job = 0; S.step = 1;
    S.mode = 'play';
    S.camera.x = S.player.x; S.camera.y = S.player.y;
    return;
  }
  if (shot === 'chase') {
    const car = spawnPlayerCar('Sports', 2000, 1800, '#e08a3c');
    car.speed = 480;
    enterCar(car);
    S.heat = 72; S.stars = 3;
    S.job = 5; S.step = 1;
    for (let i = 0; i < 3; i++) S.cops.push(makeCopCar(S.world, S.rng, { x: 2000, y: 1800 }));
    S.mode = 'play';
    S.camera.x = S.player.x; S.camera.y = S.player.y;
    return;
  }
  if (shot === 'mission') {
    const d = S.world.landmarks.docks;
    const truck = spawnPlayerCar('Truck', d.x + 80, d.y + 40, '#c9a13c');
    S.traffic.push(truck);
    S.missionTruck = truck;
    S.player.x = d.x + 40; S.player.y = d.y + 120;
    S.job = 4; S.step = 0;
    S.mode = 'play';
    S.camera.x = S.player.x; S.camera.y = S.player.y;
    return;
  }
  S.mode = 'title';
}

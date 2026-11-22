// All canvas drawing for Solmar Bay: world, entities, HUD, minimap, menus.
const VIEW_W = 1280;
const VIEW_H = 720;

function drawWorld(ctx, S) {
  const cam = S.camera;
  const x0 = cam.x - VIEW_W / 2, y0 = cam.y - VIEW_H / 2;
  const x1 = x0 + VIEW_W, y1 = y0 + VIEW_H;
  ctx.save();
  // Ground: grass.
  ctx.fillStyle = '#7fae62';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Water bands (west, east, south seas).
  ctx.fillStyle = '#3f8fbf';
  ctx.fillRect(0, 0, Math.max(0, 160 - x0), VIEW_H);
  ctx.fillRect(Math.max(0, 4640 - x0), 0, VIEW_W, VIEW_H);
  ctx.fillRect(0, Math.max(0, 3440 - y0), VIEW_W, VIEW_H);
  // Sand bands.
  ctx.fillStyle = '#e8d39a';
  ctx.fillRect(Math.max(0, 160 - x0), Math.max(0, 3360 - y0), Math.min(4640 - x0, VIEW_W) - Math.max(0, 160 - x0), VIEW_H);
  ctx.fillRect(Math.max(0, 4560 - x0), 0, VIEW_W, VIEW_H);
  // Roads.
  ctx.fillStyle = '#3c3c42';
  for (const rx of S.world.roadsV) {
    if (rx < x0 - 60 || rx > x1 + 60) continue;
    ctx.fillRect(rx - ROAD_W / 2 - x0, 200 - y0, ROAD_W, 3240);
  }
  for (const ry of S.world.roadsH) {
    if (ry < y0 - 60 || ry > y1 + 60) continue;
    ctx.fillRect(200 - x0, ry - ROAD_W / 2 - y0, 4440, ROAD_W);
  }
  // Center dashes.
  ctx.fillStyle = '#d8d8c8';
  for (const rx of S.world.roadsV) {
    if (rx < x0 - 60 || rx > x1 + 60) continue;
    for (let y = 220; y < 3400; y += 80) ctx.fillRect(rx - 2 - x0, y - y0, 4, 40);
  }
  for (const ry of S.world.roadsH) {
    if (ry < y0 - 60 || ry > y1 + 60) continue;
    for (let x = 220; x < 4600; x += 80) ctx.fillRect(x - x0, ry - 2 - y0, 40, 4);
  }
  // Airstrip runway (northeast flat).
  ctx.fillStyle = '#55555c';
  ctx.fillRect(3900 - x0, 2900 - y0, 600, 90);
  ctx.fillStyle = '#e8e8e8';
  for (let x = 3950; x < 4480; x += 90) ctx.fillRect(x - x0, 2940 - y0, 40, 6);
  // Buildings.
  for (const b of S.world.buildings) {
    if (b.x > x1 || b.x + b.w < x0 || b.y > y1 || b.y + b.h < y0) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x - x0 + 6, b.y - y0 + 8, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x - x0, b.y - y0, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x - x0 + 5, b.y - y0 + 5, b.w - 10, b.h - 10);
    // Windows.
    ctx.fillStyle = 'rgba(200,225,255,0.75)';
    const cols = Math.max(1, Math.floor(b.w / 26));
    const rows = Math.max(1, Math.floor(b.h / 26));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if ((i * 7 + j * 3 + Math.floor(b.x)) % 4 === 0) continue;
        ctx.fillRect(b.x - x0 + 10 + i * 26, b.y - y0 + 10 + j * 26, 12, 12);
      }
    }
  }
  // Palms.
  for (const p of S.world.palms) {
    if (p.x < x0 - 40 || p.x > x1 + 40 || p.y < y0 - 40 || p.y > y1 + 40) continue;
    const px = p.x - x0, py = p.y - y0;
    ctx.strokeStyle = '#7a5a33';
    ctx.lineWidth = 4 * p.s;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 6 * p.s, py - 14 * p.s); ctx.stroke();
    ctx.fillStyle = '#3f8f4f';
    for (let f = 0; f < 5; f++) {
      const a = f * (Math.PI * 2 / 5) + 0.4;
      ctx.beginPath();
      ctx.ellipse(px + 6 * p.s + Math.cos(a) * 12 * p.s, py - 14 * p.s + Math.sin(a) * 8 * p.s, 12 * p.s, 5 * p.s, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Sun coins.
  for (const c of S.world.coins) {
    if (c.taken || c.x < x0 - 30 || c.x > x1 + 30 || c.y < y0 - 30 || c.y > y1 + 30) continue;
    const pulse = 1 + Math.sin(S.time * 4 + c.id) * 0.15;
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath(); ctx.arc(c.x - x0, c.y - y0, 11 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a87c1a';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('$', c.x - x0, c.y - y0 + 1);
  }
  ctx.restore();
}

function drawCar(ctx, x, y, angle, type, color, isPlayer, x0, y0) {
  ctx.save();
  ctx.translate(x - x0, y - y0);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-type.len / 2 + 3, -type.wid / 2 + 3, type.len, type.wid);
  // Wheels.
  ctx.fillStyle = '#181818';
  ctx.fillRect(-type.len / 2 + 6, -type.wid / 2 - 3, 12, 6);
  ctx.fillRect(-type.len / 2 + 6, type.wid / 2 - 3, 12, 6);
  ctx.fillRect(type.len / 2 - 18, -type.wid / 2 - 3, 12, 6);
  ctx.fillRect(type.len / 2 - 18, type.wid / 2 - 3, 12, 6);
  // Body.
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-type.len / 2, -type.wid / 2, type.len, type.wid, 7);
  ctx.fill();
  // Windshield + roof.
  ctx.fillStyle = 'rgba(180,220,240,0.9)';
  ctx.fillRect(type.len / 2 - 20, -type.wid / 2 + 3, 10, type.wid - 6);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-6, -type.wid / 2 + 3, 14, type.wid - 6);
  if (isPlayer) {
    ctx.strokeStyle = '#ffd94a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-type.len / 2 - 2, -type.wid / 2 - 2, type.len + 4, type.wid + 4, 8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawEntities(ctx, S) {
  const cam = S.camera;
  const x0 = cam.x - VIEW_W / 2, y0 = cam.y - VIEW_H / 2;
  // Mission marker.
  const mk = missionMarker(S);
  if (mk) {
    const mx = mk.x - x0, my = mk.y - y0;
    const bob = Math.sin(S.time * 3) * 6;
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath();
    ctx.moveTo(mx, my - 34 + bob); ctx.lineTo(mx + 12, my - 18 + bob);
    ctx.lineTo(mx, my - 6 + bob); ctx.lineTo(mx - 12, my - 18 + bob);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,217,74,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(mx, my, 26 + Math.sin(S.time * 3) * 5, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffd94a';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mk.label, mx, my - 44 + bob);
  }
  // Traffic.
  for (const c of S.traffic) drawCar(ctx, c.x, c.y, c.angle, c.type, c.color, false, x0, y0);
  // Police.
  for (const c of S.cops) {
    if (c.kind === 'car') {
      drawCar(ctx, c.x, c.y, c.angle, CAR_TYPES[0], '#1c2733', false, x0, y0);
      // Light bar.
      ctx.save();
      ctx.translate(c.x - x0, c.y - y0);
      ctx.rotate(c.angle);
      const blink = Math.floor(S.time * 6) % 2 === 0;
      ctx.fillStyle = blink ? '#ff2e2e' : '#2e6bff';
      ctx.fillRect(-4, -8, 8, 6);
      ctx.fillStyle = blink ? '#2e6bff' : '#ff2e2e';
      ctx.fillRect(-4, 2, 8, 6);
      ctx.restore();
    } else {
      ctx.fillStyle = '#1c2733';
      ctx.beginPath(); ctx.arc(c.x - x0, c.y - y0, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d8d8d8';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('PD', c.x - x0, c.y - y0);
    }
  }
  // Pedestrians.
  for (const p of S.peds) {
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x - x0, p.y - y0, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2c89a';
    ctx.beginPath(); ctx.arc(p.x - x0, p.y - y0 - 2, 4, 0, Math.PI * 2); ctx.fill();
  }
  // Player car or player on foot.
  if (S.player.car) {
    drawCar(ctx, S.player.car.x, S.player.car.y, S.player.car.angle, S.player.car.type, S.player.car.color, true, x0, y0);
  } else {
    const px = S.player.x - x0, py = S.player.y - y0;
    ctx.fillStyle = '#2e6bff';
    ctx.beginPath(); ctx.arc(px, py, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2c89a';
    ctx.beginPath(); ctx.arc(px, py - 2, 5, 0, Math.PI * 2); ctx.fill();
    // Aim direction.
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(S.player.aim) * 26, py + Math.sin(S.player.aim) * 26);
    ctx.stroke();
  }
  // Gunfire tracer (one frame).
  if (S.shotFx && S.shotFx.t > 0) {
    ctx.strokeStyle = '#ffe27a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(S.shotFx.x1 - x0, S.shotFx.y1 - y0);
    ctx.lineTo(S.shotFx.x2 - x0, S.shotFx.y2 - y0);
    ctx.stroke();
  }
  // Crosshair.
  if (!S.player.car && S.mode === 'play') {
    const mx = S.mouse.x, my = S.mouse.y;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(mx, my, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mx - 13, my); ctx.lineTo(mx - 5, my);
    ctx.moveTo(mx + 5, my); ctx.lineTo(mx + 13, my);
    ctx.moveTo(mx, my - 13); ctx.lineTo(mx, my - 5);
    ctx.moveTo(mx, my + 5); ctx.lineTo(mx, my + 13);
    ctx.stroke();
  }
}

function drawHUD(ctx, S) {
  // Top-left panel: cash, stars, health, weapon.
  ctx.fillStyle = 'rgba(10,14,20,0.62)';
  ctx.fillRect(12, 12, 300, 96);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('$' + Math.floor(S.player.cash).toLocaleString(), 24, 20);
  // Wanted stars.
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < S.stars ? '#ffd94a' : 'rgba(255,255,255,0.25)';
    const sx = 24 + i * 26, sy = 52;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + k * (Math.PI * 2 / 5);
      const r = k % 2 === 0 ? 10 : 4;
      const px = sx + Math.cos(a) * r, py = sy + Math.sin(a) * r;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  }
  // Health bar.
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(160, 52, 130, 12);
  ctx.fillStyle = S.player.hp > 40 ? '#5bd86a' : '#e04a3c';
  ctx.fillRect(160, 52, 130 * (S.player.hp / 100), 12);
  ctx.fillStyle = '#ffffff';
  ctx.font = '13px sans-serif';
  ctx.fillText(S.player.weapon + '  ' + S.player.ammo + ' ammo', 24, 82);
  // Rank + job.
  ctx.fillStyle = 'rgba(10,14,20,0.62)';
  ctx.fillRect(12, 116, 300, 30);
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(S.player.rank + '  •  ' + JOBS[S.job].title, 24, 124);
  // Objective.
  ctx.fillStyle = 'rgba(10,14,20,0.62)';
  const obj = missionText(S);
  ctx.fillRect(12, VIEW_H - 52, Math.min(900, 24 + obj.length * 7.5), 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = '15px sans-serif';
  ctx.fillText('» ' + obj, 24, VIEW_H - 40);
  // Speed + radio bottom-right.
  if (S.player.car) {
    ctx.fillStyle = 'rgba(10,14,20,0.62)';
    ctx.fillRect(VIEW_W - 212, VIEW_H - 52, 200, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(Math.abs(S.player.car.speed) * 0.18) + ' mph  •  ' + S.player.car.type.name, VIEW_W - 24, VIEW_H - 40);
    ctx.textAlign = 'left';
  }
  ctx.fillStyle = 'rgba(10,14,20,0.5)';
  ctx.fillRect(VIEW_W - 312, 12, 300, 24);
  ctx.fillStyle = '#cfe8ff';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(AudioSys.radioOn ? STATION_NAMES[AudioSys.station] : 'Radio off (R to change)', VIEW_W - 24, 18);
  ctx.textAlign = 'left';
  // Toasts.
  let ty = 160;
  for (const t of S.toasts) {
    ctx.globalAlpha = clamp(t.life, 0, 1);
    ctx.fillStyle = 'rgba(10,14,20,0.7)';
    ctx.fillRect(12, ty, 24 + t.text.length * 7.5, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.fillText(t.text, 24, ty + 8);
    ctx.globalAlpha = 1;
    ty += 36;
  }
  // Minimap.
  const mw = 200, mh = 150, mx = VIEW_W - mw - 12, my = 44;
  ctx.fillStyle = 'rgba(10,14,20,0.7)';
  ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
  ctx.fillStyle = '#2e4a2e';
  ctx.fillRect(mx, my, mw, mh);
  ctx.fillStyle = '#3f8fbf';
  ctx.fillRect(mx, my, 200 * 160 / WORLD_W, mh);
  ctx.fillRect(mx + mw - 200 * 160 / WORLD_W, my, 200 * 160 / WORLD_W, mh);
  ctx.fillRect(mx, my + mh - 150 * 160 / WORLD_H, mw, 150 * 160 / WORLD_H);
  ctx.fillStyle = '#555';
  for (const rx of S.world.roadsV) ctx.fillRect(mx + rx / WORLD_W * mw - 1, my, 2, mh);
  for (const ry of S.world.roadsH) ctx.fillRect(mx, my + ry / WORLD_H * mh, mw, 2);
  const mk = missionMarker(S);
  if (mk) {
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath(); ctx.arc(mx + mk.x / WORLD_W * mw, my + mk.y / WORLD_H * mh, 5, 0, Math.PI * 2); ctx.fill();
  }
  for (const c of S.cops) {
    ctx.fillStyle = c.kind === 'car' ? '#2e6bff' : '#7ab5ff';
    ctx.beginPath(); ctx.arc(mx + c.x / WORLD_W * mw, my + c.y / WORLD_H * mh, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(mx + S.player.x / WORLD_W * mw, my + S.player.y / WORLD_H * mh, 4, 0, Math.PI * 2); ctx.fill();
}

function drawCenterPanel(ctx, title, lines, foot) {
  ctx.fillStyle = 'rgba(5,8,14,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = 'rgba(16,22,32,0.92)';
  const w = 640, h = 120 + lines.length * 30 + 60;
  ctx.fillRect((VIEW_W - w) / 2, (VIEW_H - h) / 2, w, h);
  ctx.strokeStyle = '#ffd94a';
  ctx.lineWidth = 2;
  ctx.strokeRect((VIEW_W - w) / 2, (VIEW_H - h) / 2, w, h);
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW_W / 2, (VIEW_H - h) / 2 + 48);
  ctx.fillStyle = '#ffffff';
  ctx.font = '17px sans-serif';
  lines.forEach((ln, i) => ctx.fillText(ln, VIEW_W / 2, (VIEW_H - h) / 2 + 96 + i * 30));
  if (foot) {
    ctx.fillStyle = '#cfe8ff';
    ctx.font = '14px sans-serif';
    ctx.fillText(foot, VIEW_W / 2, (VIEW_H - h) / 2 + h - 24);
  }
  ctx.textAlign = 'left';
}

function drawTitle(ctx, S) {
  // Sunset gradient backdrop.
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, '#1c2a4a');
  g.addColorStop(0.55, '#c95f4a');
  g.addColorStop(1, '#f2a65b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Sun (off to the side so the title stays readable).
  ctx.fillStyle = '#ffd94a';
  ctx.beginPath(); ctx.arc(1060, 190, 72, 0, Math.PI * 2); ctx.fill();
  // Palm silhouettes.
  ctx.fillStyle = 'rgba(20,30,20,0.85)';
  ctx.fillRect(0, 560, VIEW_W, 160);
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 84px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SOLMAR BAY', VIEW_W / 2, 180);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('SUN, SAND & SIRENS', VIEW_W / 2, 224);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = '#e8e8e8';
  ctx.fillText('An open-world crime game — steal cars, dodge the Bay PD, run jobs for Vee', VIEW_W / 2, 330);
  const items = S.hasSave
    ? ['1 — Continue', '2 — New Game', '3 — How to Play']
    : ['1 — New Game', '2 — How to Play'];
  ctx.font = 'bold 22px sans-serif';
  items.forEach((it, i) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillText(it, VIEW_W / 2, 420 + i * 44);
  });
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#cfe8ff';
  ctx.fillText('WASD drive / walk • E enter car • Mouse aim, Click shoot • R radio • M mute • P pause', VIEW_W / 2, 600);
  ctx.textAlign = 'left';
}

function drawMenus(ctx, S) {
  if (S.mode === 'title') { drawTitle(ctx, S); return; }
  if (S.mode === 'brief') {
    const job = JOBS[S.job];
    drawCenterPanel(ctx, job.title, [job.giver, '', 'Reward: $' + job.reward], 'Press ENTER to start the job');
    return;
  }
  if (S.mode === 'pause') {
    drawCenterPanel(ctx, 'PAUSED', ['Cash $' + Math.floor(S.player.cash), 'Job: ' + JOBS[S.job].title, 'Rank: ' + S.player.rank], 'P / Esc resume • M mute • R radio');
    return;
  }
  if (S.mode === 'complete') {
    drawCenterPanel(ctx, 'JOB COMPLETE', [JOBS[S.job].title + ' — $' + JOBS[S.job].reward + ' earned', 'Total cash: $' + Math.floor(S.player.cash)], 'Press ENTER for the next job');
    return;
  }
  if (S.mode === 'busted') {
    drawCenterPanel(ctx, 'BUSTED', ['The Bay PD caught you.', 'You lost $' + Math.floor(S.bustedLoss) + ' and the job restarts.'], 'Press ENTER to get back out there');
    return;
  }
  if (S.mode === 'wasted') {
    drawCenterPanel(ctx, 'WASTED', ['Solmar Bay got the better of you.', 'You lost $' + Math.floor(S.bustedLoss) + ' and the job restarts.'], 'Press ENTER to get back out there');
    return;
  }
  if (S.mode === 'win') {
    drawCenterPanel(ctx, 'THE BIG SCORE — YOU WIN', ['Danny Cole walks away with the Venn Casino vault.', 'Final cash: $' + Math.floor(S.player.cash) + ' • Rank: ' + S.player.rank, 'Thanks for playing Solmar Bay!'], 'Press ENTER to keep cruising the city');
    return;
  }
  if (S.mode === 'shop') {
    const lines = S.shopKind === 'gun'
      ? ['Pistol ammo (12) — $40   [1]', 'Scattergun shells (6) — $60   [2]', 'Scattergun — $300   [3]']
      : ['Repair car — $80   [1]', 'Repaint car — $50   [2]'];
    drawCenterPanel(ctx, S.shopKind === 'gun' ? 'IRON WORKS GUN SHOP' : 'RICO’S GARAGE', lines.concat(['Cash: $' + Math.floor(S.player.cash)]), 'Press a number to buy • E / Esc to leave');
    return;
  }
  if (S.mode === 'howto') {
    drawCenterPanel(ctx, 'HOW TO PLAY', [
      'WASD / Arrows — walk or drive • E — enter / exit car, interact',
      'Shift — sprint • Space — handbrake • Mouse — aim • Click — shoot',
      'R — radio station • M — mute • P — pause',
      'Steal cars, run jobs for Vee, collect sun coins, dodge the PD.',
      'Get busted or wasted and you lose 20% of your cash.'
    ], 'Press ENTER to go back');
    return;
  }
}

// Boot + main loop + input for Solmar Bay.
(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = parseInt(params.get('seed') || '7', 10);

  function resize() {
    canvas.width = 1280;
    canvas.height = 720;
  }
  resize();

  // Input.
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    S.keys[e.code] = true;
    AudioSys.init();
    AudioSys.resume();
    handleKey(e.code);
  });
  window.addEventListener('keyup', (e) => { S.keys[e.code] = false; });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    S.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    S.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  });
  canvas.addEventListener('mousedown', (e) => {
    AudioSys.init();
    AudioSys.resume();
    if (S.mode === 'play' && S.player.onFoot) shoot();
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  function handleKey(code) {
    if (code === 'KeyM') { AudioSys.setMuted(!AudioSys.muted); toast(AudioSys.muted ? 'Muted' : 'Sound on'); return; }
    if (code === 'KeyR' && (S.mode === 'play' || S.mode === 'pause')) {
      const st = AudioSys.nextStation();
      toast('Radio: ' + STATION_NAMES[st]);
      return;
    }
    if (S.mode === 'title') {
      if (code === 'Digit1') {
        if (S.hasSave) { const d = loadSave(); if (d) { applySave(d); startJob(S.job); } else { startJob(0); } }
        else startJob(0);
      } else if (code === 'Digit2') {
        if (S.hasSave) { startJob(0); }
        else S.mode = 'howto';
      } else if (code === 'Digit3' && S.hasSave) {
        S.mode = 'howto';
      }
      return;
    }
    if (S.mode === 'howto') { if (code === 'Enter') S.mode = 'title'; return; }
    if (S.mode === 'brief') { if (code === 'Enter') { S.mode = 'play'; S.startedAt = S.time; } return; }
    if (S.mode === 'play') {
      if (code === 'KeyE') interact();
      if (code === 'KeyP' || code === 'Escape') S.mode = 'pause';
      if (code === 'Digit1') { S.player.weapon = 'Pistol'; }
      if (code === 'Digit2' && S.player.hasScatter) { S.player.weapon = 'Scattergun'; }
      return;
    }
    if (S.mode === 'pause') {
      if (code === 'KeyP' || code === 'Escape') S.mode = 'play';
      return;
    }
    if (S.mode === 'complete') {
      if (code === 'Enter') startJob(S.job + 1);
      return;
    }
    if (S.mode === 'busted' || S.mode === 'wasted') {
      if (code === 'Enter') S.mode = 'brief';
      return;
    }
    if (S.mode === 'win') {
      if (code === 'Enter') { S.mode = 'play'; }
      return;
    }
    if (S.mode === 'shop') {
      if (code === 'Digit1') buyShop(1);
      else if (code === 'Digit2') buyShop(2);
      else if (code === 'Digit3') buyShop(3);
      else if (code === 'KeyE' || code === 'Escape') S.mode = 'play';
      return;
    }
  }

  // Start state.
  const saved = loadSave();
  S.hasSave = !!saved;
  if (shot) {
    applyShot(shot, seed);
  } else {
    S.traffic = spawnTraffic(S.world, S.rng, 14);
    S.peds = [];
    for (let i = 0; i < 24; i++) S.peds.push(makePed(S.world, S.rng));
    S.mode = 'title';
  }

  // Expose a small handle for automated play-testing.
  window.SB = {
    state: () => S,
    version: 'solmar-bay-1',
    ready: false
  };

  let last = performance.now();
  let firstFrame = true;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    S.time += dt;
    if (S.mode === 'play') updatePlay(dt);
    // Draw.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (S.mode === 'title' || S.mode === 'howto') {
      drawMenus(ctx, S);
    } else {
      drawWorld(ctx, S);
      drawEntities(ctx, S);
      if (S.mode === 'play' || S.mode === 'pause' || S.mode === 'shop') drawHUD(ctx, S);
      if (S.mode !== 'play') drawMenus(ctx, S);
    }
    if (firstFrame) {
      firstFrame = false;
      window.SB.ready = true;
      document.title = 'Solmar Bay — ready';
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

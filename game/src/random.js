// Seeded random helpers for Solmar Bay. Every world layout comes from a
// fixed seed so the city is the same every load; live traffic uses a
// separate runtime stream seeded from the clock.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next: next,
    range: function (lo, hi) { return lo + next() * (hi - lo); },
    int: function (lo, hi) { return Math.floor(lo + next() * (hi - lo + 1)); },
    pick: function (arr) { return arr[Math.floor(next() * arr.length)]; },
    chance: function (p) { return next() < p; }
  };
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
function dist(ax, ay, bx, by) { return Math.sqrt(dist2(ax, ay, bx, by)); }
function angTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
function angDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
// Push a circle (x, y, r) out of an axis-aligned rect; returns true on hit.
function circleRectResolve(c, r) {
  const nx = clamp(c.x, r.x, r.x + r.w);
  const ny = clamp(c.y, r.y, r.y + r.h);
  const dx = c.x - nx, dy = c.y - ny;
  const d2 = dx * dx + dy * dy;
  if (d2 >= c.r * c.r) return false;
  if (d2 > 0.0001) {
    const d = Math.sqrt(d2);
    c.x = nx + (dx / d) * c.r;
    c.y = ny + (dy / d) * c.r;
  } else {
    // Center inside the rect: push out along the smallest penetration axis.
    const pl = c.x - r.x, pr = r.x + r.w - c.x;
    const pt = c.y - r.y, pb = r.y + r.h - c.y;
    const m = Math.min(pl, pr, pt, pb);
    if (m === pl) c.x = r.x - c.r;
    else if (m === pr) c.x = r.x + r.w + c.r;
    else if (m === pt) c.y = r.y - c.r;
    else c.y = r.y + r.h + c.r;
  }
  return true;
}

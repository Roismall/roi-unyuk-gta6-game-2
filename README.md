[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Roismall/roi-unyuk-gta6-game-2/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Roismall/roi-unyuk-gta6-game-2/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Bounty: https://make.fun/bounty/gta6-01

# Solmar Bay — Sun, Sand & Sirens

An open-world crime game in the spirit of GTA 6, built from scratch in
plain Canvas 2D. Explore the coastal city of Solmar Bay on foot and by car,
steal vehicles, dodge the Bay PD across a 0–5 star wanted level, and run
eight story jobs for Vera "Vee" Cruz — from a first stolen car to the Venn
Casino vault.

## What is in the city

- A 4800×3600 open world: downtown, harbor docks, marina, beach, suburbs,
  an airstrip, shops, and 20 hidden sun coins.
- Living traffic and pedestrians, police cruisers and foot cops, taxi fares,
  a gun shop and a garage, ranks from Rookie to Kingpin of the Bay.
- Procedural WebAudio radio (three stations) and sound effects — no audio
  files. Save/continue via localStorage.

## Controls

- WASD / Arrows — walk or drive; Shift — sprint; Space — handbrake
- E — enter/exit a car, steal a car, interact with shops and the vault
- Mouse — aim; Click — shoot (on foot); 1 / 2 — switch weapon
- R — radio station; M — mute; P / Esc — pause

## Files

- `game/index.html` — entry point; `game/src/` — one file per system
  (random, city, audio, traffic, police, missions, render, game, main).
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to the
  output dir and writes `dossier.json` with the kit's dossier builder.

Serve `game/` with any static server and open `index.html` in desktop
Chrome. No network requests, no build step.

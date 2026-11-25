# Cat Playground plan

## Goal

A "Cats" tab on fuey500.com: a small low-poly 3D yard where Chance's cats live like an a-life
toy. Visitors pet them and toss a yarn ball for them. Each cat shows its age. Cats that have
passed wear a halo and show their RIP date.

## Decisions

- **Stack fits the site.** The site is one static `index.html` (Tailwind CDN, jQuery, data in
  `siteData`) served by GitHub Pages from `main` (`CNAME` = fuey500.com). The playground is one ES
  module, `cats/playground.js`, using plain three.js 0.170.0 from jsDelivr through an import map.
  No build step.
- **Lazy.** three.js and the scene load only the first time the Cats tab opens, so the blog pays
  nothing. The render loop stops when the tab or browser tab is hidden.
- **Data lives in `siteData.cats`**, next to logs/videos/comics, so the admin panel's JSON dump
  (Ctrl+M) includes it. One entry per cat:
  `{ "name", "born": "YYYY-MM-DD", "passed": "YYYY-MM-DD" | null, "color": "#hex", "model": "file.glb" | null }`.
  `born`/`passed` may also be `null` when unknown. `model` is a file in `cats/models/`.
- **Stand-in cats until real models exist.** A cat with `model: null` is built from boxes and
  cones (about 150 tris) in its `color`. A `.glb` drops in with no code change.
- **Behaviour is a tiny state machine per cat:** idle, wander, chase the yarn, being petted.
  Deceased cats do the same, with a halo and a slow float.
- **Phones:** pixel ratio capped at 1.5, flat Lambert materials, no shadow maps (a blob decal
  under each cat), a few dozen draw calls. Touch drag orbits only inside the canvas.

## Model drop-in (for Chance)

1. Export the cat as `.glb`, Y-up, facing +Z, feet at origin, about 0.5 units tall at the
   shoulder (the stand-in's size), scale applied. Target 300-600 tris, flat colour or a small
   palette texture.
2. Optional animation clips named `idle`, `walk`, `pet` (any missing one is skipped; without
   clips the code bobs the whole model).
3. Put it in `cats/models/` and set that cat's `"model": "name.glb"`.

## Steps

1. **Tab + section** (Sonnet): nav button `Cats`, `<section id="cats">` with the canvas host and
   a roster, import map, lazy `import('./cats/playground.js')` on first open, stop on leave.
   Check: Blog/Videos/Comics still switch; Cats opens the scene. **Done.**
2. **Scene** (Sonnet): yard disc, a few props, camera with limited orbit, resize helper, render
   only while visible. Check: no console errors, draw calls under 100. **Done.**
3. **Cats** (Opus): stand-in builder, GLB loader with fallback, wander/idle/chase/pet states,
   name tags with age, halo + RIP for deceased. Check: tap a cat shows hearts and its card; tap
   grass tosses yarn and cats chase it. **Done.**
4. **Roster** (Sonnet): cards under the scene with name, age, born, RIP; tapping one pets that
   cat. Check: ages match the dates. **Done.**
5. **Real cats** (Chance): names, birth dates, RIP dates, colours, then models. Open.
6. **Later ideas** (not built): admin-panel form for cats, cats remembering pets per visitor,
   sleeping at night by the visitor's clock, mobile nav for all tabs (the site's nav is
   desktop-only today).

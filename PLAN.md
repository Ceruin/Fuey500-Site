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
  (Ctrl+M) includes it. One entry per cat: `name`; `born` as `"YYYY-MM-DD"` or `"YYYY"` (approximate,
  shown as "~N yrs"); `passed` as `null` (alive), `"YYYY-MM-DD"`, or `""` (date unknown); `lived` (age at
  passing when there are no dates); optional `note` and `buddy` (a cat it likes to stay near);
  `coat`; `model` (a file in `cats/models/` or `null`). The format is commented above the array.
- **Procedural low-poly cats until hand-made models exist** (`cats/catmodel.js`, 2026-11-25). Each cat is
  ~680 flat-shaded, vertex-coloured tris lofted from rings (octagon torso and head, hexagon legs, a
  6-segment tail) on a joint hierarchy: body pivot at the hips, neck, two-segment legs, tail chain. The
  coat is painted per face from `coat`: `base`, `points` (face mask, ears, legs, tail), `patch` (flank
  patches; `face: "half"` = split face plus nose blaze, otherwise a forehead blaze), `stripes` (body bands,
  leg rings, forehead bars, tail rings), `white` (chest, belly, muzzle, paws), `whiteLegs`, `eyes`, `nose`,
  `long` (fluffed silhouette). Built in JS, not Blender: no Blender in the cloud session, and runtime
  geometry keeps the coat data-driven. A `.glb` still drops in with no code change.
- **Poses:** stand, walk, chase, sit, lie (loaf), blended per joint; petting makes a cat sit and purr
  (head tilt, tail swish). Resting cats pick stand/sit/lie and stand up before walking off.
- **Photos:** `cats/photos/<name>.jpg` (900px max side, metadata stripped). Clicking a roster card opens a
  medium popup with the photo (X, backdrop or Escape closes it).
- **Behaviour is a tiny state machine per cat:** idle, wander, chase the yarn, being petted.
  Deceased cats do the same, with a halo and a slow float.
- **Phones:** pixel ratio capped at 1.5, flat Lambert materials, no shadow maps (a blob decal
  under each cat), 146 draw calls and ~6.9k tris with 8 cats. Touch drag orbits only inside the canvas.

## Model drop-in (for Chance)

1. Export the cat as `.glb`, Y-up, facing +Z, feet at origin, scale applied (it is scaled to 0.82
   units tall to the ear tips, the procedural cat's size). Target 300-600 tris, flat colour or a small
   palette texture.
2. Optional animation clips named `idle`, `walk`, `pet`, `sit`, `lie` (any missing one is skipped; without
   clips the code bobs the whole model).
3. Put it in `cats/models/` and set that cat's `"model": "name.glb"`.

## Steps

1. **Tab + section** (Sonnet): nav button `Cats`, `<section id="cats">` with the canvas host and
   a roster, import map, lazy `import('./cats/playground.js')` on first open, stop on leave.
   Check: Blog/Videos/Comics still switch; Cats opens the scene. **Done.**
2. **Scene** (Sonnet): yard disc, a few props, camera with limited orbit, resize helper, render
   only while visible. Check: no console errors, draw calls under 100. **Done.**
3. **Cats** (Opus): box stand-in builder (replaced in step 6), GLB loader with fallback, wander/idle/chase/pet states,
   name tags with age, halo + RIP for deceased. Check: tap a cat shows hearts and its card; tap
   grass tosses yarn and cats chase it. **Done.**
4. **Roster** (Sonnet): cards under the scene with name, age, born, RIP; tapping one pets that
   cat. Check: ages match the dates. **Done.**
5. **Real cats** (Chance): 8 cats in with approximate ages and coats from photos (2026-11-25). Open: exact dates, RIP dates, models.
6. **Low-poly models, poses, photo popup** (Opus, 2026-11-25): `cats/catmodel.js`, photos, popup. Check: 3
   review rounds on a contact sheet (8 cats x stand/side/face/sit/lie/walk) against the photos; 146 draw
   calls / ~6.9k tris with 8 cats; popup opens, shows the photo uncropped, closes on Escape. **Done.**
7. **Later ideas** (not built): admin-panel form for cats, cats remembering pets per visitor,
   sleeping at night by the visitor's clock, mobile nav for all tabs (the site's nav is
   desktop-only today).

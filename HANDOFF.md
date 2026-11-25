# Handoff: Cat Playground

Plan and model drop-in steps: [PLAN.md](PLAN.md).

## Goal

A "Cats" tab on fuey500.com where Chance's cats live as low-poly 3D cats: visitors pet them, toss
yarn for them, see each cat's age; cats that have passed wear a halo and show their RIP date.

## State (2026-11-25)

- PR #1 merged to `main` on 2026-11-25 on Chance's yes; GitHub Pages serves `main` at fuey500.com.
  Ask Chance before merging future Fuey500 work.
- 8 cats in `siteData.cats`: Shadow ~13, Piccolo (passed, lived ~2-3), Kael'thas ~2, Booster ~8 (note
  "Mom's cat"), Mischief ~3, Sticks ~1 and Stone ~1 (siblings, `buddy`), Jinx (passed, lived ~8, note
  "Brother's cat"). Chance's rule: no family members' names anywhere on the site. RIP dates unknown.
- Cats are procedural low-poly models (`cats/catmodel.js`, ~680 tris each) with coats matched to
  Chance's photos, posing stand/walk/chase/sit/lie; petting makes a cat sit and purr.
- Photos are in `cats/photos/` (900px max JPEGs, metadata stripped); a roster card click opens a popup.
  Sticks' photo was replaced with the one Chance picked on 2026-11-25 (old one removed); the model colours already matched.
- Preview page (Claude artifact) is built from the repo by a scratch script that inlines
  `catmodel.js` + `playground.js` and the cat data; photos are published beside it.
- Tested in headless Chrome (SwiftShader) with CDN scripts served locally: 146 draw calls / ~6.9k
  tris with 8 cats, pet/yarn/chase/stop/resume work, tags don't overlap, popup opens and closes on
  Escape at desktop and 390px width. 3 blind review rounds of a contact sheet against the photos.
  Not tested on a real phone or on the live CDN URLs.

## Files

- `index.html`: import map for three.js 0.170.0 (jsDelivr), `Cats` nav button, `#cats` section,
  Cat Playground CSS, `siteData.cats`, `showCats()` lazy loader hooked into the nav click.
- `cats/playground.js`: the playground (scene, GLB loading, behaviour, yarn, tags, roster, photo popup).
- `cats/catmodel.js`: procedural low-poly cat (geometry, coat painting, joints, poses).
- `cats/photos/`: one photo per cat. Exports `start`, `stop`, `ageText`, `debug`.
- `cats/models/`: where real `.glb` cats go (empty for now).
- `PLAN.md`, `HANDOFF.md`.

## Decisions

- Plain three.js as one ES module, no build step, loaded only when the Cats tab opens.
- Cat data sits in `siteData.cats` so the admin panel's JSON dump includes it.
- `passed: null` = alive, `"YYYY-MM-DD"` = RIP date, `""` = passed, date unknown. `born: null` shows "Age unknown".
- Deceased cats keep playing, float a little, wear a gold halo.
- Markings are painted per face from `coat` (vertex colours, no textures); one shared material.
- Phones: pixel ratio cap 1.5, ~680 tris per cat, no shadow maps (blob decals), tags show the name only under 640px.

## Next steps

1. Optional: exact birth dates and RIP dates for Piccolo and Jinx, if Chance has them.
2. Chance makes `.glb` models (see PLAN.md "Model drop-in"); set each cat's `model`.
3. Check on a real phone. Note the site's nav is `hidden md:flex`, so no tab (Cats included) is
   reachable on phones today; a mobile nav is a separate change.

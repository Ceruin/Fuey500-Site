# Handoff: Cat Playground

Plan and model drop-in steps: [PLAN.md](PLAN.md).

## Goal

A "Cats" tab on fuey500.com where Chance's cats live as low-poly 3D cats: visitors pet them, toss
yarn for them, see each cat's age; cats that have passed wear a halo and show their RIP date.

## State (2026-11-25)

- Branch `claude/project-thread-ucqvs7`, PR open against `main`. Not merged: `main` is what GitHub
  Pages serves at fuey500.com, so merging is Chance's call.
- First playable version works with 4 placeholder cats ("Stand-in ..." names, made-up dates).
- Tested in headless Chrome (SwiftShader) with the CDN scripts served locally: tab opens, 57 draw
  calls / ~1.4k tris, petting shows hearts + info card + roster highlight, yarn toss makes cats
  chase and bat it, cats lose interest after ~6 bats, loop stops when leaving the tab and resumes,
  Blog tab unchanged, roster ages correct. Not tested on a real phone or on the live CDN URLs.

## Files

- `index.html`: import map for three.js 0.170.0 (jsDelivr), `Cats` nav button, `#cats` section,
  Cat Playground CSS, `siteData.cats`, `showCats()` lazy loader hooked into the nav click.
- `cats/playground.js`: the whole playground (scene, stand-in cats, GLB loading, behaviour, yarn,
  tags, roster). Exports `start`, `stop`, `ageText`, `debug`.
- `cats/models/`: where real `.glb` cats go (empty for now).
- `PLAN.md`, `HANDOFF.md`.

## Decisions

- Plain three.js as one ES module, no build step, loaded only when the Cats tab opens.
- Cat data sits in `siteData.cats` so the admin panel's JSON dump includes it.
- `passed: null` = alive, `"YYYY-MM-DD"` = RIP date, `""` = passed, date unknown. `born: null` shows "Age unknown".
- Deceased cats keep playing, float a little, wear a gold halo.
- Phones: pixel ratio cap 1.5, no shadow maps (blob decals), tags show the name only under 640px.

## Next steps

1. Chance gives real names, birth dates, RIP dates and fur colours; replace the stand-ins in `siteData.cats`.
2. Chance makes `.glb` models (see PLAN.md "Model drop-in"); set each cat's `model`.
3. Check on a real phone. Note the site's nav is `hidden md:flex`, so no tab (Cats included) is
   reachable on phones today; a mobile nav is a separate change.
4. Merge the PR to `main` when Chance says yes.

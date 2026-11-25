// Low-poly procedural cat (~650 tris, flat-shaded, vertex-coloured), facing +Z with its feet on y = 0.
// Built from lofted rings (octagon body and head, hexagon legs and tail) on a small joint hierarchy,
// so one rig can stand, walk, sit, lie and get petted. Coat fields: see the siteData.cats comment in index.html.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Rings are [z, y, halfWidth, halfHeight] along +Z. fluff pushes every other vertex out (longhair tufts).
function loft(rings, n, { fluff = 0, start = true, end = true } = {}) {
    const pts = rings.map(([z, y, w, h], r) => Array.from({ length: n }, (_, i) => {
        const a = i / n * TAU, f = 1 + ((i + r) % 2 ? fluff : 0);
        return V(Math.sin(a) * w * f, y + Math.cos(a) * h * f, z);
    }));
    const tris = [];
    for (let r = 0; r < pts.length - 1; r++) for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, a = pts[r][i], b = pts[r][j], c = pts[r + 1][j], d = pts[r + 1][i];
        tris.push([a, d, c], [a, c, b]);
    }
    const cap = (ring, back) => {
        const m = ring.reduce((s, p) => s.add(p), V(0, 0, 0)).divideScalar(n);
        ring.forEach((p, i) => tris.push(back ? [m, p, ring[(i + 1) % n]] : [m, ring[(i + 1) % n], p]));
    };
    if (start) cap(pts[0], true);
    if (end) cap(pts.at(-1), false);
    return tris;
}

// Resample key rings to an even spacing so stripes and patches have faces to land on.
function resample(keys, step) {
    const out = [];
    for (let k = 0; k < keys.length - 1; k++) {
        const a = keys[k], b = keys[k + 1], parts = Math.max(1, Math.round((b[0] - a[0]) / step));
        for (let s = 0; s < parts; s++) out.push(a.map((v, i) => v + (b[i] - v) * s / parts));
    }
    return [...out, keys.at(-1)];
}

const xform = (tris, m) => tris.map(t => t.map(p => p.clone().applyMatrix4(m)));
const LEG_DOWN = new THREE.Matrix4().makeRotationX(Math.PI / 2);   // a loft along +Z becomes a limb hanging down -Y

// Turn a face so its normal points away from `inside`.
function orient([a, b, c], inside) {
    const n = V(0, 0, 0).subVectors(b, a).cross(V(0, 0, 0).subVectors(c, a));
    const m = V(0, 0, 0).add(a).add(b).add(c).divideScalar(3);
    return n.dot(m.sub(inside)) < 0 ? [a, c, b] : [a, b, c];
}

// Non-indexed geometry with one colour per face; paint(centroid, normal) picks it. A small value jitter
// per face gives the faceted fur its hand-painted look.
function toGeo(tris, paint) {
    const pos = [], col = [], e1 = V(0, 0, 0), e2 = V(0, 0, 0);
    for (const [a, b, c] of tris) {
        const n = e1.subVectors(b, a).cross(e2.subVectors(c, a)).normalize().clone();
        const m = V(0, 0, 0).add(a).add(b).add(c).divideScalar(3);
        const k = paint(m, n), h = Math.sin(m.x * 917.3 + m.y * 471.1 + m.z * 131.7) * 4375.5;
        const j = 1 + (h - Math.floor(h) - 0.5) * 0.09;
        for (const p of [a, b, c]) { pos.push(p.x, p.y, p.z); col.push(k.r * j, k.g * j, k.b * j); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
}

export const CAT_MAT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

// ---------- shape (units: the yard is 13 across; shoulder ~0.42, head top ~0.78) ----------
const TORSO = [   // body-local, hip joint at the origin
    [-0.21, 0.03, 0.06, 0.06], [-0.17, 0.035, 0.135, 0.13], [-0.04, 0.035, 0.16, 0.15], [0.14, 0.02, 0.14, 0.135],
    [0.31, 0.04, 0.155, 0.16], [0.44, 0.07, 0.14, 0.155], [0.53, 0.1, 0.09, 0.1],
];
const HEAD = [    // head-local, neck pivot at the origin
    [-0.085, 0.12, 0.05, 0.05], [-0.05, 0.13, 0.12, 0.11], [0.02, 0.125, 0.155, 0.125], [0.085, 0.12, 0.14, 0.115],
    [0.125, 0.11, 0.115, 0.1], [0.15, 0.08, 0.075, 0.062], [0.172, 0.078, 0.04, 0.032],
];
const LEGS = {    // along +Z before LEG_DOWN; ring y becomes forward
    frontUpper: [[-0.04, 0, 0.055, 0.065], [0.2, 0, 0.042, 0.045]],
    frontLower: [[-0.02, 0, 0.042, 0.045], [0.15, 0, 0.036, 0.04], [0.162, 0.016, 0.05, 0.062], [0.19, 0.016, 0.046, 0.058]],
    hindUpper: [[-0.05, 0.0, 0.065, 0.09], [0.05, -0.01, 0.075, 0.1], [0.2, 0, 0.042, 0.05]],
    hindLower: [[-0.02, 0, 0.04, 0.045], [0.165, 0, 0.034, 0.038], [0.175, 0.02, 0.046, 0.062], [0.2, 0.02, 0.043, 0.058]],
};
const JOINTS = { front: [0.085, -0.02, 0.4], hind: [0.095, 0.0, 0.0], neck: [0, 0.1, 0.5], tail: [0, 0.07, -0.19] };
const LEN = { front: 0.2, hind: 0.2, tailSeg: 0.08, tailSegs: 6 };
const STAND_Y = 0.4;

// Joint targets per pose. fu/fl/hu/hl: front/hind upper/lower leg pitch. tail0: tail lift, curlX/curlY per segment.
const POSES = {
    stand: { y: STAND_Y, pitch: 0, fu: 0, fl: 0, hu: -0.35, hl: 0.6, head: 0.05, tail0: 0.55, curlX: 0.12, curlY: 0 },
    walk: { y: STAND_Y, pitch: 0, fu: 0, fl: 0, hu: -0.35, hl: 0.6, head: 0.1, tail0: 0.95, curlX: 0.1, curlY: 0 },
    chase: { y: STAND_Y - 0.03, pitch: 0.05, fu: 0, fl: 0, hu: -0.35, hl: 0.6, head: 0.15, tail0: 0.25, curlX: 0.04, curlY: 0 },
    sit: { y: 0.17, pitch: -0.65, fu: 0.65, fl: 0, hu: -0.45, hl: 2.6, head: 0.5, tail0: 0.45, curlX: -0.04, curlY: 0.42 },
    lie: { y: 0.15, pitch: 0, fu: 1.1, fl: -2.45, hu: -1.2, hl: 2.6, head: -0.12, tail0: -0.05, curlX: 0, curlY: 0.32 },   // loaf, paws tucked
};

// ---------- coat ----------
const lum = c => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
const SPOTS = [[0.15, 0.04, 0.04, 0.11], [-0.14, 0.08, 0.3, 0.1], [0.06, 0.17, 0.28, 0.08], [-0.12, 0.1, -0.1, 0.09], [0.1, 0.12, -0.14, 0.06]];   // [x, y, z, r] patches

function palette({ base = '#888', points, patch, stripes, white, eyes = '#c9c24a', nose } = {}) {
    const B = new THREE.Color(base), dark = lum(B) < 0.05;
    return {
        B, P: new THREE.Color(points ?? base), A: patch && new THREE.Color(patch), S: stripes && new THREE.Color(stripes),
        W: white && new THREE.Color('#ece6d8'), E: new THREE.Color(eyes), PUPIL: new THREE.Color('#0d0a09'),
        NOSE: new THREE.Color(nose ?? (dark ? '#3a2c2e' : '#d39498')), EAR: B.clone().lerp(new THREE.Color('#d9a3a5'), dark ? 0.35 : 0.55),
    };
}

// ---------- parts ----------
function makeTorso(coat, k) {
    const long = coat.long, rings = resample(TORSO, 0.06).map(([z, y, w, h]) => [z, y, w * (long ? 1.38 : 1), h * (long ? 1.32 : 1)]);
    if (long) rings.splice(-1, 0, [0.5, 0.09, 0.2, 0.21]);   // neck ruff
    return toGeo(loft(rings, 8, { fluff: long ? 0.3 : 0 }), (m, n) => {
        if (k.W && (n.y < (coat.whiteLegs ? -0.3 : -0.55) || (m.z > 0.34 && n.y < 0.35 && Math.abs(m.x) < 0.12))) return k.W;
        if (k.A && n.y > -0.4 && SPOTS.some(([x, y, z, r]) => Math.hypot(m.x - x, m.y - y, m.z - z) < r)) return k.A;
        if (k.S && n.y > -0.45 && m.z > -0.17 && m.z < 0.47 && (n.y > 0.85 || Math.floor((m.z + 0.2) / 0.06) % 2 === 0)) return k.S;
        return k.B;
    });
}

function makeHead(coat, k) {
    const long = coat.long, half = coat.face === 'half';
    let tris = loft(HEAD.map(([z, y, w, h], i) => [z, y, w * (long && i > 0 && i < 4 ? 1.32 : 1), h * (long && i > 0 && i < 4 ? 1.12 : 1)]), 8, { fluff: long ? 0.2 : 0 });
    const faceColor = (m, n) => {
        if (n.z > 0.7 && m.z > 0.165 && m.y > 0.084) return k.NOSE;
        if (k.W && m.z > 0.12 && m.y < 0.1) return k.W;
        if (coat.points && m.z > 0.06) return k.P;
        if (k.A && half && (m.x > 0.004 || (m.z > 0.1 && Math.abs(m.x) < 0.05))) return k.A;   // half face plus a blaze down the nose
        if (k.A && !half && Math.abs(m.x) < 0.05 && m.y > 0.16 && m.z > -0.02) return k.A;
        if (k.S && m.y > 0.17 && m.z > -0.06 && m.z < 0.12 && Math.floor((m.z + 0.1) / 0.035) % 2 === 0) return k.S;   // forehead bars
        return k.B;
    };
    const skull = toGeo(tris, faceColor);

    // Eyes: projected onto the face so they sit on the surface, iris disc plus a slit pupil.
    const hitMesh = new THREE.Mesh(skull), ray = new THREE.Raycaster(), extra = [], colours = [];
    for (const sx of [-1, 1]) {
        ray.set(V(sx * 0.058, 0.148, 1), V(0, 0, -1));
        const hit = ray.intersectObject(hitMesh)[0];
        if (!hit) continue;
        const nrm = hit.face.normal.clone().lerp(V(sx * 0.3, 0.05, 1).normalize(), 0.6).normalize();
        const u = V(0, 1, 0).cross(nrm).normalize(), v = V(0, 0, 0).crossVectors(nrm, u);
        const c = hit.point.clone().addScaledVector(nrm, 0.004), ring = Array.from({ length: 6 }, (_, i) => {
            const a = i / 6 * TAU;
            return c.clone().addScaledVector(u, Math.cos(a) * 0.026).addScaledVector(v, Math.sin(a) * 0.023);
        });
        ring.forEach((p, i) => { extra.push(orient([c, p, ring[(i + 1) % 6]], c.clone().sub(nrm))); colours.push(k.E); });
        const pc = c.clone().addScaledVector(nrm, 0.003), top = pc.clone().addScaledVector(v, 0.024), bot = pc.clone().addScaledVector(v, -0.024);
        for (const s of [-1, 1]) { extra.push(orient([top, bot, pc.clone().addScaledVector(u, s * 0.007)], pc.clone().sub(nrm))); colours.push(k.PUPIL); }
    }
    // Ears: three-sided pyramids, pink inside unless the coat is pointed.
    for (const sx of [-1, 1]) {
        const A = V(sx * 0.035, 0.22, 0.03), B = V(sx * 0.13, 0.185, 0.025), C = V(sx * 0.085, 0.2, -0.045), T = V(sx * 0.095, 0.33, -0.005);
        const mid = V(sx * 0.085, 0.22, 0.0), outer = coat.points ? k.P : (k.A && half && sx > 0 ? k.A : k.B);
        for (const [tri, colour] of [[[A, B, T], coat.points ? k.P : k.EAR], [[B, C, T], outer], [[C, A, T], outer], [[A, C, B], outer]]) {
            extra.push(orient(tri, mid)); colours.push(colour);
        }
    }
    const rest = toGeo(extra, () => colours.shift());
    const g = new THREE.BufferGeometry();
    for (const name of ['position', 'color', 'normal']) {
        const a = skull.getAttribute(name).array, b = rest.getAttribute(name).array, out = new Float32Array(a.length + b.length);
        out.set(a); out.set(b, a.length);
        g.setAttribute(name, new THREE.BufferAttribute(out, 3));
    }
    return g;
}

function makeLeg(rings, coat, k, lower) {
    const s = coat.long ? 1.3 : 1, keys = coat.stripes ? resample(rings, 0.045) : rings;
    return toGeo(xform(loft(keys.map(([z, y, w, h]) => [z, y, w * s, h * s]), 6, { start: false, end: lower, fluff: coat.long ? 0.15 : 0 }), LEG_DOWN), m => {
        if (k.W && (coat.whiteLegs || (lower && m.y < -0.12))) return k.W;
        if (coat.points) return k.P;
        if (k.S && m.y > -0.15 && Math.floor(-m.y / 0.05) % 2 === 1) return k.S;
        return k.B;
    });
}

function makeTailSeg(i, coat, k) {
    const n = LEN.tailSegs, r0 = 0.04 - i * 0.0035, r1 = r0 - 0.0035, s = coat.long ? 3.2 : 1;
    const colour = coat.points ? k.P : k.S && (i % 2 || i === n - 1) ? k.S : k.B;
    return toGeo(loft([[-LEN.tailSeg, 0, r1 * s, r1 * s], [0.012, 0, r0 * s, r0 * s]], 6, { fluff: coat.long ? 0.45 : 0, start: i === n - 1, end: false }), () => colour);
}

// Geometry is shared between cats with the same coat.
const cache = new Map();
function parts(coat) {
    const key = JSON.stringify(coat);
    if (!cache.has(key)) {
        const k = palette(coat);
        cache.set(key, {
            torso: makeTorso(coat, k), head: makeHead(coat, k),
            fu: makeLeg(LEGS.frontUpper, coat, k, false), fl: makeLeg(LEGS.frontLower, coat, k, true),
            hu: makeLeg(LEGS.hindUpper, coat, k, false), hl: makeLeg(LEGS.hindLower, coat, k, true),
            tail: Array.from({ length: LEN.tailSegs }, (_, i) => makeTailSeg(i, coat, k)),
        });
    }
    return cache.get(key);
}

const group = (parent, [x, y, z]) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const add = (parent, geo) => parent.add(new THREE.Mesh(geo, CAT_MAT));

// ---------- rig ----------
export function makeCat(coat = {}) {
    const p = parts(coat), root = new THREE.Group(), body = group(root, [0, STAND_Y, -0.15]);
    add(body, p.torso);
    const head = group(body, JOINTS.neck);
    add(head, p.head);
    const legs = [];
    for (const [kind, len, up, lo] of [['front', LEN.front, p.fu, p.fl], ['hind', LEN.hind, p.hu, p.hl]]) for (const sx of [-1, 1]) {
        const [x, y, z] = JOINTS[kind], upper = group(body, [sx * x, y, z]);
        add(upper, up);
        const lower = group(upper, [0, -len, 0]);
        add(lower, lo);
        legs.push({ front: kind === 'front', side: sx, upper, lower });
    }
    const tail = [];
    let t = group(body, JOINTS.tail);
    p.tail.forEach((geo, i) => { if (i) t = group(t, [0, 0, -LEN.tailSeg]); add(t, geo); tail.push(t); });

    const cur = { ...POSES.stand };
    // s: { mode: stand|walk|chase|sit|lie, speed, stride, pet, look }
    function update(dt, time, s) {
        const goal = POSES[s.mode] ?? POSES.stand, f = 1 - Math.exp(-dt * 5);
        for (const key in goal) cur[key] += (goal[key] - cur[key]) * f;
        const amp = Math.min(s.speed / 0.7, 1), ph = s.stride;
        body.position.y = cur.y + Math.abs(Math.sin(ph)) * 0.012 * amp;
        body.rotation.x = cur.pitch;
        body.rotation.z = Math.sin(ph) * 0.05 * amp;   // hips roll with the stride
        const breath = 1 + Math.sin(time * 2.4) * 0.015;
        body.children[0].scale.set(breath, breath, 1);
        for (const l of legs) {
            const legPh = ph + (l.front === (l.side > 0) ? 0 : Math.PI), swing = Math.sin(legPh) * 0.45 * amp, lift = Math.max(0, -Math.cos(legPh)) * amp;
            l.upper.rotation.x = (l.front ? cur.fu : cur.hu) + (l.front ? swing : -swing);
            l.lower.rotation.x = (l.front ? cur.fl + lift * 0.7 : cur.hl + lift * 0.5);
        }
        head.rotation.set(cur.head + Math.sin(ph * 2) * 0.03 * amp, s.look ?? 0, s.pet ? Math.sin(time * 3) * 0.22 : 0);
        const sway = s.pet ? [9, 0.22] : s.mode === 'lie' ? [1.5, 0.05] : [2, 0.1];
        tail.forEach((seg, i) => {
            seg.rotation.x = i ? cur.curlX : cur.tail0;
            seg.rotation.y = cur.curlY + Math.sin(time * sway[0] - i * 0.7) * sway[1];
        });
    }
    return { root, head, update, halo: V(0, 0.33, 0.02), haloParent: head, top: 0.82 };
}

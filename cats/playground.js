// Cat Playground: low-poly cats that wander a yard, get petted and chase yarn.
// Loaded lazily by index.html the first time the Cats tab opens. Data: siteData.cats.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const YARD = 6.5;                 // radius cats stay inside
const MODEL_DIR = 'cats/models/';
const rand = (a, b) => a + Math.random() * (b - a);
const esc = s => String(s).replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);

// ---------- dates ----------
const parseDay = s => { if (typeof s !== 'string' || !s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtDay = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function ageText(born, until) {
    const months = (until.getFullYear() - born.getFullYear()) * 12 + until.getMonth() - born.getMonth()
        - (until.getDate() < born.getDate() ? 1 : 0);
    const part = (n, w) => n ? `${n} ${w}${n === 1 ? '' : 's'}` : '';
    if (months < 1) return part(Math.max(1, Math.round((until - born) / 864e5)), 'day');
    return [part(Math.floor(months / 12), 'yr'), part(months % 12, 'mo')].filter(Boolean).join(' ');
}

// born: "YYYY-MM-DD" (exact) or "YYYY" (approximate, shown as ~N yrs). lived: age at passing when dates are unknown.
function describe(data) {
    const ghost = data.passed != null && data.passed !== false, approx = /^\d{4}$/.test(data.born ?? '');
    const born = parseDay(approx ? null : data.born), passed = parseDay(data.passed), until = passed ?? new Date();
    const years = until.getFullYear() - +data.born;
    const age = approx ? `~${years} yr${years === 1 ? '' : 's'}` : born ? ageText(born, until) : ghost && data.lived ? `~${data.lived} yrs` : null;
    return {
        ghost,
        age: ghost ? (age ? `Lived ${age}` : 'Age unknown') : (age ? `${age} old` : 'Age unknown'),
        born: born ? `Born ${fmtDay(born)}` : approx ? `Born ~${data.born}` : '',
        rip: ghost ? (passed ? `RIP ${fmtDay(passed)}` : 'RIP') : '',
        note: data.note ?? '',
    };
}

// ---------- shared geometry and materials ----------
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const GEO = {
    body: box(0.4, 0.34, 0.72), head: box(0.38, 0.32, 0.32), eye: box(0.07, 0.07, 0.02),
    leg: box(0.1, 0.3, 0.1).translate(0, -0.15, 0), tail: box(0.07, 0.07, 0.5).translate(0, 0, -0.25),
    ear: new THREE.ConeGeometry(0.08, 0.15, 4), halo: new THREE.TorusGeometry(0.22, 0.045, 6, 18),
    blob: new THREE.CircleGeometry(0.42, 16).rotateX(-Math.PI / 2), yarn: new THREE.IcosahedronGeometry(0.2, 1),
    pupil: box(0.025, 0.06, 0.01), mask: box(0.26, 0.2, 0.01), muzzle: box(0.18, 0.12, 0.04), blaze: box(0.07, 0.12, 0.02),
    halfFace: box(0.2, 0.33, 0.33), chest: box(0.3, 0.22, 0.04), saddle: box(0.42, 0.18, 0.42), stripe: box(0.42, 0.03, 0.05),
    paw: box(0.11, 0.08, 0.11),
};
const mats = new Map();
const lambert = c => mats.get(c) ?? mats.set(c, new THREE.MeshLambertMaterial({ color: c, flatShading: true })).get(c);
const HALO = new THREE.MeshBasicMaterial({ color: '#ffd54a' });
const BLOB = new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.25, depthWrite: false });

function mesh(geo, mat, x, y, z, parent) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
}

// Stand-in cat built from boxes (~300 tris), facing +Z, feet at y = 0. coat: see the siteData.cats comment in index.html.
function standIn({ base = '#888', points, patch, face, white, stripes, eyes = '#c9c24a', long } = {}) {
    const root = new THREE.Group(), fur = lambert(base), pt = lambert(points ?? base), wh = lambert('#f1ece0');
    const body = mesh(GEO.body, fur, 0, 0.45, 0, root);
    const head = mesh(GEO.head, fur, 0, 0.7, 0.42, root);
    for (const x of [-0.11, 0.11]) {
        mesh(GEO.ear, pt, x, 0.22, -0.02, head);
        mesh(GEO.eye, lambert(eyes), x * 0.8, 0.03, 0.17, head);
        mesh(GEO.pupil, lambert('#1a1714'), x * 0.8, 0.03, 0.18, head);
    }
    if (points) mesh(GEO.mask, pt, 0, 0, 0.163, head);
    if (patch) {
        mesh(GEO.saddle, lambert(patch), 0.03, 0.56, -0.12, root);
        if (face === 'half') mesh(GEO.halfFace, lambert(patch), 0.095, 0.005, 0, head);
        else mesh(GEO.blaze, lambert(patch), 0, 0.09, 0.165, head);
    }
    if (stripes) for (const z of [-0.22, -0.02, 0.18]) mesh(GEO.stripe, lambert(stripes), 0, 0.62, z, root);
    if (white) { mesh(GEO.muzzle, wh, 0, -0.08, 0.17, head); mesh(GEO.chest, wh, 0, 0.38, 0.36, root); }
    const tail = mesh(GEO.tail, pt, 0, 0.55, -0.34, root);
    tail.rotation.x = 0.8;
    const legs = [[-0.13, 0.25], [0.13, -0.25], [0.13, 0.25], [-0.13, -0.25]].map(([x, z]) => {
        const leg = mesh(GEO.leg, pt, x, 0.3, z, root);
        if (white) mesh(GEO.paw, wh, 0, -0.26, 0, leg);
        return leg;
    });
    if (long) { body.scale.set(1.25, 1.2, 1.05); tail.scale.set(2.4, 2.4, 1); head.scale.setScalar(1.06); }
    return { root, head, tail, legs, halo: new THREE.Vector3(0, 1.12, 0.42), top: 1.0 };
}

// A real model: scaled to stand-in height, feet on the ground. Clips named idle/walk/pet play if present.
async function loadModel(loader, file) {
    const gltf = await loader.loadAsync(MODEL_DIR + file), model = gltf.scene;
    model.scale.multiplyScalar(0.95 / new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).y);
    model.position.y -= new THREE.Box3().setFromObject(model).min.y;
    const root = new THREE.Group().add(model), mixer = new THREE.AnimationMixer(model);
    const actions = Object.fromEntries(gltf.animations.map(c => [c.name.toLowerCase(), mixer.clipAction(c)]));
    return { root, model, mixer, actions, halo: new THREE.Vector3(0, 1.1, 0), top: 0.95 };
}

// ---------- cat ----------
class Cat {
    constructor(data, rig, scene) {
        Object.assign(this, { data, rig, info: describe(data), state: 'idle', timer: rand(0.5, 3), speed: 0, stride: 0, phase: rand(0, 9) });
        this.target = new THREE.Vector3();
        this.root = rig.root;
        this.root.position.set(rand(-4, 4), 0, rand(-4, 4));
        this.root.rotation.y = rand(0, Math.PI * 2);
        this.root.traverse(o => o.userData.cat = this);
        this.blob = mesh(GEO.blob, BLOB, 0, 0.01, 0, scene);
        if (this.info.ghost) {
            this.halo = mesh(GEO.halo, HALO, rig.halo.x, rig.halo.y, rig.halo.z, this.root);
            this.halo.rotation.x = Math.PI / 2;
        }
        scene.add(this.root);
    }

    pet() { this.state = 'pet'; this.timer = 3; }

    update(dt, t, yarn, camera) {
        const p = this.root.position;
        this.timer -= dt;
        if (this.state === 'pet') { if (this.timer <= 0) this.rest(); }
        else if (yarn.interest > 0) { this.state = 'chase'; this.target.copy(yarn.mesh.position); }
        else if (this.state === 'chase' || (this.state === 'walk' && Math.hypot(p.x - this.target.x, p.z - this.target.z) < 0.2)) this.rest();
        else if (this.state === 'idle' && this.timer <= 0) {
            const a = rand(0, Math.PI * 2), r = Math.sqrt(Math.random()) * (YARD - 0.5), b = this.buddy?.root.position;
            if (b && Math.random() < 0.6) this.target.set(b.x + rand(-0.9, 0.9), 0, b.z + rand(-0.9, 0.9)).clampLength(0, YARD - 0.5);   // siblings hang out
            else this.target.set(Math.cos(a) * r, 0, Math.sin(a) * r);
            this.state = 'walk';
        }

        const want = { walk: 0.7, chase: 2.2 }[this.state] ?? 0;
        this.speed += (want - this.speed) * Math.min(1, dt * 4);
        const look = this.state === 'pet' ? camera.position : this.target;
        if (this.state !== 'idle') this.turnTo(Math.atan2(look.x - p.x, look.z - p.z), dt);
        const yaw = this.root.rotation.y;
        p.x += Math.sin(yaw) * this.speed * dt;
        p.z += Math.cos(yaw) * this.speed * dt;
        if (p.length() > YARD) p.setLength(YARD);
        if (this.state === 'chase' && p.distanceTo(yarn.mesh.position) < 0.5) yarn.bat(p);

        this.animate(dt, t);
        this.blob.position.set(p.x, 0.01, p.z);
    }

    rest() { this.state = 'idle'; this.timer = rand(2, 6); }

    turnTo(want, dt) {
        const r = this.root.rotation, diff = Math.atan2(Math.sin(want - r.y), Math.cos(want - r.y));
        r.y += THREE.MathUtils.clamp(diff, -6 * dt, 6 * dt);
    }

    animate(dt, t) {
        const r = this.rig, petting = this.state === 'pet', s = this.speed;
        this.stride += s * dt * 9;
        const swing = Math.sin(this.stride) * Math.min(s, 1) * 0.7;
        this.root.position.y = this.info.ghost ? 0.25 + Math.sin(t * 1.5 + this.phase) * 0.07 : Math.abs(Math.sin(this.stride)) * 0.03 * Math.min(s, 1);
        this.root.scale.y = petting ? 1 + Math.sin(t * 12) * 0.04 : 1;
        if (this.halo) this.halo.rotation.z = t * 0.8;
        if (r.legs) {
            r.legs.forEach((leg, i) => leg.rotation.x = i < 2 ? swing : -swing);
            r.tail.rotation.z = Math.sin(t * (petting ? 9 : 2) + this.phase) * 0.35;
            r.head.rotation.set(petting ? -0.15 : 0, this.state === 'idle' ? Math.sin(t * 0.6 + this.phase) * 0.4 : 0, petting ? Math.sin(t * 3) * 0.2 : 0);
            return;
        }
        const clip = r.actions[petting ? 'pet' : s > 0.1 ? 'walk' : 'idle'] ?? r.actions.idle;
        if (clip && clip !== this.clip) { this.clip?.fadeOut(0.25); clip.reset().fadeIn(0.25).play(); this.clip = clip; }
        if (clip) r.mixer.update(dt);
        else r.model.position.y = Math.abs(Math.sin(this.stride)) * 0.04 + (petting ? Math.sin(t * 12) * 0.02 : 0);
    }
}

// ---------- yarn ----------
function makeYarn(scene) {
    const m = mesh(GEO.yarn, lambert('#b8383b'), 0, 0.2, 0, scene);
    m.visible = false;
    const vel = new THREE.Vector3();
    return {
        mesh: m, interest: 0, cool: 0, bats: 0,
        toss(point) { m.position.set(point.x, 1.6, point.z); vel.set(0, 0, 0); m.visible = true; this.interest = 8; this.bats = 0; },
        bat(from) {
            if (this.cool > 0) return;
            const dir = m.position.clone().sub(from).setY(0).normalize().applyAxisAngle(THREE.Object3D.DEFAULT_UP, rand(-0.8, 0.8));
            vel.set(dir.x * rand(2, 3.5), 2, dir.z * rand(2, 3.5));
            this.cool = 0.6;
            if (++this.bats < 6) this.interest = Math.max(this.interest, 3);   // cats lose interest after a few bats
        },
        update(dt) {
            if (!m.visible) return;
            this.interest -= dt; this.cool -= dt;
            vel.y -= 9.8 * dt;
            m.position.addScaledVector(vel, dt);
            if (m.position.y < 0.2) { m.position.y = 0.2; vel.y = Math.abs(vel.y) > 1 ? -vel.y * 0.35 : 0; vel.x *= 0.98; vel.z *= 0.98; }
            vel.x *= Math.exp(-1.2 * dt); vel.z *= Math.exp(-1.2 * dt);
            const flat = Math.hypot(m.position.x, m.position.z);
            if (flat > YARD) { m.position.x *= YARD / flat; m.position.z *= YARD / flat; vel.x = -vel.x; vel.z = -vel.z; }
            m.rotation.x += vel.z * dt / 0.2; m.rotation.z -= vel.x * dt / 0.2;
        },
    };
}

// ---------- scene ----------
function buildYard(scene) {
    scene.fog = new THREE.Fog('#2b2622', 16, 32);
    scene.add(new THREE.HemisphereLight('#fff4e0', '#3c352e', 2.2));
    const sun = new THREE.DirectionalLight('#ffe2b8', 2.2);
    sun.position.set(4, 10, 6);
    scene.add(sun);

    mesh(new THREE.CylinderGeometry(YARD + 1.5, YARD + 1.9, 0.4, 28), lambert('#6f8f3f'), 0, -0.2, 0, scene);
    const rocks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), lambert('#ffffff'), 18), o = new THREE.Object3D();
    for (let i = 0; i < 18; i++) {
        const a = i / 18 * Math.PI * 2 + rand(-0.1, 0.1), r = YARD + rand(0.6, 1.2), s = rand(0.35, 0.7);
        o.position.set(Math.cos(a) * r, s * 0.4, Math.sin(a) * r); o.scale.setScalar(s); o.rotation.set(rand(0, 3), rand(0, 3), 0); o.updateMatrix();
        rocks.setMatrixAt(i, o.matrix);
        rocks.setColorAt(i, new THREE.Color(i % 3 ? '#4f6b2e' : '#8a8378'));
    }
    scene.add(rocks);

    const tree = new THREE.Group(), carpet = lambert('#c9a46a'), wood = lambert('#8a5a3b');
    mesh(box(1.2, 0.15, 1.2), carpet, 0, 0.08, 0, tree);
    mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.7, 8), wood, 0, 0.9, 0, tree);
    mesh(box(0.9, 0.12, 0.9), carpet, 0.2, 0.9, 0.1, tree);
    mesh(box(1.0, 0.12, 1.0), carpet, -0.1, 1.75, -0.1, tree);
    tree.position.set(-3.6, 0, -2.6);
    scene.add(tree);
    mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.18, 10), lambert('#5885a2'), 2.8, 0.09, 2.4, scene);       // cushion
    mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.14, 10), lambert('#b8b2a6'), 3.3, 0.07, -2.9, scene);     // food bowl
}

function buildRoster(roster, cats, onPick) {
    roster.innerHTML = cats.map((c, i) => {
        const info = describe(c);
        return `<button class="cat-roster-card mann-co-border bg-[#332c26] p-5 text-left w-full" data-i="${i}">
            <div class="flex items-center gap-3">
                <span class="w-5 h-5 border-2 border-black flex-shrink-0" style="background:${esc(c.coat?.base || '#888')}"></span>
                <h3 class="tf-font text-2xl text-white italic truncate pr-2">${esc(c.name)}</h3>
                ${info.ghost ? '<i class="fa-solid fa-ring text-yellow-300 ml-auto" title="In memory"></i>' : ''}
            </div>
            <p class="text-slate-300 mt-2">${esc(info.age)}</p>
            ${info.born ? `<p class="text-slate-500 text-sm">${esc(info.born)}</p>` : ''}
            ${info.rip ? `<p class="tf-font text-orange-400 italic">${esc(info.rip)}</p>` : ''}
            ${info.note ? `<p class="text-slate-400 text-sm italic">${esc(info.note)}</p>` : ''}
        </button>`;
    }).join('');
    roster.onclick = e => { const b = e.target.closest('[data-i]'); if (b) onPick(+b.dataset.i); };
}

async function build(host, roster, data) {
    let pick = () => {};
    buildRoster(roster, data, i => pick(i));

    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }   // sky is the stage's CSS gradient
    catch { host.insertAdjacentHTML('beforeend', '<p class="p-8 text-slate-400 italic">This browser can\'t show the 3D playground, but the cats are listed below.</p>'); return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    host.append(renderer.domElement);
    const layer = Object.assign(document.createElement('div'), { className: 'cat-layer' });
    const card = Object.assign(document.createElement('div'), { className: 'cat-card' });
    layer.append(card);
    host.append(layer);

    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
    camera.position.set(0, 6.5, 10.5);
    const controls = new OrbitControls(camera, renderer.domElement);
    Object.assign(controls, { enablePan: false, enableDamping: true, minDistance: 7, maxDistance: 20, minPolarAngle: 0.35, maxPolarAngle: 1.25 });
    buildYard(scene);
    const yarn = makeYarn(scene);

    const loader = new GLTFLoader();
    const rigs = await Promise.all(data.map(c => c.model
        ? loadModel(loader, c.model).catch(err => { console.warn(`Cat model ${c.model} failed, using stand-in`, err); return standIn(c.coat); })
        : standIn(c.coat)));
    const cats = data.map((c, i) => new Cat(c, rigs[i], scene));
    cats.forEach(c => c.buddy = cats.find(o => o !== c && o.data.name === c.data.buddy));
    const tags = cats.map(c => {
        const tag = Object.assign(document.createElement('div'), { className: `cat-tag${c.info.ghost ? ' ghost' : ''}` });
        tag.innerHTML = `<b>${esc(c.data.name)}</b><span><br>${esc(c.info.ghost ? c.info.rip : c.info.age)}</span>`;
        layer.append(tag);
        return tag;
    });

    const v = new THREE.Vector3();
    const toScreen = (cat, lift) => {
        v.copy(cat.root.position); v.y += cat.rig.top + lift; v.project(camera);
        return { x: (v.x * 0.5 + 0.5) * host.clientWidth, y: (-v.y * 0.5 + 0.5) * host.clientHeight, on: v.z < 1 };
    };

    // Name tags follow their cat; a tag that would overlap a nearer cat's tag is lifted above it.
    function placeTags() {
        const placed = [];
        cats.map((c, i) => ({ i, ...toScreen(c, c.halo ? 0.65 : 0.3) })).sort((a, b) => b.y - a.y).forEach(({ i, x, y, on }) => {
            const tag = tags[i];
            tag.style.display = on ? '' : 'none';
            if (!on) return;
            if (!tag.w) { tag.w = tag.offsetWidth; tag.h = tag.offsetHeight; }
            x = THREE.MathUtils.clamp(x, tag.w / 2, host.clientWidth - tag.w / 2);
            for (let moved = true; moved;) {
                moved = false;
                for (const r of placed) if (Math.abs(r.x - x) < (r.w + tag.w) / 2 && y > r.y - r.h && y - tag.h < r.y) { y = r.y - r.h - 2; moved = true; }
            }
            placed.push({ x, y, w: tag.w, h: tag.h });
            tag.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
        });
    }

    pick = i => {
        const cat = cats[i];
        cat.pet();
        card.innerHTML = `<b>${esc(cat.data.name)}</b>${cat.info.ghost ? ' <i class="fa-solid fa-ring text-yellow-300"></i>' : ''}<br>${esc(cat.info.age)}`
            + (cat.info.born ? `<br><span class="text-slate-400">${esc(cat.info.born)}</span>` : '')
            + (cat.info.rip ? `<br><span class="text-orange-400">${esc(cat.info.rip)}</span>` : '')
            + (cat.info.note ? `<br><span class="text-slate-400 italic">${esc(cat.info.note)}</span>` : '');
        card.style.display = 'block';
        roster.querySelectorAll('.cat-roster-card').forEach(b => b.classList.toggle('active', +b.dataset.i === i));
        const s = toScreen(cat, -0.5);   // hearts rise from the cat's back, beside its tag
        for (let n = 0; n < 3; n++) {
            const h = Object.assign(document.createElement('span'), { className: 'cat-heart', textContent: '❤' });
            h.style.cssText = `--x:${s.x + (n - 1) * 34 + rand(-6, 6)}px;--y:${s.y}px;animation-delay:${n * 0.15}s`;
            h.addEventListener('animationend', () => h.remove());
            layer.append(h);
        }
    };

    // Tap: a cat (direct hit or within reach of the tapped grass) gets petted, otherwise the yarn lands there.
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), down = new THREE.Vector2(), hit = new THREE.Vector3();
    const canvas = renderer.domElement;
    canvas.addEventListener('pointerdown', e => down.set(e.clientX, e.clientY));
    canvas.addEventListener('pointerup', e => {
        if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
        const rect = canvas.getBoundingClientRect();
        ndc.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const cat = ray.intersectObjects(cats.map(c => c.root), true)[0]?.object.userData.cat;
        if (cat) return pick(cats.indexOf(cat));
        if (!ray.ray.intersectPlane(ground, hit) || hit.length() > YARD + 0.5) return;
        const near = cats.reduce((best, c) => { const d = c.root.position.distanceTo(hit); return d < best.d ? { c, d } : best; }, { c: null, d: 0.7 }).c;
        if (near) pick(cats.indexOf(near)); else yarn.toss(hit.setLength(Math.min(hit.length(), YARD)));
    });

    let last = performance.now(), t = 0;
    function frame(now) {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now; t += dt;
        const w = host.clientWidth, h = host.clientHeight, pr = renderer.getPixelRatio();
        if (!w || !h) return;
        if (canvas.width !== Math.floor(w * pr) || canvas.height !== Math.floor(h * pr)) {
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.fov = camera.aspect < 1.2 ? 48 : 40;
            tags.forEach(t => t.w = 0);   // re-measure after a resize
            camera.updateProjectionMatrix();
        }
        controls.update();
        yarn.update(dt);
        cats.forEach(c => c.update(dt, t, yarn, camera));
        for (let i = 0; i < cats.length; i++) for (let j = i + 1; j < cats.length; j++) {   // keep cats from overlapping
            const a = cats[i].root.position, b = cats[j].root.position, dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
            if (d > 0 && d < 0.6) { const k = (0.6 - d) / d / 2; a.x -= dx * k; a.z -= dz * k; b.x += dx * k; b.z += dz * k; }
        }
        placeTags();
        renderer.render(scene, camera);
    }

    return {
        renderer, camera, cats, yarn,
        run(on) { if (on) last = performance.now(); renderer.setAnimationLoop(on ? frame : null); },
    };
}

// ---------- public API ----------
let appPromise = null, active = false;

export async function start(host, roster, cats) {
    active = true;
    appPromise ??= build(host, roster, cats).then(app => {
        document.addEventListener('visibilitychange', () => app?.run(active && !document.hidden));
        return app;
    });
    (await appPromise)?.run(active && !document.hidden);
}

export async function stop() {
    active = false;
    (await appPromise)?.run(false);
}

// For tests and the console.
export const debug = () => appPromise;

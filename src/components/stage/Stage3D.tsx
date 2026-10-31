import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { tablaAudio } from '../../audio/tablaAudioEngine';
import { sitarAudio } from '../../audio/sitarEngine';
import { BolKey } from '../../types/tabla';

/**
 * 小さな舞台：シタール奏者（左）とタブラー奏者（右）が、鳴った音に合わせて手を動かす3D表示。
 * 人形は球・円柱などの簡単な形の組み合わせ。腕は「肩・ひじ・手」の2関節で、手の目標位置から角度を計算する。
 * 音の時刻（AudioContext の時計）に合わせて動くので、自動演奏・合奏・自分で叩いた音のどれにも反応する。
 */

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

// ---------- 材質 ----------
const mat = (color: string, roughness = 0.7, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const M = {
  skin: mat('#b97a52', 0.62),
  hair: mat('#17110d', 0.55),
  eye: mat('#120c08', 0.3),
  kurtaT: mat('#efe6d2', 0.85), // タブラー奏者：生成りのクルタ
  kurtaS: mat('#c9892e', 0.75), // シタール奏者：からし色のクルタ
  pants: mat('#e9e2d2', 0.9),
  wood: mat('#6b3a1a', 0.45),
  woodLight: mat('#9a5a2a', 0.45),
  copper: mat('#c0743a', 0.28, 0.85),
  head: mat('#e4caa0', 0.75),
  syahi: mat('#141416', 0.25),
  strap: mat('#4a2a12', 0.8),
  cushion: mat('#8c1f22', 0.85),
  gourd: mat('#7a4320', 0.35),
  bone: mat('#efe6d0', 0.4),
  brass: mat('#d8b260', 0.3, 0.8),
  string: new THREE.LineBasicMaterial({ color: '#e8e2d0', transparent: true, opacity: 0.75 }),
};

/** 2点をつなぐカプセル（腕・脚） */
function limb(r: number, len: number, m: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), m);
  mesh.castShadow = true;
  return mesh;
}
function placeBetween(mesh: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3) {
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize());
}
function staticLimb(parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material) {
  const mesh = limb(r, Math.max(0.001, a.distanceTo(b)), m);
  placeBetween(mesh, a, b);
  parent.add(mesh);
  return mesh;
}

/** 2関節の腕：肩 S から手の目標 T へ。ひじは pole の方向へ曲がる */
class Arm {
  upper: THREE.Mesh; fore: THREE.Mesh; hand: THREE.Mesh; elbowBall: THREE.Mesh;
  constructor(parent: THREE.Object3D, public S: THREE.Vector3, public a: number, public b: number, public pole: THREE.Vector3, sleeve: THREE.Material) {
    this.upper = limb(0.042, a, sleeve);
    this.fore = limb(0.034, b, M.skin);
    this.elbowBall = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), sleeve);
    this.hand = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), M.skin);
    this.hand.scale.set(0.042, 0.02, 0.058);
    [this.upper, this.fore, this.hand, this.elbowBall].forEach((m) => { m.castShadow = true; parent.add(m); });
  }
  reach(T: THREE.Vector3, palmUp = V(0, 1, 0)) {
    const S = this.S, d0 = T.clone().sub(S), d = Math.min(d0.length(), this.a + this.b - 1e-3), dir = d0.normalize();
    const x = (this.a * this.a - this.b * this.b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, this.a * this.a - x * x));
    const perp = this.pole.clone().sub(dir.clone().multiplyScalar(this.pole.dot(dir))).normalize();
    const E = S.clone().add(dir.clone().multiplyScalar(x)).add(perp.multiplyScalar(h));
    const Tc = S.clone().add(dir.clone().multiplyScalar(d));
    placeBetween(this.upper, S, E); placeBetween(this.fore, E, Tc); this.elbowBall.position.copy(E);
    // 手：前腕の向きに伸ばし、手の甲を palmUp に向ける
    const fwd = Tc.clone().sub(E).normalize();
    this.hand.position.copy(Tc).add(fwd.clone().multiplyScalar(0.04));
    const z = fwd, yv = palmUp.clone().sub(z.clone().multiplyScalar(palmUp.dot(z))).normalize(), xv = yv.clone().cross(z);
    this.hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xv, yv, z));
  }
}

/** 人：あぐらで座り、こちらを向く（+z が正面、-x が本人の右） */
function person(kurta: THREE.Material, hairLong: boolean) {
  const g = new THREE.Group();
  // 座布団
  const cush = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.06, 28), M.cushion); cush.position.y = 0.03; cush.receiveShadow = true; g.add(cush);
  // あぐらの脚（すね）とひざ
  staticLimb(g, V(-0.27, 0.11, 0.06), V(0.13, 0.1, 0.28), 0.062, M.pants);
  staticLimb(g, V(0.27, 0.12, 0.06), V(-0.12, 0.125, 0.29), 0.06, M.pants);
  [V(-0.27, 0.11, 0.06), V(0.27, 0.12, 0.06)].forEach((p) => { const k = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), M.pants); k.position.copy(p); k.castShadow = true; g.add(k); });
  [V(0.17, 0.1, 0.27), V(-0.16, 0.125, 0.29)].forEach((p) => { const f = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), M.skin); f.scale.set(0.05, 0.035, 0.07); f.position.copy(p); g.add(f); });
  // 胴（クルタ）とすそ
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.3, 6, 14), kurta); torso.scale.set(1.12, 1, 0.72); torso.position.y = 0.44; torso.castShadow = true; g.add(torso);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.29, 0.2, 24, 1, true), kurta); skirt.position.y = 0.2; skirt.castShadow = true; g.add(skirt);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 20), kurta); collar.rotation.x = Math.PI / 2; collar.position.y = 0.655; g.add(collar);
  // 頭（首から上は少しゆれる）
  const headG = new THREE.Group(); headG.position.set(0, 0.66, 0); g.add(headG);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 12), M.skin); neck.position.y = 0.03; headG.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 22, 18), M.skin); head.scale.set(0.92, 1.05, 1); head.position.set(0, 0.14, 0.01); head.castShadow = true; headG.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.112, 22, 14, 0, Math.PI * 2, 0, hairLong ? 2.1 : 1.65), M.hair); hair.scale.set(0.95, 1.05, 1.02); hair.position.set(0, 0.155, -0.006); hair.rotation.x = -0.35; headG.add(hair);
  if (hairLong) { const back = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), M.hair); back.scale.set(1, 1.25, 0.6); back.position.set(0, 0.08, -0.07); headG.add(back); }
  [-0.036, 0.036].forEach((x) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), M.eye); e.position.set(x, 0.155, 0.098); headG.add(e); });
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.04, 8), M.skin); nose.rotation.x = Math.PI / 2.2; nose.position.set(0, 0.13, 0.112); headG.add(nose);
  [-0.098, 0.098].forEach((x) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), M.skin); e.scale.set(0.6, 1, 0.8); e.position.set(x, 0.14, 0); headG.add(e); });
  // 肩
  [-0.185, 0.185].forEach((x) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 10), kurta); s.position.set(x, 0.6, 0); s.castShadow = true; g.add(s); });
  return { g, headG, torso };
}

/** タブラー（ダーヤーン）：木の胴・革ひも・ガッタ・皮とシャーヒー */
function dayan() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.098, 0.25, 24), M.wood); body.position.y = 0.125; body.castShadow = true; g.add(body);
  for (let i = 0; i < 16; i++) { // 革ひも
    const a = (i / 16) * Math.PI * 2, s = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.25, 0.004), M.strap);
    s.position.set(Math.cos(a) * 0.088, 0.125, Math.sin(a) * 0.088); s.rotation.y = -a + Math.PI / 2; s.rotation.z = 0; s.lookAt(0, 0.125, 0); s.rotateX(-0.09); g.add(s);
  }
  for (let i = 0; i < 8; i++) { // ガッタ
    const a = ((i + 0.25) / 8) * Math.PI * 2, c = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.055, 10), M.woodLight);
    c.position.set(Math.cos(a) * 0.097, 0.07, Math.sin(a) * 0.097); c.castShadow = true; g.add(c);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.077, 0.008, 8, 32), M.strap); ring.rotation.x = Math.PI / 2; ring.position.y = 0.25; g.add(ring);
  const skin = new THREE.Mesh(new THREE.CircleGeometry(0.075, 32), M.head); skin.rotation.x = -Math.PI / 2; skin.position.y = 0.2505; g.add(skin);
  const sy = new THREE.Mesh(new THREE.CircleGeometry(0.031, 28), M.syahi); sy.rotation.x = -Math.PI / 2; sy.position.y = 0.2512; g.add(sy);
  const top = new THREE.Object3D(); top.position.y = 0.252; g.add(top);
  g.rotation.x = 0.28; // 上面を少し客席側へ傾ける
  return { g, top, r: 0.075 };
}
/** バーヤーン：金属の胴・皮・中心からずれたシャーヒー */
function bayan() {
  const g = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.13, 28, 18, 0, Math.PI * 2, 0.55, Math.PI - 0.55), M.copper); bowl.scale.set(1, 0.78, 1); bowl.position.y = 0.1; bowl.castShadow = true; g.add(bowl);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.008, 8, 32), M.strap); ring.rotation.x = Math.PI / 2; ring.position.y = 0.168; g.add(ring);
  const skin = new THREE.Mesh(new THREE.CircleGeometry(0.068, 32), M.head); skin.rotation.x = -Math.PI / 2; skin.position.y = 0.1685; g.add(skin);
  const sy = new THREE.Mesh(new THREE.CircleGeometry(0.026, 24), M.syahi); sy.rotation.x = -Math.PI / 2; sy.position.set(0, 0.1692, 0.022); g.add(sy);
  const top = new THREE.Object3D(); top.position.y = 0.17; g.add(top);
  g.rotation.x = 0.22;
  return { g, top, r: 0.068 };
}
/** シタール：ひょうたんの胴・長いさお・フレット・弦・上のひょうたん */
function sitar() {
  const g = new THREE.Group();
  const gourd = new THREE.Mesh(new THREE.SphereGeometry(0.16, 26, 20), M.gourd); gourd.scale.set(1, 0.92, 0.82); gourd.castShadow = true; g.add(gourd);
  const plate = new THREE.Mesh(new THREE.CircleGeometry(0.135, 28), M.woodLight); plate.position.z = 0.131; g.add(plate);
  const deco = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.004, 6, 32), M.bone); deco.position.z = 0.132; g.add(deco);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.015), M.bone); bridge.position.set(0, -0.04, 0.138); g.add(bridge);
  const len = 0.95;
  const neck = new THREE.Group(); neck.position.set(0, 0.11, 0.09); g.add(neck);
  const n = new THREE.Mesh(new THREE.BoxGeometry(0.07, len, 0.045), M.wood); n.position.y = len / 2; n.castShadow = true; neck.add(n);
  for (let i = 0; i < 19; i++) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.074, 6), M.brass); f.rotation.z = Math.PI / 2; f.position.set(0, 0.12 + Math.pow(i / 19, 0.85) * (len - 0.2), 0.028); neck.add(f); }
  const pts = [-0.012, 0, 0.012].map((x) => new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(x, -0.15, 0.033), V(x, len - 0.03, 0.033)]), M.string)); pts.forEach((l) => neck.add(l));
  const upper = new THREE.Mesh(new THREE.SphereGeometry(0.07, 18, 14), M.gourd); upper.position.set(0, len - 0.12, -0.05); neck.add(upper);
  for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 8), M.woodLight); p.rotation.z = Math.PI / 2; p.position.set(0.04, len - 0.25 + i * 0.05, 0); neck.add(p); }
  return { g, neck, len };
}

// ---------- 打ち方 → どちらの手で、太鼓のどこを ----------
const RIGHT: Partial<Record<BolKey, number>> = { na: 0.9, tin: 0.55, tun: 0, te: 0.05, re: 0.1 }; // 中心からの距離（皮の半径に対する割合）
const LEFT: Partial<Record<BolKey, number>> = { ge: 0.55, meend: 0.55, ke: 0.15 };
const expand = (b: BolKey, t: number): { bol: BolKey; time: number }[] =>
  b === 'dha' ? [{ bol: 'na', time: t }, { bol: 'ge', time: t }]
    : b === 'dhin' ? [{ bol: 'tin', time: t }, { bol: 'ge', time: t }]
      : b === 'ti_re_ki_ta' ? (['te', 're', 'ke', 'te'] as BolKey[]).map((x, i) => ({ bol: x, time: t + i * 0.07 }))
        : [{ bol: b, time: t }];

/** 叩く手の高さ：叩く少し前に持ち上げ、叩いた瞬間に皮へ、すぐ戻る */
function strikeHeight(dt: number) {
  if (dt < -0.16 || dt > 0.2) return 0.055;
  if (dt < -0.08) return 0.055 + 0.03 * ((dt + 0.16) / 0.08);
  if (dt < 0) return 0.085 * (-dt / 0.08);
  const k = dt / 0.2; return 0.055 * (1 - (1 - k) * (1 - k));
}

export default function Stage3D({ className }: { className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current!; let disposed = false;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene(); scene.background = new THREE.Color('#140d08'); scene.fog = new THREE.Fog('#140d08', 4, 8);
    const cam = new THREE.PerspectiveCamera(30, 2, 0.1, 20);
    // 光：正面上からのスポット（影あり）・暖かい環境光・後ろからの青い縁取り
    scene.add(new THREE.HemisphereLight('#ffe2c0', '#2a1408', 0.85));
    const key = new THREE.SpotLight('#ffd9a8', 26, 9, 0.55, 0.6, 1.4); key.position.set(0.4, 3.2, 2.4); key.target.position.set(0, 0.3, 0); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004;
    scene.add(key, key.target);
    const rim = new THREE.DirectionalLight('#7fa6ff', 0.7); rim.position.set(-2, 2, -3); scene.add(rim);

    // 舞台：じゅうたんと、うしろの幕
    const cv = document.createElement('canvas'); cv.width = cv.height = 512; const c = cv.getContext('2d')!;
    c.fillStyle = '#7d1a1c'; c.fillRect(0, 0, 512, 512);
    c.strokeStyle = '#d8a84e'; c.lineWidth = 14; c.strokeRect(22, 22, 468, 468); c.lineWidth = 4; c.strokeRect(46, 46, 420, 420);
    c.fillStyle = '#5a1012'; c.fillRect(60, 60, 392, 392);
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) { c.fillStyle = (i + j) % 2 ? '#a3402a' : '#c98a3a'; c.beginPath(); c.arc(84 + i * 43, 84 + j * 43, 7, 0, 7); c.fill(); }
    c.fillStyle = '#d8a84e'; c.beginPath(); c.arc(256, 256, 70, 0, 7); c.fill(); c.fillStyle = '#5a1012'; c.beginPath(); c.arc(256, 256, 56, 0, 7); c.fill();
    const rugTex = new THREE.CanvasTexture(cv); rugTex.colorSpace = THREE.SRGBColorSpace; rugTex.anisotropy = 4;
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.7), new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.95 })); rug.rotation.x = -Math.PI / 2; rug.receiveShadow = true; scene.add(rug);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), mat('#2a1a10', 0.9)); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.002; floor.receiveShadow = true; scene.add(floor);
    const cv2 = document.createElement('canvas'); cv2.width = 256; cv2.height = 8; const c2 = cv2.getContext('2d')!;
    for (let x = 0; x < 256; x++) { const v = 0.55 + 0.45 * Math.sin((x / 256) * Math.PI * 18) ** 2; c2.fillStyle = `rgb(${Math.round(70 * v)},${Math.round(14 * v)},${Math.round(20 * v)})`; c2.fillRect(x, 0, 1, 8); }
    const curtTex = new THREE.CanvasTexture(cv2); curtTex.colorSpace = THREE.SRGBColorSpace;
    const curtain = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshStandardMaterial({ map: curtTex, roughness: 1 })); curtain.position.set(0, 1.4, -1.1); scene.add(curtain);

    // ---- シタール奏者（左） ----
    const S = person(M.kurtaS, true); S.g.position.set(-0.6, 0, -0.05); S.g.rotation.y = 0.28; scene.add(S.g);
    const st = sitar(); st.g.position.set(-0.2, 0.19, 0.25); st.g.rotation.z = -0.78; st.g.rotation.y = 0.15; S.g.add(st.g);
    const sR = new Arm(S.g, V(-0.185, 0.6, 0), 0.27, 0.26, V(-0.8, -0.3, -0.4), M.kurtaS);
    const sL = new Arm(S.g, V(0.185, 0.6, 0), 0.27, 0.26, V(0.7, -0.6, -0.2), M.kurtaS);
    // ---- タブラー奏者（右） ----
    const T = person(M.kurtaT, false); T.g.position.set(0.62, 0, -0.05); T.g.rotation.y = -0.28; scene.add(T.g);
    const dy = dayan(); dy.g.position.set(-0.17, 0.02, 0.36); T.g.add(dy.g);
    const by = bayan(); by.g.position.set(0.19, 0.0, 0.35); T.g.add(by.g);
    [dy.g.position, by.g.position].forEach((p) => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.03, 8, 20), M.cushion); r.rotation.x = Math.PI / 2; r.position.set(p.x, 0.02, p.z); T.g.add(r); });
    const tR = new Arm(T.g, V(-0.185, 0.6, 0), 0.27, 0.26, V(-0.9, -0.2, -0.3), M.kurtaT);
    const tL = new Arm(T.g, V(0.185, 0.6, 0), 0.27, 0.26, V(0.9, -0.2, -0.3), M.kurtaT);

    // ---- 音の知らせを受け取る ----
    const now = () => tablaAudio.getContext()?.currentTime ?? performance.now() / 1000;
    const hits: { side: 'R' | 'L'; bol: BolKey; time: number }[] = [];
    let lastR: BolKey = 'na', lastL: BolKey = 'ge';
    const offTabla = tablaAudio.onStrike(({ bol, time }) => {
      for (const e of expand(bol, time)) hits.push({ side: e.bol in LEFT ? 'L' : 'R', bol: e.bol, time: e.time });
      if (hits.length > 200) hits.splice(0, hits.length - 200);
    });
    const plucks: { time: number; semi: number; meend: { at: number; to: number; dur: number }[] }[] = [];
    const chiks: number[] = [];
    let bend = 0;
    const offSitar = sitarAudio.on((e) => {
      if (e.type === 'note') plucks.push({ time: e.time, semi: e.semi, meend: e.meend ?? [] });
      else if (e.type === 'chikari') chiks.push(e.time);
      else if (e.type === 'bend') bend = e.semitones;
      if (plucks.length > 120) plucks.splice(0, plucks.length - 120);
      if (chiks.length > 120) chiks.splice(0, chiks.length - 120);
    });

    // 太鼓の上の位置（奏者から見た座標）
    const tmp = V(), tmpN = V();
    const surface = (drum: { g: THREE.Group; top: THREE.Object3D; r: number }, frac: number, h: number) => {
      drum.top.getWorldPosition(tmp); T.g.worldToLocal(tmp);
      tmpN.set(0, 1, 0).applyEuler(drum.g.rotation);
      const fwd = V(0, 0, 1).applyEuler(drum.g.rotation); // 皮の中心から客席側（奏者から遠い側）
      return tmp.clone().add(fwd.multiplyScalar(drum.r * frac)).add(tmpN.clone().multiplyScalar(h));
    };
    // シタールのさおの上の位置（奏者から見た座標）
    const neckPt = (u: number, out: number, side = 0) => {
      const p = V(side, u * st.len, 0.03 + out); st.neck.localToWorld(p); return S.g.worldToLocal(p);
    };
    const semiToU = (semi: number) => 0.2 + Math.max(0, Math.min(1, (semi + 7) / 31)) * 0.62;

    const resize = () => { const w = el.clientWidth || 1, h = el.clientHeight || 1; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();

    // ドラッグで見る向きを変える
    let az = 0, drag: number | null = null;
    const down = (e: PointerEvent) => { drag = e.clientX; };
    const move = (e: PointerEvent) => { if (drag == null) return; az = Math.max(-0.9, Math.min(0.9, az - (e.clientX - drag) * 0.006)); drag = e.clientX; };
    const up = () => { drag = null; };
    renderer.domElement.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);

    let raf = 0, sitarU = semiToU(0), sitarSemi = 0;
    const t0 = performance.now();
    const frame = () => {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const t = now(), clk = (performance.now() - t0) / 1000;
      // カメラ：ゆっくり左右にゆれる（ドラッグ分も足す）
      const a = az + Math.sin(clk * 0.12) * 0.12;
      cam.position.set(Math.sin(a) * 2.55, 0.95, Math.cos(a) * 2.55 + 0.1); cam.lookAt(0, 0.4, 0.05);

      // ---- タブラー奏者 ----
      const pick = (side: 'R' | 'L') => {
        let best: { bol: BolKey; time: number } | null = null, h = 0.055;
        for (const e of hits) { if (e.side !== side) continue; const dt = t - e.time; if (dt < -0.16 || dt > 0.2) continue; const hh = strikeHeight(dt); if (hh <= h) { h = hh; best = e; } }
        return { bol: best?.bol, h };
      };
      const r = pick('R'), l = pick('L');
      if (r.bol) lastR = r.bol; if (l.bol) lastL = l.bol;
      tR.reach(surface(dy, RIGHT[lastR] ?? 0.5, r.h), V(0, 1, 0.2));
      let lf = LEFT[lastL] ?? 0.5;
      const lm = hits.filter((e) => e.bol === 'meend' && t - e.time >= 0 && t - e.time < 0.5).pop();
      if (lm) lf = 0.55 - 0.5 * Math.min(1, (t - lm.time) / 0.3); // ゲー↑：手首を奥へすべらせる
      tL.reach(surface(by, lf, l.h + (lastL === 'ke' ? -0.01 : 0)), V(0, 1, 0.2));
      const recent = hits.some((e) => t - e.time >= 0 && t - e.time < 0.25);
      T.headG.rotation.x = 0.12 + Math.sin(clk * 1.7) * 0.03 + (recent ? 0.03 : 0);
      T.headG.rotation.z = Math.sin(clk * 0.8) * 0.05;
      T.torso.rotation.z = Math.sin(clk * 0.6) * 0.015;

      // ---- シタール奏者 ----
      let cur: (typeof plucks)[number] | null = null;
      for (const p of plucks) if (p.time <= t) cur = p;
      let pull = 0;
      if (cur) {
        sitarSemi = cur.semi;
        for (const m of cur.meend) { const k = (t - cur.time - m.at) / Math.max(0.05, m.dur); if (k > 0) { pull = Math.min(1, k) * (m.to - cur.semi); if (k >= 1) pull = m.to - cur.semi; } }
      }
      pull += bend;
      const targetU = semiToU(sitarSemi);
      sitarU += (targetU - sitarU) * 0.25; // 左手はフレットに沿ってすべる
      sL.reach(neckPt(sitarU, 0.025, 0.02 + Math.min(0.06, Math.abs(pull) * 0.018)), V(0, 0, 1));
      // 右手：弾いた瞬間にはじく
      let flick = 0;
      const lastPluck = cur ? t - cur.time : 9, lastChik = chiks.length ? Math.min(...chiks.filter((x) => x <= t).map((x) => t - x), 9) : 9;
      const f = (dt: number) => (dt >= 0 && dt < 0.14 ? Math.sin((dt / 0.14) * Math.PI) : 0);
      flick = Math.max(f(lastPluck), f(lastChik));
      const upc = plucks.find((p) => p.time > t && p.time - t < 0.08); if (upc) flick = Math.max(flick, 0.4 * (1 - (upc.time - t) / 0.08));
      sR.reach(neckPt(0.02, 0.05 + flick * 0.03, -0.01 - flick * 0.03 + (lastChik < lastPluck ? -0.03 : 0)), V(0, 0, 1));
      S.headG.rotation.x = 0.1 + Math.sin(clk * 0.9) * 0.03;
      S.headG.rotation.z = Math.sin(clk * 0.5) * 0.06 + (cur && t - cur.time < 0.6 ? Math.sin(clk * 2.2) * 0.02 : 0);
      S.torso.rotation.z = Math.sin(clk * 0.45) * 0.02;

      renderer.render(scene, cam);
    };
    frame();

    return () => {
      disposed = true; cancelAnimationFrame(raf); offTabla(); offSitar(); ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      scene.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); });
      rugTex.dispose(); curtTex.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);
  return <div ref={box} className={className} style={{ touchAction: 'pan-y' }} />;
}

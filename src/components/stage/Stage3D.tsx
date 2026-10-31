import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { tablaAudio } from '../../audio/tablaAudioEngine';
import { sitarAudio } from '../../audio/sitarEngine';
import { BolKey } from '../../types/tabla';

/**
 * 小さな舞台：シタール奏者（左）とタブラー奏者（右）が、鳴った音に合わせて演奏する3D表示。
 * - 人も楽器も、ろくろ（回転体）・円柱・球などを組み合わせて作り、木目・皮・布の模様は絵（キャンバス）で描く。
 * - 腕は「肩・ひじ・手首」の2関節で、手の目標位置から角度を計算する。指は打ち方に合わせて曲げのばしする。
 * - 音の時刻（AudioContext の時計）に合わせて動くので、自動演奏・合奏・自分で叩いた音のどれにも反応する。
 */

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
type Pt = [number, number];

// ---------- 絵（テクスチャ）を描く ----------
function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
/** 木目 */
const woodTex = (base: string, dark: string) => canvasTex(256, 256, (c) => {
  c.fillStyle = base; c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) {
    const x = rnd() * 256, w = 0.6 + rnd() * 2.2; c.strokeStyle = dark; c.globalAlpha = 0.15 + rnd() * 0.3; c.lineWidth = w;
    c.beginPath(); c.moveTo(x, 0); for (let y = 0; y <= 256; y += 16) c.lineTo(x + Math.sin(y / 30 + i) * 3, y); c.stroke();
  }
  c.globalAlpha = 1;
});
/** 布の織り目 */
const clothTex = (base: string, line: string) => canvasTex(128, 128, (c) => {
  c.fillStyle = base; c.fillRect(0, 0, 128, 128); c.globalAlpha = 0.08; c.fillStyle = line;
  for (let i = 0; i < 128; i += 2) { c.fillRect(i, 0, 1, 128); c.fillRect(0, i, 128, 1); }
  c.globalAlpha = 1;
}, [6, 6]);
/** 太鼓の皮（上から見た絵）：キナール・マイダン・シャーヒー */
const headTex = (offset: number) => canvasTex(512, 512, (c) => {
  const g = c.createRadialGradient(240, 230, 10, 256, 256, 256); g.addColorStop(0, '#efdcb4'); g.addColorStop(0.8, '#dcc08c'); g.addColorStop(1, '#b8945e');
  c.fillStyle = g; c.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(120,80,40,${rnd() * 0.06})`; c.fillRect(rnd() * 512, rnd() * 512, 2, 2); }
  if (!offset) { c.strokeStyle = 'rgba(90,60,30,.6)'; c.lineWidth = 5; c.beginPath(); c.arc(256, 256, 205, 0, 7); c.stroke(); c.strokeStyle = 'rgba(255,240,210,.5)'; c.lineWidth = 2; c.beginPath(); c.arc(256, 256, 211, 0, 7); c.stroke(); }
  const cx = 256, cy = 256 + offset, r = offset ? 92 : 104;
  const s = c.createRadialGradient(cx - r * 0.35, cy - r * 0.4, 4, cx, cy, r); s.addColorStop(0, '#4a4a52'); s.addColorStop(0.35, '#1a1a1e'); s.addColorStop(1, '#070708');
  c.fillStyle = s; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
  for (let k = 0.9; k > 0.25; k -= 0.12) { c.strokeStyle = 'rgba(70,70,80,.35)'; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, r * k, 0, 7); c.stroke(); }
  c.strokeStyle = 'rgba(110,90,60,.6)'; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, r + 2, 0, 7); c.stroke();
});
/** シタールの表板：象牙色の花の象嵌 */
const plateTex = () => canvasTex(256, 256, (c) => {
  c.fillStyle = '#9a5a2a'; c.fillRect(0, 0, 256, 256);
  c.strokeStyle = '#f1e6cf'; c.lineWidth = 4; c.beginPath(); c.arc(128, 128, 118, 0, 7); c.stroke(); c.lineWidth = 2; c.beginPath(); c.arc(128, 128, 104, 0, 7); c.stroke();
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; c.save(); c.translate(128 + Math.cos(a) * 111, 128 + Math.sin(a) * 111); c.rotate(a); c.fillStyle = '#f1e6cf'; c.beginPath(); c.ellipse(0, 0, 5, 2.4, 0, 0, 7); c.fill(); c.restore(); }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.save(); c.translate(128, 128); c.rotate(a); c.fillStyle = 'rgba(241,230,207,.85)'; c.beginPath(); c.ellipse(0, -40, 9, 22, 0, 0, 7); c.fill(); c.restore(); }
  c.fillStyle = '#f1e6cf'; c.beginPath(); c.arc(128, 128, 9, 0, 7); c.fill();
});
/** 刺しゅうのある布（クッション） */
const brocadeTex = (base: string, gold: string) => canvasTex(128, 128, (c) => {
  c.fillStyle = base; c.fillRect(0, 0, 128, 128); c.fillStyle = gold;
  for (let y = 8; y < 128; y += 32) for (let x = 8; x < 128; x += 32) { c.beginPath(); c.moveTo(x + 8, y); c.lineTo(x + 16, y + 8); c.lineTo(x + 8, y + 16); c.lineTo(x, y + 8); c.fill(); }
  c.fillRect(0, 0, 128, 3); c.fillRect(0, 125, 128, 3);
}, [3, 1]);

// ---------- 形の部品 ----------
const lathe = (pts: Pt[], seg = 40) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
function placeAlong(obj: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3) { obj.position.copy(a); obj.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize()); }
/** 根元から先へ細くなる筒（腕・脚）。原点から +y に length 伸びる。両端に丸み */
function tube(r1: number, r2: number, length: number, m: THREE.Material) {
  const g = new THREE.Group();
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, length, 16), m); c.position.y = length / 2; c.castShadow = true; g.add(c);
  const e1 = new THREE.Mesh(new THREE.SphereGeometry(r1, 14, 10), m); e1.castShadow = true; g.add(e1);
  const e2 = new THREE.Mesh(new THREE.SphereGeometry(r2, 14, 10), m); e2.position.y = length; g.add(e2);
  return g;
}
function staticTube(parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, r1: number, r2: number, m: THREE.Material) {
  const t = tube(r1, r2, a.distanceTo(b), m); placeAlong(t, a, b); parent.add(t); return t;
}

// ---------- 手：手のひら＋4本の指（2節）＋親指。打ち方で指の形を変える ----------
type Shape = 'rest' | 'index' | 'two' | 'fingers' | 'flat';
const OPEN: Record<Shape, [number, number, number, number]> = { // 人差し・中・薬・小指（1=のばす、0=曲げる）
  rest: [0.55, 0.45, 0.4, 0.35], index: [1, 0.1, 0.05, 0.05], two: [1, 1, 0.1, 0.05], fingers: [0.15, 1, 1, 1], flat: [1, 1, 1, 1],
};
class Hand {
  root = new THREE.Group();
  joints: { a: THREE.Group; b: THREE.Group }[] = [];
  open = [0.5, 0.5, 0.5, 0.5];
  constructor(side: 1 | -1, skin: THREE.Material) { // side: 右手=+1（親指は体の中心側＝+x）、左手=-1
    const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), skin); palm.scale.set(0.04, 0.017, 0.047); palm.position.z = 0.04; palm.castShadow = true; this.root.add(palm);
    const xs = [0.024, 0.008, -0.008, -0.023], lens = [[0.03, 0.026], [0.033, 0.028], [0.031, 0.026], [0.024, 0.02]];
    xs.forEach((x, i) => {
      const a = new THREE.Group(); a.position.set(side * x, 0, 0.082 - (i === 3 ? 0.008 : 0)); this.root.add(a);
      const s1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0085, lens[i][0], 3, 8), skin); s1.rotation.x = Math.PI / 2; s1.position.z = lens[i][0] / 2; s1.castShadow = true; a.add(s1);
      const b = new THREE.Group(); b.position.z = lens[i][0]; a.add(b);
      const s2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0078, lens[i][1], 3, 8), skin); s2.rotation.x = Math.PI / 2; s2.position.z = lens[i][1] / 2; b.add(s2);
      this.joints.push({ a, b });
    });
    const th = new THREE.Group(); th.position.set(side * 0.034, -0.006, 0.03); th.rotation.set(0.35, side * 0.75, 0); this.root.add(th);
    const t1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.03, 3, 8), skin); t1.rotation.x = Math.PI / 2; t1.position.z = 0.017; th.add(t1);
  }
  update(shape: Shape, k = 0.35) {
    OPEN[shape].forEach((o, i) => {
      this.open[i] += (o - this.open[i]) * k;
      const curl = 1 - this.open[i];
      this.joints[i].a.rotation.x = 0.12 + curl * 1.25; this.joints[i].b.rotation.x = 0.1 + curl * 1.45;
    });
  }
}

/** 2関節の腕：肩 S から手首の目標 W へ。ひじは pole の方向へ曲がる。袖は手首の近くまで */
class Arm {
  upper: THREE.Group; fore: THREE.Group; cuff: THREE.Group; hand: Hand;
  constructor(parent: THREE.Object3D, public S: THREE.Vector3, public a: number, public b: number, public pole: THREE.Vector3, sleeve: THREE.Material, skin: THREE.Material, side: 1 | -1) {
    this.upper = tube(0.05, 0.043, a, sleeve);
    this.fore = tube(0.043, 0.036, b * 0.82, sleeve);
    this.cuff = tube(0.028, 0.026, b * 0.2, skin);
    this.hand = new Hand(side, skin);
    parent.add(this.upper, this.fore, this.cuff, this.hand.root);
  }
  reach(W: THREE.Vector3, palmUp: THREE.Vector3, point?: THREE.Vector3) {
    const S = this.S, d0 = W.clone().sub(S), d = Math.min(d0.length(), this.a + this.b - 1e-3), dir = d0.normalize();
    const x = (this.a * this.a - this.b * this.b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, this.a * this.a - x * x));
    const perp = this.pole.clone().sub(dir.clone().multiplyScalar(this.pole.dot(dir))).normalize();
    const E = S.clone().add(dir.clone().multiplyScalar(x)).add(perp.multiplyScalar(h));
    const Wc = S.clone().add(dir.clone().multiplyScalar(d));
    placeAlong(this.upper, S, E); placeAlong(this.fore, E, Wc);
    const fd = Wc.clone().sub(E).normalize();
    placeAlong(this.cuff, E.clone().add(fd.clone().multiplyScalar(this.b * 0.8)), Wc);
    // 手：指先を point（叩く所）へ向け、手の甲を palmUp に
    const z = (point ? point.clone().sub(Wc) : fd.clone()).normalize();
    const yv = palmUp.clone().sub(z.clone().multiplyScalar(palmUp.dot(z))).normalize(), xv = yv.clone().cross(z);
    this.hand.root.position.copy(Wc);
    this.hand.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xv, yv, z));
  }
}

interface Look { kurta: THREE.Material; pants: THREE.Material; skin: THREE.Material; hair: THREE.Material; lip: THREE.Material; white: THREE.Material; iris: THREE.Material; longHair: boolean; mustache: boolean; vest?: THREE.Material; shawl?: THREE.Material }
/** 人：あぐらで座り、こちらを向く（+z が正面、-x が本人の右） */
function person(L: Look) {
  const g = new THREE.Group();
  // あぐら：太もも → ひざ → すねが前で交差
  const hipR = V(-0.1, 0.085, 0), hipL = V(0.1, 0.085, 0), kneeR = V(-0.31, 0.075, 0.19), kneeL = V(0.31, 0.08, 0.19);
  staticTube(g, hipR, kneeR, 0.085, 0.068, L.pants); staticTube(g, hipL, kneeL, 0.085, 0.068, L.pants);
  const ankR = V(0.1, 0.055, 0.32), ankL = V(-0.09, 0.09, 0.335);
  staticTube(g, kneeR, ankR, 0.066, 0.045, L.pants); staticTube(g, kneeL, ankL, 0.066, 0.045, L.pants);
  [[ankR, 1], [ankL, -1]].forEach(([p, s]) => { const f = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), L.skin); f.scale.set(0.075, 0.03, 0.04); const pp = p as THREE.Vector3; f.position.set(pp.x + (s as number) * 0.05, pp.y - 0.005, pp.z + 0.01); f.rotation.y = (s as number) * 0.25; f.castShadow = true; g.add(f); });
  // 胴（クルタ）：ろくろで、すそが広がり、腰・胸・肩の形
  const body = new THREE.Mesh(lathe([[0, 0.03], [0.3, 0.04], [0.285, 0.1], [0.23, 0.18], [0.17, 0.28], [0.165, 0.36], [0.178, 0.44], [0.176, 0.52], [0.155, 0.58], [0.11, 0.618], [0.06, 0.636], [0.045, 0.65]]), L.kurta);
  body.scale.set(1.08, 1, 0.74); body.castShadow = true; g.add(body);
  // 前立て（ボタンの列）
  for (let i = 0; i < 4; i++) { const bt = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), L.white); bt.position.set(0, 0.6 - i * 0.045, 0.132 - i * 0.002); g.add(bt); }
  if (L.vest) { const v = new THREE.Mesh(lathe([[0.17, 0.3], [0.168, 0.36], [0.182, 0.44], [0.18, 0.52], [0.16, 0.58], [0.115, 0.62], [0.07, 0.638]]), L.vest); v.scale.set(1.1, 1, 0.77); v.castShadow = true; g.add(v); }
  if (L.shawl) { // 左肩にかけたショール
    const curve = new THREE.CatmullRomCurve3([V(0.05, 0.64, 0.12), V(0.15, 0.62, 0.08), V(0.2, 0.58, -0.02), V(0.17, 0.45, -0.12), V(0.15, 0.25, -0.13)]);
    const sh = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.035, 8), L.shawl); sh.scale.set(1, 1, 0.8); sh.castShadow = true; g.add(sh);
  }
  [-0.172, 0.172].forEach((x) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.062, 16, 12), L.vest ?? L.kurta); s.scale.set(1.05, 0.85, 0.9); s.position.set(x, 0.575, 0); s.castShadow = true; g.add(s); });
  // 頭
  const headG = new THREE.Group(); headG.position.set(0, 0.635, 0); g.add(headG);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.046, 0.09, 14), L.skin); neck.position.y = 0.035; headG.add(neck);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.1, 28, 22), L.skin); skull.scale.set(0.86, 1.06, 0.97); skull.position.set(0, 0.16, 0.005); skull.castShadow = true; headG.add(skull);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.062, 20, 14), L.skin); jaw.scale.set(1, 0.78, 0.9); jaw.position.set(0, 0.105, 0.022); headG.add(jaw);
  const nb = new THREE.Mesh(new THREE.CapsuleGeometry(0.0105, 0.03, 3, 8), L.skin); nb.position.set(0, 0.148, 0.093); nb.rotation.x = 0.35; headG.add(nb);
  const nt = new THREE.Mesh(new THREE.SphereGeometry(0.0135, 12, 10), L.skin); nt.position.set(0, 0.129, 0.101); headG.add(nt);
  [-1, 1].forEach((s) => { const w = new THREE.Mesh(new THREE.SphereGeometry(0.0105, 10, 8), L.skin); w.position.set(s * 0.013, 0.124, 0.096); headG.add(w); });
  const lids: THREE.Mesh[] = [];
  [-1, 1].forEach((s) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0145, 14, 10), L.white); eye.position.set(s * 0.033, 0.16, 0.079); headG.add(eye);
    const ir = new THREE.Mesh(new THREE.SphereGeometry(0.0082, 12, 10), L.iris); ir.position.set(s * 0.033, 0.16, 0.091); headG.add(ir);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.0158, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), L.skin); lid.position.set(s * 0.033, 0.16, 0.079); lid.scale.y = 0.35; headG.add(lid); lids.push(lid);
    const br = new THREE.Mesh(new THREE.CapsuleGeometry(0.0045, 0.028, 3, 8), L.hair); br.rotation.z = Math.PI / 2 + s * 0.12; br.position.set(s * 0.034, 0.184, 0.087); headG.add(br);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 10), L.skin); ear.scale.set(0.45, 1, 0.75); ear.position.set(s * 0.085, 0.152, 0); headG.add(ear);
  });
  const ul = new THREE.Mesh(new THREE.CapsuleGeometry(0.005, 0.024, 3, 8), L.lip); ul.rotation.z = Math.PI / 2; ul.position.set(0, 0.105, 0.087); headG.add(ul);
  const ll = new THREE.Mesh(new THREE.CapsuleGeometry(0.0058, 0.02, 3, 8), L.lip); ll.rotation.z = Math.PI / 2; ll.position.set(0, 0.096, 0.084); headG.add(ll);
  if (L.mustache) [-1, 1].forEach((s) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.0055, 0.024, 3, 8), L.hair); m.rotation.z = Math.PI / 2 + s * 0.35; m.position.set(s * 0.013, 0.113, 0.095); headG.add(m); });
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.104, 26, 18, 0, Math.PI * 2, 0, 1.85), L.hair); hair.scale.set(0.9, 1.04, 1.0); hair.position.set(0, 0.168, -0.01); hair.rotation.x = -0.5; hair.castShadow = true; headG.add(hair);
  if (L.longHair) { const bk = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 14), L.hair); bk.scale.set(0.92, 1.25, 0.6); bk.position.set(0, 0.12, -0.06); bk.castShadow = true; headG.add(bk); }
  return { g, headG, body, lids };
}

/** ダーヤーン：木の胴（ろくろ）・16本の革ひも・8つのガッタ・編み込みの縁・皮 */
function dayan(m: Record<string, THREE.Material>) {
  const g = new THREE.Group();
  const prof: Pt[] = [[0, 0], [0.094, 0], [0.101, 0.03], [0.104, 0.1], [0.1, 0.18], [0.088, 0.24], [0.08, 0.255], [0, 0.255]];
  const body = new THREE.Mesh(lathe(prof), m.wood); body.castShadow = true; g.add(body);
  const rOf = (y: number) => { for (let i = 1; i < prof.length; i++) if (prof[i][1] >= y) { const [r0, y0] = prof[i - 1], [r1, y1] = prof[i]; return r0 + ((r1 - r0) * (y - y0)) / Math.max(1e-6, y1 - y0); } return 0.08; };
  for (let i = 0; i < 16; i++) { // 革ひも：縁から胴にそって下へ
    const a = (i / 16) * Math.PI * 2, a2 = a + ((i % 2 ? -1 : 1) * Math.PI) / 16 * 0.8;
    const pts = [0.252, 0.2, 0.14, 0.08, 0.02].map((y, k) => { const t = k / 4, aa = a + (a2 - a) * t, r = rOf(y) + 0.004; return V(Math.cos(aa) * r, y, Math.sin(aa) * r); });
    const s = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.0042, 5), m.strap); s.castShadow = true; g.add(s);
  }
  for (let i = 0; i < 8; i++) { // ガッタ
    const a = ((i + 0.25) / 8) * Math.PI * 2, r = rOf(0.08) + 0.018, c = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.017, 0.062, 14), m.woodLight);
    c.position.set(Math.cos(a) * r, 0.08, Math.sin(a) * r); c.castShadow = true; g.add(c);
  }
  const braid = new THREE.Mesh(new THREE.TorusGeometry(0.081, 0.0085, 10, 64), m.braid); braid.rotation.x = Math.PI / 2; braid.position.y = 0.254; braid.castShadow = true; g.add(braid);
  const head = new THREE.Mesh(new THREE.CircleGeometry(0.078, 48), m.headD); head.rotation.x = -Math.PI / 2; head.position.y = 0.2565; g.add(head);
  const top = new THREE.Object3D(); top.position.y = 0.258; g.add(top);
  g.rotation.x = 0.26; // 上面を少し客席側へ傾ける
  return { g, top, r: 0.078 };
}
/** バーヤーン：つやのある金属の胴（ろくろ）・革ひも・皮（シャーヒーは中心からずれる） */
function bayan(m: Record<string, THREE.Material>) {
  const g = new THREE.Group();
  const prof: Pt[] = [[0, 0.005], [0.06, 0.005], [0.11, 0.03], [0.136, 0.08], [0.13, 0.13], [0.106, 0.165], [0.084, 0.176], [0, 0.176]];
  const bowl = new THREE.Mesh(lathe(prof, 48), m.metal); bowl.castShadow = true; g.add(bowl);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const pts = prof.slice(1, 6).reverse().map(([r, y]) => V(Math.cos(a) * (r + 0.004), y, Math.sin(a) * (r + 0.004)));
    const s = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.0036, 5), m.strap); g.add(s);
  }
  const braid = new THREE.Mesh(new THREE.TorusGeometry(0.086, 0.0085, 10, 64), m.braid); braid.rotation.x = Math.PI / 2; braid.position.y = 0.176; g.add(braid);
  const head = new THREE.Mesh(new THREE.CircleGeometry(0.083, 48), m.headB); head.rotation.x = -Math.PI / 2; head.position.y = 0.1775; g.add(head);
  const top = new THREE.Object3D(); top.position.y = 0.179; g.add(top);
  g.rotation.x = 0.2;
  return { g, top, r: 0.083 };
}
/** シタール：ひょうたんの胴・象嵌の表板・長いさお・アーチ形のフレット・弦・糸巻き・上のひょうたん */
function sitar(m: Record<string, THREE.Material>) {
  const g = new THREE.Group();
  const gourd = new THREE.Mesh(new THREE.SphereGeometry(0.17, 36, 26), m.gourd); gourd.scale.set(1, 0.95, 0.78); gourd.castShadow = true; g.add(gourd);
  const plate = new THREE.Mesh(new THREE.CircleGeometry(0.142, 40), m.plate); plate.position.z = 0.122; g.add(plate);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.012, 0.016), m.bone); bridge.position.set(0, -0.045, 0.13); g.add(bridge);
  const len = 0.95, neck = new THREE.Group(); neck.position.set(0, 0.11, 0.085); g.add(neck);
  const n = new THREE.Mesh(new THREE.BoxGeometry(0.072, len, 0.045), m.neck); n.position.y = len / 2; n.castShadow = true; neck.add(n);
  [-1, 1].forEach((s) => { const inl = new THREE.Mesh(new THREE.BoxGeometry(0.004, len, 0.046), m.bone); inl.position.set(s * 0.036, len / 2, 0); neck.add(inl); });
  for (let i = 0; i < 19; i++) { // アーチ形のフレット
    const f = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.0022, 6, 14, Math.PI), m.brass); f.position.set(0, 0.12 + Math.pow(i / 19, 0.85) * (len - 0.2), 0.022); f.rotation.x = Math.PI / 2; f.scale.set(1, 1, 0.45); neck.add(f);
  }
  [-0.012, -0.004, 0.004, 0.012].forEach((x) => neck.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(x, -0.17, 0.042), V(x, len - 0.03, 0.04)]), m.string as THREE.LineBasicMaterial)));
  const upper = new THREE.Mesh(new THREE.SphereGeometry(0.075, 22, 16), m.gourd); upper.position.set(0, len - 0.13, -0.055); upper.castShadow = true; neck.add(upper);
  for (let i = 0; i < 6; i++) { // 糸巻き
    const p = new THREE.Group(); p.position.set(i % 2 ? 0.05 : -0.05, len - 0.3 + i * 0.045, 0); neck.add(p);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.06, 8), m.woodLight); st.rotation.z = Math.PI / 2; p.add(st);
    const kn = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), m.woodLight); kn.position.x = (i % 2 ? 1 : -1) * 0.03; p.add(kn);
  }
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 12), m.woodLight); fin.position.y = len + 0.02; neck.add(fin);
  return { g, neck, len };
}

// ---------- 打ち方 → どちらの手で、太鼓のどこを、どの指の形で ----------
const RIGHT: Partial<Record<BolKey, number>> = { na: 0.88, tin: 0.55, tun: 0, te: 0.05, re: 0.1 }; // 中心からの距離（皮の半径に対する割合）
const LEFT: Partial<Record<BolKey, number>> = { ge: 0.5, meend: 0.5, ke: 0.1 };
const SHAPE: Partial<Record<BolKey, Shape>> = { na: 'index', tin: 'index', tun: 'index', re: 'index', te: 'fingers', ge: 'two', meend: 'two', ke: 'flat' };
const expand = (b: BolKey, t: number): { bol: BolKey; time: number }[] =>
  b === 'dha' ? [{ bol: 'na', time: t }, { bol: 'ge', time: t }]
    : b === 'dhin' ? [{ bol: 'tin', time: t }, { bol: 'ge', time: t }]
      : b === 'ti_re_ki_ta' ? (['te', 're', 'ke', 'te'] as BolKey[]).map((x, i) => ({ bol: x, time: t + i * 0.07 }))
        : [{ bol: b, time: t }];

/** 叩く手の高さ：叩く少し前に持ち上げ、叩いた瞬間に皮へ、すぐ戻る */
function strikeHeight(dt: number) {
  if (dt < -0.16 || dt > 0.2) return 0.05;
  if (dt < -0.08) return 0.05 + 0.03 * ((dt + 0.16) / 0.08);
  if (dt < 0) return 0.08 * (-dt / 0.08);
  const k = dt / 0.2; return 0.05 * (1 - (1 - k) * (1 - k));
}

export default function Stage3D({ className }: { className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current!; let disposed = false;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    el.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, { width: '100%', height: '100%', display: 'block' });

    const scene = new THREE.Scene(); scene.background = new THREE.Color('#120b07'); scene.fog = new THREE.Fog('#120b07', 4.5, 9);
    // まわりの映り込み（金属やつやのある木に光が映る）
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environment = envTex; scene.environmentIntensity = 0.35;
    const cam = new THREE.PerspectiveCamera(30, 2, 0.1, 20);
    scene.add(new THREE.HemisphereLight('#ffe0bc', '#2a1408', 0.45));
    const key = new THREE.SpotLight('#ffd6a0', 30, 9, 0.6, 0.65, 1.4); key.position.set(0.5, 3.3, 2.5); key.target.position.set(0, 0.3, 0); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0003; key.shadow.radius = 4; scene.add(key, key.target);
    const fill = new THREE.DirectionalLight('#ffcf9a', 0.35); fill.position.set(-2.5, 1.2, 2); scene.add(fill);
    const rim = new THREE.DirectionalLight('#8fb0ff', 0.9); rim.position.set(-1.5, 2.2, -3); scene.add(rim);

    // ---- 材質 ----
    const texs: THREE.Texture[] = [];
    const T = <X extends THREE.Texture>(t: X) => { texs.push(t); return t; };
    const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);
    const phys = (o: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(o);
    const skinA = std({ color: '#a8673f', roughness: 0.58 });
    const skinB = std({ color: '#b5764c', roughness: 0.58 });
    const cloth = (c: string, l: string) => phys({ map: T(clothTex(c, l)), roughness: 0.88, sheen: 0.45, sheenColor: new THREE.Color(c).lerp(new THREE.Color('#ffffff'), 0.35), sheenRoughness: 0.7 });
    const M: Record<string, THREE.Material> = {
      wood: phys({ map: T(woodTex('#5a2c12', '#2a1206')), roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
      woodLight: phys({ map: T(woodTex('#a8682f', '#5a3010')), roughness: 0.4, clearcoat: 0.4 }),
      neck: phys({ map: T(woodTex('#6a3416', '#2e1406')), roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.25 }),
      gourd: phys({ color: '#6e2f14', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 }),
      plate: phys({ map: T(plateTex()), roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
      metal: std({ color: '#c47a45', roughness: 0.22, metalness: 1 }),
      strap: std({ color: '#3e2410', roughness: 0.75 }),
      braid: std({ map: T(canvasTex(64, 8, (c) => { c.fillStyle = '#4a2c12'; c.fillRect(0, 0, 64, 8); c.strokeStyle = '#7a4c22'; c.lineWidth = 2; for (let x = -8; x < 72; x += 4) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 6, 8); c.stroke(); } }, [24, 1])), roughness: 0.8 }),
      headD: std({ map: T(headTex(0)), roughness: 0.6 }),
      headB: std({ map: T(headTex(-70)), roughness: 0.6 }),
      bone: std({ color: '#efe6d0', roughness: 0.35 }),
      brass: std({ color: '#d8b260', roughness: 0.25, metalness: 0.9 }),
      string: new THREE.LineBasicMaterial({ color: '#efe8d6', transparent: true, opacity: 0.8 }),
    };
    const hair = std({ color: '#140e0b', roughness: 0.5 }), lip = std({ color: '#7a4232', roughness: 0.5 }), white = std({ color: '#ece6dc', roughness: 0.3 }), iris = std({ color: '#2a170d', roughness: 0.2 });

    // ---- 舞台：白い敷布（ガッディー）・クッション・じゅうたん・幕 ----
    const stage = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.1, 1.75), phys({ map: T(clothTex('#d8cfbd', '#9a907c')), roughness: 0.95, sheen: 0.3, sheenColor: '#efe6d4' }));
    stage.position.set(0, -0.05, 0.05); stage.receiveShadow = true; scene.add(stage);
    const rugTex = T(canvasTex(512, 256, (c) => {
      c.fillStyle = '#6e1518'; c.fillRect(0, 0, 512, 256); c.strokeStyle = '#d4a24a'; c.lineWidth = 10; c.strokeRect(10, 10, 492, 236); c.lineWidth = 3; c.strokeRect(26, 26, 460, 204);
      for (let i = 0; i < 14; i++) for (let j = 0; j < 6; j++) { c.fillStyle = (i + j) % 2 ? '#a3402a' : '#c98a3a'; c.beginPath(); c.arc(46 + i * 32, 52 + j * 30, 5, 0, 7); c.fill(); }
    }));
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.0), std({ map: rugTex, roughness: 0.95 })); rug.rotation.x = -Math.PI / 2; rug.position.set(0, -0.098, 1.3); rug.receiveShadow = true; scene.add(rug);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), std({ color: '#24160d', roughness: 0.9 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.1; floor.receiveShadow = true; scene.add(floor);
    // 幕：本当にひだのある面
    const cg = new THREE.PlaneGeometry(7, 3.2, 140, 1); const cp = cg.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < cp.count; i++) cp.setZ(i, Math.sin(cp.getX(i) * 9) * 0.06 + Math.sin(cp.getX(i) * 23) * 0.015);
    cg.computeVertexNormals();
    const curtain = new THREE.Mesh(cg, phys({ color: '#4e0d12', roughness: 0.85, sheen: 1, sheenColor: '#b03040', sheenRoughness: 0.5 })); curtain.position.set(0, 1.5, -1.0); curtain.receiveShadow = true; scene.add(curtain);
    const bolsterM = phys({ map: T(brocadeTex('#7a1a1e', '#d4a24a')), roughness: 0.8, sheen: 0.8, sheenColor: '#ffd' });
    [-0.62, 0.62].forEach((x) => { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.42, 6, 18), bolsterM); b.rotation.z = Math.PI / 2; b.position.set(x, 0.1, -0.42); b.castShadow = true; scene.add(b); });

    // ---- シタール奏者（左） ----
    const S = person({ kurta: cloth('#d29a3c', '#6a4410'), pants: cloth('#efe8da', '#9a907c'), skin: skinB, hair, lip, white, iris, longHair: true, mustache: false, vest: cloth('#4a1a22', '#c9a24a') });
    S.g.position.set(-0.6, 0, -0.05); S.g.rotation.y = 0.28; scene.add(S.g);
    const st = sitar(M); st.g.position.set(-0.2, 0.18, 0.25); st.g.rotation.z = -0.78; st.g.rotation.y = 0.15; S.g.add(st.g);
    const sleeveS = cloth('#d29a3c', '#6a4410');
    const sR = new Arm(S.g, V(-0.172, 0.575, 0), 0.27, 0.25, V(-0.8, -0.3, -0.4), sleeveS, skinB, 1);
    const sL = new Arm(S.g, V(0.172, 0.575, 0), 0.27, 0.25, V(0.7, -0.6, -0.2), sleeveS, skinB, -1);
    // ---- タブラー奏者（右） ----
    const P = person({ kurta: cloth('#f1ead8', '#a89c84'), pants: cloth('#f1ead8', '#a89c84'), skin: skinA, hair, lip, white, iris, longHair: false, mustache: true, shawl: cloth('#7a1c22', '#e0b050') });
    P.g.position.set(0.62, 0, -0.05); P.g.rotation.y = -0.28; scene.add(P.g);
    const dy = dayan(M); dy.g.position.set(-0.17, 0.035, 0.37); P.g.add(dy.g);
    const by = bayan(M); by.g.position.set(0.19, 0.03, 0.36); P.g.add(by.g);
    const ringM = phys({ map: T(brocadeTex('#2c3a6a', '#d4a24a')), roughness: 0.85, sheen: 0.6 });
    [dy.g.position, by.g.position].forEach((p) => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.032, 10, 24), ringM); r.rotation.x = Math.PI / 2; r.position.set(p.x, 0.03, p.z); r.castShadow = true; P.g.add(r); });
    const hammer = new THREE.Group(); hammer.position.set(0.42, 0.012, 0.42); hammer.rotation.y = 0.6; P.g.add(hammer); // チューニング用の小さなハンマー
    const hh = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.07, 10), M.brass); hh.rotation.z = Math.PI / 2; hammer.add(hh);
    const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.007, 0.12, 8), M.woodLight); hd.rotation.x = Math.PI / 2; hd.position.z = 0.06; hammer.add(hd);
    const sleeveT = cloth('#f1ead8', '#a89c84');
    const tR = new Arm(P.g, V(-0.172, 0.575, 0), 0.27, 0.25, V(-0.9, -0.2, -0.3), sleeveT, skinA, 1);
    const tL = new Arm(P.g, V(0.172, 0.575, 0), 0.27, 0.25, V(0.9, -0.2, -0.3), sleeveT, skinA, -1);

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

    // 太鼓の皮の上の点（タブラー奏者から見た座標）
    const surface = (drum: { g: THREE.Group; top: THREE.Object3D; r: number }, frac: number, h: number) => {
      const p = V(); drum.top.getWorldPosition(p); P.g.worldToLocal(p);
      const n = V(0, 1, 0).applyEuler(drum.g.rotation), fwd = V(0, 0, 1).applyEuler(drum.g.rotation);
      return p.add(fwd.multiplyScalar(drum.r * frac)).add(n.multiplyScalar(h));
    };
    // 指先が point に来るよう、手首の位置を手前・上に下げる
    const wristFor = (point: THREE.Vector3, shoulder: THREE.Vector3, reach = 0.1) => {
      const d = point.clone().sub(shoulder); d.y = 0; d.normalize();
      return point.clone().sub(d.multiplyScalar(reach)).add(V(0, 0.035, 0));
    };
    // シタールのさおの上の点（シタール奏者から見た座標）
    const neckPt = (u: number, out: number, side = 0) => { const p = V(side, u * st.len, 0.03 + out); st.neck.localToWorld(p); return S.g.worldToLocal(p); };
    const semiToU = (semi: number) => 0.2 + Math.max(0, Math.min(1, (semi + 7) / 31)) * 0.62;

    const resize = () => { const w = el.clientWidth || 1, h = el.clientHeight || 1; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();

    // ドラッグで見る向きを変える
    let az = 0, drag: number | null = null;
    const down = (e: PointerEvent) => { drag = e.clientX; };
    const move = (e: PointerEvent) => { if (drag == null) return; az = Math.max(-0.9, Math.min(0.9, az - (e.clientX - drag) * 0.006)); drag = e.clientX; };
    const up = () => { drag = null; };
    renderer.domElement.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);

    let raf = 0, sitarU = semiToU(0), sitarSemi = 0, nod = 0;
    const blinkAt = [2, 3.3]; const t0 = performance.now();
    const blink = (lids: THREE.Mesh[], i: number, clk: number) => {
      const d = clk - blinkAt[i]; if (d > 0.16) blinkAt[i] = clk + 2.5 + Math.random() * 3.5;
      const c = d >= 0 && d < 0.16 ? Math.sin((d / 0.16) * Math.PI) : 0;
      lids.forEach((l) => { l.scale.y = 0.35 + c * 0.75; l.rotation.x = -c * 0.2; });
    };
    const frame = () => {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const t = now(), clk = (performance.now() - t0) / 1000;
      const a = az + Math.sin(clk * 0.12) * 0.12;
      cam.position.set(Math.sin(a) * 2.55, 0.95, Math.cos(a) * 2.55 + 0.1); cam.lookAt(0, 0.4, 0.05);

      // ---- タブラー奏者 ----
      const pick = (side: 'R' | 'L') => {
        let best: { bol: BolKey; time: number } | null = null, h = 0.05;
        for (const e of hits) { if (e.side !== side) continue; const dt = t - e.time; if (dt < -0.16 || dt > 0.2) continue; const hh2 = strikeHeight(dt); if (hh2 <= h) { h = hh2; best = e; } }
        return { bol: best?.bol, h, active: !!best };
      };
      const r = pick('R'), l = pick('L');
      if (r.bol) lastR = r.bol; if (l.bol) lastL = l.bol;
      const pR = surface(dy, RIGHT[lastR] ?? 0.5, r.h);
      tR.reach(wristFor(pR, tR.S, lastR === 'te' ? 0.075 : 0.105), V(0, 1, 0.25), pR);
      tR.hand.update(r.active ? SHAPE[lastR] ?? 'index' : 'rest');
      let lf = LEFT[lastL] ?? 0.5;
      const lm = hits.filter((e) => e.bol === 'meend' && t - e.time >= 0 && t - e.time < 0.5).pop();
      if (lm) lf = 0.5 - 0.5 * Math.min(1, (t - lm.time) / 0.3); // ゲー↑：手首を奥へすべらせる
      const pL = surface(by, lf, l.h + (lastL === 'ke' ? -0.004 : 0));
      tL.reach(wristFor(pL, tL.S, lastL === 'ke' ? 0.06 : 0.1), V(0, 1, 0.25), pL);
      tL.hand.update(l.active ? SHAPE[lastL] ?? 'two' : 'rest');
      const strong = hits.some((e) => t - e.time >= 0 && t - e.time < 0.05 && e.side === 'L');
      if (strong) nod = 1; nod *= 0.92;
      P.headG.rotation.x = 0.1 + Math.sin(clk * 1.7) * 0.025 + nod * 0.06;
      P.headG.rotation.z = Math.sin(clk * 0.8) * 0.05;
      P.body.scale.y = 1 + Math.sin(clk * 1.6) * 0.006;
      blink(P.lids, 0, clk);

      // ---- シタール奏者 ----
      let cur: (typeof plucks)[number] | null = null;
      for (const p of plucks) if (p.time <= t) cur = p;
      let pull = 0;
      if (cur) {
        sitarSemi = cur.semi;
        for (const m of cur.meend) { const k = (t - cur.time - m.at) / Math.max(0.05, m.dur); if (k > 0) pull = Math.min(1, k) * (m.to - cur.semi); }
      }
      pull += bend;
      sitarU += (semiToU(sitarSemi) - sitarU) * 0.25; // 左手はフレットに沿ってすべる
      const pl = neckPt(sitarU, 0.012, 0.01 + Math.min(0.06, Math.abs(pull) * 0.018));
      sL.reach(neckPt(sitarU - 0.02, 0.06, 0.07), V(0, 0, 1), pl);
      sL.hand.update('two');
      const f = (dt: number) => (dt >= 0 && dt < 0.14 ? Math.sin((dt / 0.14) * Math.PI) : 0);
      const lastPluck = cur ? t - cur.time : 9;
      let lastChik = 9; for (const x of chiks) if (x <= t) lastChik = Math.min(lastChik, t - x);
      let flick = Math.max(f(lastPluck), f(lastChik));
      const upc = plucks.find((p) => p.time > t && p.time - t < 0.08); if (upc) flick = Math.max(flick, 0.4 * (1 - (upc.time - t) / 0.08));
      const pr = neckPt(0.0, 0.012, -0.005 - flick * 0.03 + (lastChik < lastPluck ? -0.025 : 0));
      sR.reach(neckPt(-0.06, 0.07 + flick * 0.02, -0.05), V(0, 0, 1), pr);
      sR.hand.update('index');
      S.headG.rotation.x = 0.12 + Math.sin(clk * 0.9) * 0.03;
      S.headG.rotation.z = Math.sin(clk * 0.5) * 0.06 + (cur && t - cur.time < 0.6 ? Math.sin(clk * 2.2) * 0.02 : 0);
      S.body.scale.y = 1 + Math.sin(clk * 1.4 + 1) * 0.006;
      blink(S.lids, 1, clk);

      renderer.render(scene, cam);
    };
    frame();

    return () => {
      disposed = true; cancelAnimationFrame(raf); offTabla(); offSitar(); ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      const mats = new Set<THREE.Material>();
      scene.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); const mm = m.material; if (mm) (Array.isArray(mm) ? mm : [mm]).forEach((x) => mats.add(x)); });
      mats.forEach((x) => x.dispose()); texs.forEach((x) => x.dispose()); envTex.dispose(); pmrem.dispose();
      renderer.dispose(); renderer.domElement.remove();
    };
  }, []);
  return <div ref={box} className={className} style={{ touchAction: 'pan-y' }} />;
}

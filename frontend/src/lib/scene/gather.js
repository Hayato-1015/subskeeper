// 案4：漏れ出す粒を、取り戻す
// トップ：ガラスの球から光の粒（＝お金）がこぼれ落ちている（＝払いすぎ）
// スクロール：こぼれた粒が球へ戻る → 「Reset.」で稲妻のロゴの形に集まる
// カーソル（スマホは指）を近づけると、そのまわりの粒がよけて渦を巻き、離すと元に戻る
import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  Points,
  Vector3,
  ShaderMaterial,
  SphereGeometry,
} from 'three'
import { STOPS, easeInOut, seeded, smooth } from './common.js'

// favicon.svg の稲妻（48×48 の座標）
const BOLT = [
  [30, 2],
  [8.5, 29.5],
  [21.7, 29.5],
  [17, 46],
  [40.5, 16.2],
  [27.3, 16.2],
]
const LOGO_HEIGHT = 5.6

function insideBolt(x, y) {
  let inside = false
  for (let i = 0, j = BOLT.length - 1; i < BOLT.length; j = i++) {
    const [xi, yi] = BOLT[i]
    const [xj, yj] = BOLT[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function toWorld(x, y) {
  return [((x - 24.5) / 44) * LOGO_HEIGHT, (-(y - 24) / 44) * LOGO_HEIGHT]
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uLeak;
  uniform float uGather;
  uniform float uSize;
  uniform float uScale;
  uniform vec3 uPointer;
  uniform float uPush;
  uniform float uRadius;
  uniform vec3 uC0;
  uniform vec3 uC1;
  uniform vec3 uC2;
  attribute vec3 aHome;
  attribute vec3 aLogo;
  attribute vec4 aRand;
  varying vec3 vColor;
  varying float vAlpha;

  vec3 grad(float t) {
    return t < 0.5 ? mix(uC0, uC1, t * 2.0) : mix(uC1, uC2, (t - 0.5) * 2.0);
  }

  void main() {
    // 球の中をゆっくり回る
    vec3 home = aHome;
    float a = uTime * (0.12 + aRand.x * 0.18);
    home.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * home.xz;

    // 一部の粒は球の底からこぼれ落ちる（くり返し）
    float leaker = step(aRand.y, 0.38);
    float ph = fract(uTime * 0.12 + aRand.z);
    vec3 exitP = vec3(0.7 * (aRand.w - 0.5), -2.0, 0.7 * (aRand.x - 0.5));
    // 右下へ流れて、左下の見出しにかからないようにする
    vec3 fallP = exitP + vec3((aRand.w - 0.5) * 1.6 * ph + ph * 2.6, -ph * ph * 4.6, (aRand.x - 0.5) * 1.4 * ph);
    float leak = leaker * uLeak;
    vec3 p0 = mix(home, fallP, leak);

    // ロゴへ集まる
    vec3 p = mix(p0, aLogo, uGather);
    p += 0.035 * vec3(sin(uTime * 2.0 + aRand.x * 20.0), cos(uTime * 1.7 + aRand.y * 20.0), 0.0) * uGather;

    // カーソルの近くの粒をよけさせ、少し渦を巻かせる（離れるほど影響は 0 に）
    vec2 dv = p.xy - uPointer.xy;
    float dist = length(dv);
    vec2 dir = dist > 0.0001 ? dv / dist : vec2(0.0, 1.0);
    float push = uPush * (1.0 - smoothstep(0.0, uRadius, dist)) * (0.6 + aRand.y * 0.8);
    p.xy += (dir * 0.5 + vec2(-dir.y, dir.x) * 0.25) * push;
    p.z += (aRand.z - 0.5) * 0.4 * push;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float twinkle = 0.75 + 0.25 * sin(uTime * 3.0 + aRand.w * 30.0);
    gl_PointSize = uSize * (0.6 + aRand.x * 0.8) * twinkle * uScale / -mv.z;

    float logoT = clamp(1.0 - (aLogo.y + ${(LOGO_HEIGHT / 2).toFixed(2)}) / ${LOGO_HEIGHT.toFixed(2)}, 0.0, 1.0);
    vColor = grad(mix(aRand.z, logoT, uGather));
    float edge = smoothstep(0.0, 0.08, ph) * (1.0 - smoothstep(0.8, 1.0, ph));
    vAlpha = mix(1.0, edge, leak);
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    gl_FragColor = vec4(vColor, smoothstep(0.5, 0.12, d) * vAlpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function createGather({ track, mobile }) {
  const object = new Group()
  const rand = seeded(23)
  const count = mobile ? 2800 : 5200

  const home = new Float32Array(count * 3)
  const logo = new Float32Array(count * 3)
  const rnd = new Float32Array(count * 4)
  for (let i = 0; i < count; i++) {
    // 球の中（外側寄り）
    const u = rand() * 2 - 1
    const th = rand() * Math.PI * 2
    const r = 2 * Math.cbrt(0.35 + rand() * 0.65)
    const s = Math.sqrt(1 - u * u)
    home.set([r * s * Math.cos(th), r * u, r * s * Math.sin(th)], i * 3)

    // 稲妻の中（3 割は輪郭に寄せてくっきりさせる）
    let x
    let y
    if (rand() < 0.3) {
      const e = Math.floor(rand() * BOLT.length)
      const [ax, ay] = BOLT[e]
      const [bx, by] = BOLT[(e + 1) % BOLT.length]
      const k = rand()
      x = ax + (bx - ax) * k
      y = ay + (by - ay) * k
    } else {
      do {
        x = 8.5 + rand() * 32
        y = 2 + rand() * 44
      } while (!insideBolt(x, y))
    }
    const [wx, wy] = toWorld(x, y)
    logo.set([wx, wy, (rand() - 0.5) * 0.35], i * 3)
    rnd.set([rand(), rand(), rand(), rand()], i * 4)
  }

  const geometry = track(new BufferGeometry())
  geometry.setAttribute('position', new BufferAttribute(home, 3))
  geometry.setAttribute('aHome', new BufferAttribute(home, 3))
  geometry.setAttribute('aLogo', new BufferAttribute(logo, 3))
  geometry.setAttribute('aRand', new BufferAttribute(rnd, 4))
  geometry.computeBoundingSphere()
  geometry.boundingSphere.radius = 8

  const uniforms = {
    uTime: { value: 0 },
    uLeak: { value: 1 },
    uGather: { value: 0 },
    uSize: { value: 0.07 },
    uPointer: { value: new Vector3(0, 0, 0) },
    uPush: { value: 0 },
    uRadius: { value: 0.65 },
    uScale: { value: 400 },
    uC0: { value: STOPS[0] },
    uC1: { value: STOPS[1] },
    uC2: { value: STOPS[2] },
  }
  const material = track(new ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false }))
  const points = new Points(geometry, material)
  points.frustumCulled = false
  object.add(points)

  // ガラスの球
  const glassMat = track(
    new MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.04, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.2, depthWrite: false }),
  )
  const glass = new Mesh(track(new SphereGeometry(2.25, 64, 48)), glassMat)
  object.add(glass)

  const target = new Vector3()

  function update({ t, story, cursor }) {
    // カーソルの位置を粒の座標に直して、少し遅れて追いかける（ぬるっと動く）
    if (cursor?.active) {
      object.updateWorldMatrix(true, false)
      target.copy(cursor.world)
      object.worldToLocal(target)
      if (uniforms.uPush.value < 0.01) uniforms.uPointer.value.copy(target)
      else uniforms.uPointer.value.lerp(target, 0.25)
    }
    uniforms.uPush.value += ((cursor?.active ? 1 : 0) - uniforms.uPush.value) * 0.08

    const gather = easeInOut((story.r - 0.45) / 0.5)
    uniforms.uTime.value = t
    uniforms.uLeak.value = 1 - smooth(story.u * 1.1)
    uniforms.uGather.value = gather
    glassMat.opacity = 0.2 * (1 - gather)
    glass.visible = gather < 0.99
    glass.scale.setScalar(1 + gather * 0.4)
    object.rotation.y = Math.sin(t * 0.35) * 0.3
  }

  function resize({ pixelRatio, heightPx, fov }) {
    // 粒の大きさを画面の高さに合わせる
    uniforms.uScale.value = (pixelRatio * heightPx) / (2 * Math.tan((fov * Math.PI) / 360))
  }

  return { object, update, resize }
}

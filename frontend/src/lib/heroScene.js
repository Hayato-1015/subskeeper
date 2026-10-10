// トップページ全体の背景のリアルタイム 3DCG（three.js / WebGL）
// Hero3D.jsx から必要になったときだけ読み込む（ログイン後の画面には含めない）
//
// 中身の形（光の粒）は scene/gather.js。ここは土台：
// 画面サイズに合わせた描画、スクロール位置 → 物語の進み具合、背景色（明るい → 黒）、
// カーソル・指の位置、タブが隠れたら停止
import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  Group,
  PMREMGenerator,
  PerspectiveCamera,
  Plane,
  PointLight,
  Raycaster,
  SRGBColorSpace,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { clamp01, easeInOut, lerp, smooth } from './scene/common.js'
import { createGather } from './scene/gather.js'

const DARK = new Color('#0b0b0b')

// スクロール位置から物語の進み具合（どれも 0〜1）を出す
//   u    : トップ → 「Transform…」が画面いっぱいになるまで
//   r    : 「Transform…」の固定表示の間（1 で最後の「Reset.」が出そろう）
//   f    : その後の特徴（01〜03）
//   dark : 背景が明るい色から黒へ変わる度合い
function readStory() {
  const vh = window.innerHeight
  const y = window.scrollY
  const st = document.querySelector('.lp-statement')
  if (!st) return { u: 0, r: 0, f: 0, dark: 0 }
  const top = st.getBoundingClientRect().top + y
  const end = top + st.offsetHeight - vh
  return {
    u: clamp01(y / top),
    r: clamp01((y - top) / Math.max(1, end - top)),
    f: clamp01((y - end) / vh),
    dark: clamp01((y - vh * 0.2) / Math.max(1, top - vh * 0.2)),
  }
}

export function createHeroScene(container, { onReady } = {}) {
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.95
  container.appendChild(renderer.domElement)

  const scene = new Scene()
  const pmrem = new PMREMGenerator(renderer)
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTexture
  // 映り込みを抑えて、グラデーションの色をはっきり出す
  scene.environmentIntensity = 0.55

  const camera = new PerspectiveCamera(35, 1, 0.1, 100)
  camera.position.set(0, 0, 14)

  // 光：白のキーライト＋左に青、右下にオレンジの差し色
  const key = new DirectionalLight(0xffffff, 1.6)
  key.position.set(4, 6, 8)
  const blue = new PointLight(0x4a5bff, 40, 30)
  blue.position.set(-6, 3, 4)
  const orange = new PointLight(0xff8a3d, 40, 30)
  orange.position.set(6, -4, 5)
  scene.add(key, blue, orange)

  const disposables = [envTexture, pmrem]
  const track = (o) => (disposables.push(o), o)

  // 背景色：トップは今のページ色（ダークモードなら暗い色）、下へ行くほど黒
  const landing = container.closest('.landing') ?? document.body
  const light = new Color(getComputedStyle(landing).getPropertyValue('--lp-bg').trim() || '#f4f4f2')
  const bg = new Color()

  // placer（場所と大きさ）→ stage（マウスの傾き）→ 光の粒
  const placer = new Group()
  const stage = new Group()
  placer.add(stage)
  scene.add(placer)

  let mobile = container.clientWidth < 900
  const design = createGather({ track, mobile })
  stage.add(design.object)

  // 場面ごとの置き場所：トップ（PC は右・スマホは上）→ 中央 → 特徴（脇へ小さく）
  const anchors = { hero: { x: 0, y: 0, s: 1 }, center: { x: 0, y: 0, s: 1 }, side: { x: 0, y: 0, s: 1 } }

  function resize() {
    const w = container.clientWidth
    const h = container.clientHeight
    if (!w || !h) return
    mobile = w < 900
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    const viewH = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360)
    const viewW = viewH * camera.aspect
    if (!mobile) {
      const s = Math.min(1, viewH / 10)
      anchors.hero = { x: viewW * 0.2, y: viewH * 0.04, s }
      // 「Transform…」の文字にかぶらないよう、中央より少し下に置く
      anchors.center = { x: 0, y: -viewH * 0.3, s: s * 0.62 }
      anchors.side = { x: viewW * 0.3, y: -viewH * 0.04, s: s * 0.72 }
    } else {
      const s = Math.min(0.56, viewW / 8.4)
      anchors.hero = { x: viewW * 0.1, y: viewH * 0.13, s }
      anchors.center = { x: 0, y: -viewH * 0.22, s: s * 0.95 }
      anchors.side = { x: viewW * 0.12, y: viewH * 0.27, s: s * 0.62 }
    }
    design.resize?.({ pixelRatio: renderer.getPixelRatio(), heightPx: h, fov: camera.fov })
  }

  function place(story) {
    const a = easeInOut(story.u)
    const b = easeInOut(story.f)
    const { hero, center, side } = anchors
    placer.position.set(lerp(lerp(hero.x, center.x, a), side.x, b), lerp(lerp(hero.y, center.y, a), side.y, b), 0)
    placer.scale.setScalar(lerp(lerp(hero.s, center.s, a), side.s, b))
  }

  // カーソル・指の位置
  //   tilt   : 全体を少し傾ける（マウスのみ）
  //   cursor : 奥行き 0 の面の上のどこを指しているか → 粒をよけさせる（gather.js）
  const pointer = new Vector2()
  const tilt = new Vector2()
  const ndc = new Vector2()
  const raycaster = new Raycaster()
  const plane = new Plane(new Vector3(0, 0, 1), 0)
  const cursor = { world: new Vector3(), active: false }

  function aim(e) {
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1))
    cursor.active = true
  }
  function onPointerMove(e) {
    if (e.pointerType === 'mouse') pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1)
    aim(e)
  }
  // 指は触れている間だけ。マウスが画面の外へ出たら離す
  function onPointerEnd(e) {
    if (e.pointerType !== 'mouse') cursor.active = false
  }
  function onPointerOut(e) {
    if (!e.relatedTarget) cursor.active = false
  }

  let frame = 0
  let running = false
  let last = performance.now()
  let elapsed = 0
  let readyCalled = false

  function render(now) {
    frame = requestAnimationFrame(render)
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    elapsed += dt

    const story = readStory()
    bg.lerpColors(light, DARK, smooth(story.dark))
    renderer.setClearColor(bg)
    place(story)

    tilt.lerp(pointer, 0.04)
    stage.rotation.y = tilt.x * 0.25
    stage.rotation.x = tilt.y * 0.18

    if (cursor.active) {
      raycaster.setFromCamera(ndc, camera)
      raycaster.ray.intersectPlane(plane, cursor.world)
    }
    design.update({ t: elapsed, dt, story, cursor })
    renderer.render(scene, camera)
    if (!readyCalled) {
      readyCalled = true
      onReady?.()
    }
  }

  function start() {
    if (running) return
    running = true
    last = performance.now()
    frame = requestAnimationFrame(render)
  }
  function stop() {
    running = false
    cancelAnimationFrame(frame)
  }
  // タブが隠れたら描画を止めて電池を節約
  function onVisibility() {
    if (document.hidden) stop()
    else start()
  }

  const ro = new ResizeObserver(resize)
  ro.observe(container)
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerdown', aim, { passive: true })
  window.addEventListener('pointerup', onPointerEnd, { passive: true })
  window.addEventListener('pointercancel', onPointerEnd, { passive: true })
  document.addEventListener('pointerout', onPointerOut)
  document.addEventListener('visibilitychange', onVisibility)
  resize()
  start()

  return {
    dispose() {
      stop()
      ro.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', aim)
      window.removeEventListener('pointerup', onPointerEnd)
      window.removeEventListener('pointercancel', onPointerEnd)
      document.removeEventListener('pointerout', onPointerOut)
      document.removeEventListener('visibilitychange', onVisibility)
      for (const d of disposables) d.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}

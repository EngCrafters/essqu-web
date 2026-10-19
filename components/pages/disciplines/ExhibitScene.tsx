'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import type { SceneProps } from '@/components/three/SceneMount'
import { ReadySignal, Studio, Ticker, configureRenderer } from '@/components/three/Studio'
import { Model, type ModelId } from '@/components/three/models'
import { ModelRig, PaletteProvider, usePalette } from '@/components/three/rig'

/*
 * The exhibition floor: seven plinths on one turntable, each carrying its discipline's
 * working machine. The active exhibit turns to face the visitor and runs; the others wait,
 * still, at the edges of the view. The visitor can turn the active exhibit by dragging.
 */

const RADIUS = 4.2
const STEP = (Math.PI * 2) / 7
const PRESENT = -0.55
const CAMERA: [number, number, number] = [0, 3.5, RADIUS + 9.4]
const TARGET = new THREE.Vector3(0, 0.95, RADIUS)
/** Seconds the turntable takes to settle; a critically damped spring, independent of frame rate. */
const SETTLE = 0.42

function smoothDamp(current: number, target: number, vel: { v: number }, dt: number) {
  const omega = 2 / SETTLE
  const x = omega * dt
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)
  const change = current - target
  const temp = (vel.v + omega * change) * dt
  vel.v = (vel.v - omega * temp) * decay
  return target + (change + temp) * decay
}

export interface ExhibitSceneProps extends SceneProps {
  active: number
  models: ModelId[]
  accents: string[]
}

export default function ExhibitScene(props: ExhibitSceneProps) {
  const { quality, onError, still, activeRef } = props
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, quality === 'high' ? 2 : 1.25]}
      shadows={quality === 'high' ? 'percentage' : false}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: 30, position: CAMERA, near: 0.1, far: 60 }}
      style={{ touchAction: 'pan-y', cursor: 'grab' }}
      onCreated={({ gl, camera }) => {
        configureRenderer(gl, onError)
        camera.lookAt(TARGET)
      }}
    >
      <Studio quality={quality} shadowSize={5} />
      <PaletteProvider lite={quality === 'low'}>
        <Floor {...props} />
      </PaletteProvider>
      <Ticker activeRef={activeRef} moving={!still} />
      <ReadySignal onReady={props.onReady} />
    </Canvas>
  )
}

function Floor({ active, models, accents, still, quality }: ExhibitSceneProps) {
  const invalidate = useThree((s) => s.invalidate)
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const p = usePalette()
  const table = useRef<THREE.Group>(null)
  const turns = useRef<(THREE.Group | null)[]>([])
  const plinths = useRef<(THREE.Group | null)[]>([])
  const running = useMemo(() => models.map(() => ({ current: false })), [models])
  const angle = useRef(0)
  const goal = useRef(0)
  const spin = useRef({ v: 0 })
  const drag = useRef({ on: false, x: 0, v: 0, idle: 0 })

  // Frame the active plinth by the stage's shape: a tall desktop stage and a wide phone band
  // both show the whole exhibit with its neighbours just entering at the edges.
  useEffect(() => {
    const aspect = size.width / Math.max(size.height, 1)
    const d = Math.max(6.4, 8.4 / aspect)
    camera.position.set(0, d * 0.37, RADIUS + d)
    camera.lookAt(TARGET)
    invalidate()
  }, [camera, size.width, size.height, invalidate])

  // Turn the floor so the active plinth faces the camera, along the shortest way round.
  useEffect(() => {
    running.forEach((r, i) => {
      r.current = i === active && !still
    })
    let target = -active * STEP
    const current = angle.current
    while (target - current > Math.PI) target -= Math.PI * 2
    while (target - current < -Math.PI) target += Math.PI * 2
    goal.current = target
    // The exhibit that leaves returns to its presentation angle.
    turns.current.forEach((t, i) => {
      if (t && i !== active) t.rotation.y = PRESENT
    })
    if (still) {
      angle.current = target
      spin.current.v = 0
      if (table.current) table.current.rotation.y = target
    }
    invalidate()
  }, [active, still, invalidate, running])

  useFrame((_, dt) => {
    const g = table.current
    if (!g) return
    const diff = goal.current - angle.current
    if (Math.abs(diff) < 0.0004 && Math.abs(spin.current.v) < 0.0004) {
      if (diff !== 0) {
        angle.current = goal.current
        g.rotation.y = angle.current
      }
      return
    }
    angle.current = smoothDamp(angle.current, goal.current, spin.current, Math.min(dt, 0.25))
    g.rotation.y = angle.current
    invalidate()
  })

  // Phones draw only the plinths the camera can see; the far side of the turntable is skipped.
  useFrame(() => {
    if (quality === 'high') return
    plinths.current.forEach((g, i) => {
      if (!g) return
      let a = i * STEP + angle.current
      a = Math.atan2(Math.sin(a), Math.cos(a))
      g.visible = Math.abs(a) < 2.1
    })
  })

  // Drag to turn the active exhibit; a flick keeps turning and settles.
  useEffect(() => {
    const el = gl.domElement
    const d = drag.current
    const down = (e: PointerEvent) => {
      d.on = true
      d.x = e.clientX
      d.v = 0
      el.setPointerCapture?.(e.pointerId)
      el.style.cursor = 'grabbing'
    }
    const move = (e: PointerEvent) => {
      if (!d.on) return
      const dx = e.clientX - d.x
      d.x = e.clientX
      d.v = dx * 0.012
      const t = turns.current[active]
      if (t) t.rotation.y += d.v
      invalidate()
    }
    const up = (e: PointerEvent) => {
      if (!d.on) return
      d.on = false
      el.releasePointerCapture?.(e.pointerId)
      el.style.cursor = 'grab'
      if (still) return
      let raf = 0
      const coast = () => {
        d.v *= 0.92
        const t = turns.current[active]
        if (t) t.rotation.y += d.v
        invalidate()
        if (Math.abs(d.v) > 0.0006 && !d.on) raf = requestAnimationFrame(coast)
      }
      raf = requestAnimationFrame(coast)
      d.idle = raf
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    return () => {
      cancelAnimationFrame(d.idle)
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
  }, [gl, active, invalidate, still])

  return (
    <group>
      {/* The turntable's floor disc, and a shadow catcher beneath the plinths. */}
      <mesh position={[0, -0.33, 0]} material={p.ivory} receiveShadow>
        <cylinderGeometry args={[RADIUS + 1.9, RADIUS + 1.9, 0.06, quality === 'high' ? 96 : 48]} />
      </mesh>
      <group ref={table}>
        {models.map((id, i) => {
          const a = i * STEP
          return (
            <group
              key={id + i}
              ref={(g) => {
                plinths.current[i] = g
              }}
              position={[Math.sin(a) * RADIUS, 0, Math.cos(a) * RADIUS]}
              rotation={[0, a, 0]}
            >
              <Plinth accent={accents[i]!} quality={quality} />
              <group
                ref={(g) => {
                  turns.current[i] = g
                }}
                rotation={[0, PRESENT, 0]}
                position={[0, 0, 0]}
              >
                <group scale={0.82}>
                  <ModelRig quality={quality} running={running[i] as RefObject<boolean>}>
                    <Model id={id} accent={accents[i]!} />
                  </ModelRig>
                </group>
              </group>
            </group>
          )
        })}
      </group>
    </group>
  )
}

function Plinth({ accent, quality }: { accent: string; quality: 'high' | 'low' }) {
  const p = usePalette()
  const seg = quality === 'high' ? 72 : 36
  return (
    <group>
      <mesh position={[0, -0.16, 0]} material={p.ivory} castShadow receiveShadow>
        <cylinderGeometry args={[1.45, 1.55, 0.3, seg]} />
      </mesh>
      {/* The discipline's colour as a band around the plinth, not across its top. */}
      <mesh position={[0, -0.075, 0]} material={p.accent(accent)}>
        <cylinderGeometry args={[1.472, 1.486, 0.05, seg, 1, true]} />
      </mesh>
    </group>
  )
}

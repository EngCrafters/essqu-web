'use client'

import { useFrame } from '@react-three/fiber'
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react'
import * as THREE from 'three'

/*
 * Shared plumbing for the platform's procedural models: one material palette per canvas,
 * an "explode" channel that separates a model into its parts, and a "running" channel that
 * lets a model animate only while it is the one being looked at.
 */

export type V3 = [number, number, number]

// ---------------------------------------------------------------- palette

export interface Palette {
  ivory: THREE.Material
  satin: THREE.Material
  dark: THREE.Material
  rubber: THREE.Material
  board: THREE.Material
  gold: THREE.Material
  glass: THREE.Material
  solar: THREE.Material
  /** Ivory, both faces: for single-sided panels such as a gable end. */
  gable: THREE.Material
  accent: (color: string) => THREE.Material
  liquid: (color: string) => THREE.Material
  glow: (color: string) => THREE.MeshStandardMaterial
}

const PaletteContext = createContext<Palette | null>(null)

type PhysicalOptions = ConstructorParameters<typeof THREE.MeshPhysicalMaterial>[0] & object

/**
 * `lite` (phones and tablets) swaps the physical materials for standard ones: the same colours
 * and finishes without the clearcoat pass, which roughly halves the shading cost per pixel.
 */
export function PaletteProvider({ children, lite = false }: { children: ReactNode; lite?: boolean }) {
  const palette = useMemo(() => {
    const physical = (o: PhysicalOptions): THREE.Material => {
      if (!lite) return new THREE.MeshPhysicalMaterial(o)
      const rest: Record<string, unknown> = { ...o }
      delete rest.clearcoat
      delete rest.clearcoatRoughness
      return new THREE.MeshStandardMaterial(rest as ConstructorParameters<typeof THREE.MeshStandardMaterial>[0])
    }
    const cache = new Map<string, THREE.Material>()
    const cached = <M extends THREE.Material>(key: string, make: () => M): M => {
      let m = cache.get(key)
      if (!m) {
        m = make()
        cache.set(key, m)
      }
      return m as M
    }
    const p: Palette & { dispose: () => void } = {
      ivory: physical({ color: '#efebe0', roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.45 }),
      satin: physical({ color: '#c8cdd5', metalness: 1, roughness: 0.38 }),
      dark: new THREE.MeshStandardMaterial({ color: '#2b3342', roughness: 0.55, metalness: 0.15 }),
      rubber: new THREE.MeshStandardMaterial({ color: '#1d222b', roughness: 0.9 }),
      board: new THREE.MeshStandardMaterial({ color: '#21503b', roughness: 0.6, metalness: 0.05 }),
      gold: new THREE.MeshStandardMaterial({ color: '#c9a24a', metalness: 1, roughness: 0.32 }),
      glass: physical({
        color: '#dfe8f3',
        roughness: 0.08,
        metalness: 0,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      solar: physical({ color: '#1b2f5e', roughness: 0.25, metalness: 0.4, clearcoat: 0.8 }),
      gable: physical({ color: '#efebe0', roughness: 0.5, side: THREE.DoubleSide }),
      accent: (color) => cached(`a${color}`, () => physical({ color, metalness: 0.2, roughness: 0.36, clearcoat: 0.5, clearcoatRoughness: 0.3 })),
      liquid: (color) => cached(`l${color}`, () => physical({ color, roughness: 0.2, transparent: true, opacity: 0.55, depthWrite: false })),
      glow: (color) =>
        cached(`g${color}`, () => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2, roughness: 0.4 })),
      dispose: () => {
        ;[p.ivory, p.satin, p.dark, p.rubber, p.board, p.gold, p.glass, p.solar, p.gable].forEach((m) => m.dispose())
        cache.forEach((m) => m.dispose())
      },
    }
    return p
  }, [lite])
  useEffect(() => () => palette.dispose(), [palette])
  return <PaletteContext.Provider value={palette}>{children}</PaletteContext.Provider>
}

/** An emissive material owned by one model, so its light can pulse without touching others. */
export function useGlow(color: string) {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2, roughness: 0.4 }), [color])
  useEffect(() => () => m.dispose(), [m])
  return m
}

export function usePalette() {
  const p = useContext(PaletteContext)
  if (!p) throw new Error('usePalette needs a PaletteProvider')
  return p
}

// ---------------------------------------------------------------- rig (explode + running)

interface Rig {
  explode: RefObject<number>
  running: RefObject<boolean>
  quality: 'high' | 'low'
}

const zero = { current: 0 }
const idle = { current: false }
const RigContext = createContext<Rig>({ explode: zero, running: idle, quality: 'high' })

export function ModelRig({
  explode = zero,
  running = idle,
  quality,
  children,
}: {
  explode?: RefObject<number>
  running?: RefObject<boolean>
  quality: 'high' | 'low'
  children: ReactNode
}) {
  const value = useMemo(() => ({ explode, running, quality }), [explode, running, quality])
  return <RigContext.Provider value={value}>{children}</RigContext.Provider>
}

export const useRig = () => useContext(RigContext)

/** A part of a model: it sits at `at`, and travels by `away` as the model explodes. */
export function Part({ at = [0, 0, 0], away = [0, 0, 0], rot, children }: { at?: V3; away?: V3; rot?: V3; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  const { explode } = useRig()
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const e = explode.current ?? 0
    g.position.set(at[0] + away[0] * e, at[1] + away[1] * e, at[2] + away[2] * e)
  })
  return (
    <group ref={ref} position={at} rotation={rot}>
      {children}
    </group>
  )
}

/** Runs `step` with an accumulated clock while the model is running. */
export function useMotion(step: (t: number) => void) {
  const { running } = useRig()
  const t = useRef(0)
  useFrame((_, dt) => {
    if (!running.current) return
    t.current += Math.min(dt, 1 / 20)
    step(t.current)
  })
}

// ---------------------------------------------------------------- shared geometry

/** Unit primitives, scaled per mesh, so a lattice of fifty members costs one geometry. */
export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 28),
  cylLow: new THREE.CylinderGeometry(1, 1, 1, 12),
  sphere: new THREE.SphereGeometry(1, 24, 16),
}

export function Box({ size, at, rot, mat }: { size: V3; at?: V3; rot?: V3; mat: THREE.Material }) {
  return <mesh geometry={GEO.box} material={mat} scale={size} position={at} rotation={rot} castShadow receiveShadow />
}

/** A cylinder standing on the Y axis (rotate it to lay it down). */
export function Cyl({ r, h, at, rot, mat, low }: { r: number; h: number; at?: V3; rot?: V3; mat: THREE.Material; low?: boolean }) {
  return <mesh geometry={low ? GEO.cylLow : GEO.cyl} material={mat} scale={[r, h, r]} position={at} rotation={rot} castShadow receiveShadow />
}

const UP = new THREE.Vector3(0, 1, 0)

/** A structural member between two points: a square section of side 2r. */
export function Member({ a, b, r = 0.025, mat, round }: { a: V3; b: V3; r?: number; mat: THREE.Material; round?: boolean }) {
  const ka = a.join(',')
  const kb = b.join(',')
  const t = useMemo(() => {
    const va = new THREE.Vector3(...(ka.split(',').map(Number) as V3))
    const vb = new THREE.Vector3(...(kb.split(',').map(Number) as V3))
    const dir = vb.clone().sub(va)
    const length = dir.length()
    const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize())
    return { position: va.add(vb).multiplyScalar(0.5), quaternion, length }
  }, [ka, kb])
  return (
    <mesh
      geometry={round ? GEO.cylLow : GEO.box}
      material={mat}
      position={t.position}
      quaternion={t.quaternion}
      scale={round ? [r, t.length, r] : [r * 2, t.length, r * 2]}
      castShadow
      receiveShadow
    />
  )
}

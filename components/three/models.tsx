'use client'

import { useEffect, useMemo, useRef, type ReactElement } from 'react'
import * as THREE from 'three'
import { Box, Cyl, Member, Part, useGlow, useMotion, usePalette, useRig, type V3 } from './rig'

/*
 * Procedural models, built from primitives in one shared material palette (ivory bodies,
 * satin metal, one accent per discipline). Each stands on y = 0 inside roughly a 2.6-unit
 * square, so a pedestal can hold any of them. Every model:
 *   - moves the way its subject works (gears mesh, the drill string turns, the arm reaches),
 *     only while `running`;
 *   - separates into its real parts when exploded (see Part's `away`).
 */

export type ModelId =
  | 'gears'
  | 'gearbox'
  | 'pcb'
  | 'frame'
  | 'derrick'
  | 'reactor'
  | 'arm'
  | 'conveyor'
  | 'rover'
  | 'sensor-node'
  | 'truss'
  | 'shelter'

const TAU = Math.PI * 2

// ---------------------------------------------------------------- mechanical: a gear train

function gearGeometry(teeth: number, pitch: number, depth: number, hole: number, windows: boolean, quality: 'high' | 'low') {
  const m = (2 * pitch) / teeth
  const tip = pitch + m
  const root = pitch - 1.2 * m
  const step = TAU / teeth
  const shape = new THREE.Shape()
  for (let i = 0; i < teeth; i++) {
    const c = i * step
    const pts: [number, number][] = [
      [root, c - step * 0.3],
      [tip, c - step * 0.15],
      [tip, c + step * 0.15],
      [root, c + step * 0.3],
    ]
    pts.forEach(([r, a], j) => {
      const x = r * Math.cos(a)
      const y = r * Math.sin(a)
      if (i === 0 && j === 0) shape.moveTo(x, y)
      else shape.lineTo(x, y)
    })
  }
  shape.closePath()
  const bore = new THREE.Path()
  bore.absarc(0, 0, hole, 0, TAU, true)
  shape.holes.push(bore)
  if (windows) {
    const wr = (root - hole) * 0.28
    const at = hole + (root - hole) * 0.52
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU + 0.3
      const w = new THREE.Path()
      w.absarc(at * Math.cos(a), at * Math.sin(a), wr, 0, TAU, true)
      shape.holes.push(w)
    }
  }
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: quality === 'high',
    bevelThickness: 0.012,
    bevelSize: 0.01,
    bevelSegments: 1,
    curveSegments: quality === 'high' ? 16 : 8,
  })
  g.translate(0, 0, -depth / 2)
  return g
}

/** Three meshing gears. Speeds follow the tooth ratio; each starts with a gap facing its partner's tooth. */
function Gears({ accent }: { accent: string }) {
  const p = usePalette()
  const { quality } = useRig()
  const spec = useMemo(() => {
    const mod = 0.05
    const A = { z: 22, c: new THREE.Vector2(-0.48, 1.04) }
    const B = { z: 14, c: new THREE.Vector2() }
    const C = { z: 10, c: new THREE.Vector2() }
    const rA = (A.z * mod) / 2
    const rB = (B.z * mod) / 2
    const rC = (C.z * mod) / 2
    const phi = THREE.MathUtils.degToRad(-28)
    const psi = THREE.MathUtils.degToRad(46)
    B.c.set(A.c.x + (rA + rB) * Math.cos(phi), A.c.y + (rA + rB) * Math.sin(phi))
    C.c.set(B.c.x + (rB + rC) * Math.cos(psi), B.c.y + (rB + rC) * Math.sin(psi))
    const sB = TAU / B.z
    const sC = TAU / C.z
    const a0 = phi
    const b0 = phi + Math.PI - 0.5 * sB
    const delta = (((psi - b0) % sB) + sB) % sB
    const c0 = psi + Math.PI - 0.5 * sC + delta * (B.z / C.z)
    return {
      gears: [
        { ...A, r: rA, start: a0, ratio: 1, geo: gearGeometry(A.z, rA, 0.14, 0.07, true, quality) },
        { ...B, r: rB, start: b0, ratio: -A.z / B.z, geo: gearGeometry(B.z, rB, 0.14, 0.06, false, quality) },
        { ...C, r: rC, start: c0, ratio: A.z / C.z, geo: gearGeometry(C.z, rC, 0.14, 0.05, false, quality) },
      ],
    }
  }, [quality])
  useEffect(() => () => spec.gears.forEach((g) => g.geo.dispose()), [spec])

  const refs = useRef<(THREE.Mesh | null)[]>([])
  useMotion((t) => {
    spec.gears.forEach((g, i) => {
      const m = refs.current[i]
      if (m) m.rotation.z = g.start + g.ratio * t * 0.55
    })
  })
  const mats = [p.accent(accent), p.satin, p.ivory]

  return (
    <group>
      <Part away={[0, -0.1, -0.5]}>
        <Box size={[2.7, 0.12, 1.1]} at={[0, 0.06, 0]} mat={p.dark} />
        <Box size={[2.5, 1.9, 0.1]} at={[0, 1.07, -0.28]} mat={p.ivory} />
        {[
          [-1.1, 0.25],
          [1.1, 0.25],
          [-1.1, 1.9],
          [1.1, 1.9],
        ].map(([x, y], i) => (
          <Cyl key={i} r={0.04} h={0.04} at={[x, y, -0.21]} rot={[Math.PI / 2, 0, 0]} mat={p.satin} low />
        ))}
      </Part>
      {spec.gears.map((g, i) => (
        <group key={i}>
          <Part at={[g.c.x, g.c.y, 0]} away={[0, 0, 0.2]}>
            <Cyl r={0.045} h={0.5} at={[0, 0, -0.04]} rot={[Math.PI / 2, 0, 0]} mat={p.satin} />
          </Part>
          <Part at={[g.c.x, g.c.y, 0]} away={[0, 0, 0.55 + i * 0.35]}>
            <mesh
              ref={(m) => {
                refs.current[i] = m
              }}
              geometry={g.geo}
              material={mats[i]}
              rotation={[0, 0, g.start]}
              castShadow
              receiveShadow
            />
          </Part>
        </group>
      ))}
    </group>
  )
}

// ---------------------------------------------------------------- electrical: a circuit board

const TRACES: [number, number][][] = [
  [
    [-0.25, 0],
    [-0.6, 0],
    [-0.8, -0.2],
    [-0.8, -0.55],
  ],
  [
    [0.25, 0.1],
    [0.6, 0.1],
    [0.75, 0.25],
    [0.95, 0.25],
  ],
  [
    [0.25, -0.1],
    [0.55, -0.1],
    [0.7, -0.35],
    [0.7, -0.55],
  ],
  [
    [0, 0.25],
    [0, 0.5],
    [-0.35, 0.5],
    [-0.55, 0.62],
  ],
  [
    [-0.1, -0.25],
    [-0.1, -0.5],
    [0.25, -0.62],
  ],
  [
    [-0.6, 0.15],
    [-0.95, 0.15],
  ],
]

function Pcb({ accent }: { accent: string }) {
  const p = usePalette()
  const { quality } = useRig()
  const led = useRef<THREE.Mesh>(null)
  const glow = useGlow(accent)
  useMotion((t) => {
    const m = led.current?.material as THREE.MeshStandardMaterial | undefined
    if (m) m.emissiveIntensity = 0.5 + 0.9 * (0.5 + 0.5 * Math.sin(t * 3.2))
  })
  const segments = useMemo(() => {
    const out: { a: V3; b: V3 }[] = []
    TRACES.forEach((line) => {
      for (let i = 0; i < line.length - 1; i++) {
        const [x1, z1] = line[i]!
        const [x2, z2] = line[i + 1]!
        out.push({ a: [x1, 0, z1], b: [x2, 0, z2] })
      }
    })
    return out
  }, [])
  const top = 0.2
  return (
    <group rotation={[0, 0, 0]}>
      <Part away={[0, -0.15, 0]}>
        <Box size={[2.4, 0.07, 1.6]} at={[0, 0.16, 0]} mat={p.board} />
        {[
          [-1.08, -0.68],
          [1.08, -0.68],
          [-1.08, 0.68],
          [1.08, 0.68],
        ].map(([x, z], i) => (
          <Cyl key={i} r={0.05} h={0.13} at={[x, 0.065, z]} mat={p.satin} low />
        ))}
        {/* Copper traces, laid flat on the board. */}
        <group position={[0, top, 0]}>
          {segments.map((s, i) => (
            <group key={i} rotation={[0, 0, 0]}>
              <Member a={s.a} b={s.b} r={0.014} mat={p.gold} />
            </group>
          ))}
        </group>
      </Part>
      {/* The microcontroller and its pins. */}
      <Part at={[0, top + 0.04, 0]} away={[0, 0.7, 0]}>
        <Box size={[0.5, 0.08, 0.5]} mat={p.dark} />
        {quality === 'high' &&
          Array.from({ length: 8 }, (_, i) => -0.21 + i * 0.06).flatMap((o, i) => [
            <Box key={`n${i}`} size={[0.025, 0.02, 0.08]} at={[o, -0.03, 0.29]} mat={p.satin} />,
            <Box key={`s${i}`} size={[0.025, 0.02, 0.08]} at={[o, -0.03, -0.29]} mat={p.satin} />,
            <Box key={`e${i}`} size={[0.08, 0.02, 0.025]} at={[0.29, -0.03, o]} mat={p.satin} />,
            <Box key={`w${i}`} size={[0.08, 0.02, 0.025]} at={[-0.29, -0.03, o]} mat={p.satin} />,
          ])}
        <Box size={[0.12, 0.004, 0.12]} at={[-0.14, 0.042, -0.14]} mat={p.satin} />
      </Part>
      {/* Two smaller chips. */}
      <Part at={[0.62, top + 0.03, -0.45]} away={[0, 0.5, 0]}>
        <Box size={[0.34, 0.06, 0.2]} mat={p.dark} />
      </Part>
      <Part at={[-0.62, top + 0.03, 0.42]} away={[0, 0.55, 0]}>
        <Box size={[0.3, 0.06, 0.18]} mat={p.dark} />
      </Part>
      {/* Capacitors with accent sleeves. */}
      {[
        [-0.8, -0.62],
        [-0.55, -0.62],
        [0.95, 0.5],
      ].map(([x, z], i) => (
        <Part key={i} at={[x!, top + 0.12, z!]} away={[0, 0.85 + i * 0.1, 0]}>
          <Cyl r={0.075} h={0.24} mat={p.accent(accent)} />
          <Cyl r={0.076} h={0.02} at={[0, 0.12, 0]} mat={p.satin} />
        </Part>
      ))}
      {/* The header strip. */}
      <Part at={[0.1, top + 0.05, 0.68]} away={[0, 0.45, 0.25]}>
        <Box size={[1.1, 0.1, 0.1]} mat={p.dark} />
        {quality === 'high' &&
          Array.from({ length: 10 }, (_, i) => <Box key={i} size={[0.02, 0.14, 0.02]} at={[-0.495 + i * 0.11, 0.1, 0]} mat={p.gold} />)}
      </Part>
      {/* A USB port and a status LED. */}
      <Part at={[-1.1, top + 0.06, -0.1]} away={[-0.4, 0.2, 0]}>
        <Box size={[0.24, 0.12, 0.3]} mat={p.satin} />
      </Part>
      <Part at={[0.95, top + 0.03, 0.05]} away={[0, 0.4, 0]}>
        <mesh ref={led} material={glow} scale={[0.05, 0.05, 0.05]} castShadow>
          <sphereGeometry args={[1, 16, 12]} />
        </mesh>
      </Part>
    </group>
  )
}

// ---------------------------------------------------------------- civil: a building frame

function Frame({ accent }: { accent: string }) {
  const p = usePalette()
  const xs = [-0.95, 0, 0.95]
  const zs = [-0.55, 0.55]
  const levels = [0.12, 1.0, 1.88]
  const brace = p.accent(accent)
  return (
    <group>
      <Part away={[0, -0.1, 0]}>
        <Box size={[2.5, 0.12, 1.5]} at={[0, 0.06, 0]} mat={p.dark} />
        {xs.flatMap((x) => zs.map((z) => <Box key={`${x}${z}`} size={[0.24, 0.06, 0.24]} at={[x, 0.15, z]} mat={p.satin} />))}
      </Part>
      {[0, 1].map((storey) => (
        <Part key={storey} away={[0, 0.35 + storey * 0.55, 0]}>
          {/* Columns. */}
          {xs.flatMap((x) =>
            zs.map((z) => <Member key={`c${x}${z}`} a={[x, levels[storey]!, z]} b={[x, levels[storey + 1]!, z]} r={0.045} mat={p.ivory} />),
          )}
          {/* Beams on the level above. */}
          {zs.map((z) => (
            <Member key={`bx${z}`} a={[xs[0]!, levels[storey + 1]!, z]} b={[xs[2]!, levels[storey + 1]!, z]} r={0.04} mat={p.ivory} />
          ))}
          {xs.map((x) => (
            <Member key={`bz${x}`} a={[x, levels[storey + 1]!, zs[0]!]} b={[x, levels[storey + 1]!, zs[1]!]} r={0.035} mat={p.ivory} />
          ))}
          {/* Cross-bracing on the back and side bays: the frame's lateral system. */}
          <Member a={[xs[0]!, levels[storey]!, zs[0]!]} b={[xs[1]!, levels[storey + 1]!, zs[0]!]} r={0.018} mat={brace} round />
          <Member a={[xs[1]!, levels[storey]!, zs[0]!]} b={[xs[0]!, levels[storey + 1]!, zs[0]!]} r={0.018} mat={brace} round />
          <Member a={[xs[2]!, levels[storey]!, zs[0]!]} b={[xs[2]!, levels[storey + 1]!, zs[1]!]} r={0.018} mat={brace} round />
          <Member a={[xs[2]!, levels[storey]!, zs[1]!]} b={[xs[2]!, levels[storey + 1]!, zs[0]!]} r={0.018} mat={brace} round />
          {/* The floor slab it carries. */}
          <Box size={[2.06, 0.05, 1.26]} at={[0, levels[storey + 1]! + 0.05, 0]} mat={storey === 1 ? p.satin : p.glass} />
        </Part>
      ))}
    </group>
  )
}

// ---------------------------------------------------------------- civil (projects): a bridge truss

function Truss({ accent }: { accent: string }) {
  const p = usePalette()
  const panels = 6
  const span = 2.4
  const h = 0.62
  const y0 = 0.42
  const zs = [-0.36, 0.36]
  const xAt = (i: number) => -span / 2 + (span / panels) * i
  const diag = p.accent(accent)
  return (
    <group>
      <Part away={[0, -0.15, 0]}>
        <Box size={[0.4, 0.42, 1.0]} at={[-1.3, 0.21, 0]} mat={p.dark} />
        <Box size={[0.4, 0.42, 1.0]} at={[1.3, 0.21, 0]} mat={p.dark} />
      </Part>
      <Part away={[0, -0.05, 0]}>
        <Box size={[span, 0.05, 0.72]} at={[0, y0 + 0.01, 0]} mat={p.satin} />
      </Part>
      {zs.map((z, side) => (
        <Part key={z} away={[0, 0.25, side ? 0.45 : -0.45]}>
          <Member a={[xAt(0), y0, z]} b={[xAt(panels), y0, z]} r={0.035} mat={p.ivory} />
          <Member a={[xAt(1), y0 + h, z]} b={[xAt(panels - 1), y0 + h, z]} r={0.035} mat={p.ivory} />
          <Member a={[xAt(0), y0, z]} b={[xAt(1), y0 + h, z]} r={0.035} mat={p.ivory} />
          <Member a={[xAt(panels), y0, z]} b={[xAt(panels - 1), y0 + h, z]} r={0.035} mat={p.ivory} />
          {Array.from({ length: panels - 1 }, (_, i) => i + 1).map((i) => (
            <Member key={`v${i}`} a={[xAt(i), y0, z]} b={[xAt(i), y0 + h, z]} r={0.022} mat={p.ivory} />
          ))}
          {/* Pratt diagonals lean towards midspan, working in tension. */}
          {Array.from({ length: panels - 2 }, (_, i) => i + 1).map((i) => {
            const toMid = i < panels / 2
            return toMid ? (
              <Member key={`d${i}`} a={[xAt(i), y0 + h, z]} b={[xAt(i + 1), y0, z]} r={0.016} mat={diag} round />
            ) : (
              <Member key={`d${i}`} a={[xAt(i), y0, z]} b={[xAt(i + 1), y0 + h, z]} r={0.016} mat={diag} round />
            )
          })}
        </Part>
      ))}
      <Part away={[0, 0.7, 0]}>
        {Array.from({ length: panels - 1 }, (_, i) => i + 1).map((i) => (
          <Member key={i} a={[xAt(i), y0 + h, zs[0]!]} b={[xAt(i), y0 + h, zs[1]!]} r={0.016} mat={p.satin} />
        ))}
      </Part>
    </group>
  )
}

// ---------------------------------------------------------------- petroleum: a drilling derrick

function Derrick({ accent }: { accent: string }) {
  const p = usePalette()
  const { quality } = useRig()
  const kelly = useRef<THREE.Group>(null)
  const block = useRef<THREE.Group>(null)
  useMotion((t) => {
    if (kelly.current) kelly.current.rotation.y = t * 2.2
    if (block.current) block.current.position.y = 1.95 + Math.sin(t * 0.6) * 0.12
  })
  const base = 0.52
  const topW = 0.13
  const y0 = 0.42
  const y1 = 2.55
  const lv = [0, 0.22, 0.42, 0.6, 0.76, 0.9, 1]
  const at = (f: number) => base + (topW - base) * f
  const corner = (f: number, sx: number, sz: number): V3 => [sx * at(f), y0 + (y1 - y0) * f, sz * at(f)]
  const corners: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]
  const legMat = p.accent(accent)
  return (
    <group>
      <Part away={[0, -0.12, 0]}>
        <Box size={[1.5, 0.3, 1.5]} at={[0, 0.27, 0]} mat={p.dark} />
        <Box size={[1.7, 0.12, 1.7]} at={[0, 0.06, 0]} mat={p.satin} />
        {/* The rotary table: its stripes make the turning visible. */}
        <Cyl r={0.22} h={0.04} at={[0, 0.44, 0]} mat={p.satin} />
      </Part>
      <Part away={[0, 0.5, 0]}>
        {corners.map(([sx, sz], i) => (
          <Member key={`l${i}`} a={corner(0, sx, sz)} b={corner(1, sx, sz)} r={0.035} mat={legMat} />
        ))}
        {lv.slice(1).map((f, k) =>
          corners.map(([sx, sz], i) => {
            const [nx, nz] = corners[(i + 1) % 4]!
            return <Member key={`g${k}${i}`} a={corner(f, sx, sz)} b={corner(f, nx, nz)} r={0.016} mat={p.satin} />
          }),
        )}
        {lv.slice(0, -1).map((f, k) =>
          corners.map(([sx, sz], i) => {
            if (quality === 'low' && (i + k) % 2) return null
            const [nx, nz] = corners[(i + 1) % 4]!
            const g = lv[k + 1]!
            return (
              <group key={`x${k}${i}`}>
                <Member a={corner(f, sx, sz)} b={corner(g, nx, nz)} r={0.011} mat={p.satin} round />
                {quality === 'high' && <Member a={corner(f, nx, nz)} b={corner(g, sx, sz)} r={0.011} mat={p.satin} round />}
              </group>
            )
          }),
        )}
        {/* Crown block and the travelling block on its line. */}
        <Box size={[0.36, 0.14, 0.36]} at={[0, y1 + 0.07, 0]} mat={p.dark} />
        <Member a={[0, y1, 0]} b={[0, 1.95, 0]} r={0.006} mat={p.dark} round />
        <group ref={block} position={[0, 1.95, 0]}>
          <Box size={[0.16, 0.22, 0.12]} mat={p.ivory} />
        </group>
      </Part>
      <Part away={[0, 0.25, 0]}>
        <group ref={kelly} position={[0, 0.46, 0]}>
          <Cyl r={0.04} h={1.4} at={[0, 0.7, 0]} mat={p.satin} />
          <Box size={[0.12, 0.5, 0.12]} at={[0, 1.15, 0]} mat={p.ivory} />
          <Box size={[0.44, 0.02, 0.06]} at={[0, 0.02, 0]} mat={legMat} />
          <Box size={[0.06, 0.02, 0.44]} at={[0, 0.02, 0]} mat={legMat} />
        </group>
      </Part>
    </group>
  )
}

// ---------------------------------------------------------------- chemical: a stirred reactor

function Reactor({ accent }: { accent: string }) {
  const p = usePalette()
  const { quality } = useRig()
  const impeller = useRef<THREE.Group>(null)
  useMotion((t) => {
    if (impeller.current) impeller.current.rotation.y = t * 3
  })
  const R = 0.52
  const yb = 0.62
  const yt = 1.72
  const seg = quality === 'high' ? 40 : 20
  const pipe = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(R, yb + 0.15, 0),
      new THREE.Vector3(R + 0.35, yb + 0.15, 0),
      new THREE.Vector3(R + 0.5, yb + 0.3, 0),
      new THREE.Vector3(R + 0.5, 1.9, 0),
      new THREE.Vector3(R + 0.32, 2.05, 0),
      new THREE.Vector3(0.12, 2.05, 0),
    ])
    return new THREE.TubeGeometry(curve, 48, 0.045, 10, false)
  }, [])
  useEffect(() => () => pipe.dispose(), [pipe])
  return (
    <group>
      <Part away={[0, -0.15, 0]}>
        <Cyl r={0.82} h={0.1} at={[0, 0.05, 0]} mat={p.dark} />
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * TAU + Math.PI / 4
          return <Member key={i} a={[Math.cos(a) * 0.55, 0.1, Math.sin(a) * 0.55]} b={[Math.cos(a) * 0.42, yb + 0.1, Math.sin(a) * 0.42]} r={0.03} mat={p.satin} round />
        })}
      </Part>
      {/* The shell is glass so the process inside stays visible. */}
      <Part away={[0, 0, 0.0]}>
        <mesh material={p.glass} position={[0, (yb + yt) / 2, 0]} scale={[R, yt - yb, R]}>
          <cylinderGeometry args={[1, 1, 1, seg, 1, true]} />
        </mesh>
        <mesh material={p.glass} position={[0, yb, 0]} scale={[R, R * 0.5, R]}>
          <sphereGeometry args={[1, seg, 12, 0, TAU, Math.PI / 2, Math.PI / 2]} />
        </mesh>
        <mesh material={p.liquid(accent)} position={[0, yb + 0.33, 0]} scale={[R * 0.97, 0.66, R * 0.97]}>
          <cylinderGeometry args={[1, 1, 1, seg]} />
        </mesh>
        <mesh material={p.liquid(accent)} position={[0, yb, 0]} scale={[R * 0.97, R * 0.48, R * 0.97]}>
          <sphereGeometry args={[1, seg, 12, 0, TAU, Math.PI / 2, Math.PI / 2]} />
        </mesh>
        {[yb + 0.12, (yb + yt) / 2, yt - 0.08].map((y) => (
          <mesh key={y} material={p.satin} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[R + 0.012, 0.022, 8, seg]} />
          </mesh>
        ))}
        <mesh geometry={pipe} material={p.satin} castShadow />
      </Part>
      <Part away={[0, 0.9, 0]}>
        <mesh material={p.ivory} position={[0, yt, 0]} scale={[R, R * 0.42, R]} castShadow>
          <sphereGeometry args={[1, seg, 12, 0, TAU, 0, Math.PI / 2]} />
        </mesh>
        <Cyl r={0.16} h={0.3} at={[0, yt + 0.36, 0]} mat={p.dark} />
        <Cyl r={0.1} h={0.1} at={[0, yt + 0.56, 0]} mat={p.satin} />
        <Cyl r={0.05} h={0.14} at={[0.28, yt + 0.16, 0.12]} mat={p.satin} />
      </Part>
      <Part away={[0, 0.45, 0]}>
        <group ref={impeller}>
          <Cyl r={0.025} h={1.2} at={[0, yb + 0.55, 0]} mat={p.satin} />
          {[yb + 0.08, yb + 0.48].map((y) =>
            [0, 1, 2, 3].map((i) => (
              <Box key={`${y}${i}`} size={[0.34, 0.1, 0.02]} at={[Math.cos((i * Math.PI) / 2) * 0.17, y, Math.sin((i * Math.PI) / 2) * 0.17]} rot={[0, -(i * Math.PI) / 2, 0]} mat={p.accent(accent)} />
            )),
          )}
        </group>
      </Part>
    </group>
  )
}

// ---------------------------------------------------------------- mechatronics: a robot arm

function Arm({ accent }: { accent: string }) {
  const p = usePalette()
  const yaw = useRef<THREE.Group>(null)
  const shoulder = useRef<THREE.Group>(null)
  const elbow = useRef<THREE.Group>(null)
  const wrist = useRef<THREE.Group>(null)
  const fingerA = useRef<THREE.Group>(null)
  const fingerB = useRef<THREE.Group>(null)
  const pose = (t: number) => {
    if (yaw.current) yaw.current.rotation.y = 0.5 + Math.sin(t * 0.5) * 0.7
    if (shoulder.current) shoulder.current.rotation.z = -0.35 + Math.sin(t * 0.7) * 0.22
    if (elbow.current) elbow.current.rotation.z = 1.25 + Math.sin(t * 0.7 + 0.8) * 0.3
    if (wrist.current) wrist.current.rotation.z = 0.55 + Math.sin(t * 0.9) * 0.25
    const g = 0.06 + (0.5 + 0.5 * Math.sin(t * 1.4)) * 0.06
    if (fingerA.current) fingerA.current.position.z = g
    if (fingerB.current) fingerB.current.position.z = -g
  }
  useMotion(pose)
  const joint = p.accent(accent)
  return (
    <group>
      <Part away={[0, -0.15, 0]}>
        <Cyl r={0.5} h={0.12} at={[0, 0.06, 0]} mat={p.dark} />
        <Cyl r={0.36} h={0.12} at={[0, 0.18, 0]} mat={p.satin} />
      </Part>
      <Part away={[0, 0.35, 0]}>
        <group ref={yaw} position={[0, 0.24, 0]} rotation={[0, 0.5, 0]}>
          <Cyl r={0.3} h={0.32} at={[0, 0.16, 0]} mat={p.ivory} />
          <Cyl r={0.17} h={0.5} at={[0, 0.42, 0]} rot={[Math.PI / 2, 0, 0]} mat={joint} />
          <group ref={shoulder} position={[0, 0.42, 0]} rotation={[0, 0, -0.35]}>
            <Box size={[0.2, 0.95, 0.22]} at={[0, 0.48, 0]} mat={p.ivory} />
            <group ref={elbow} position={[0, 0.95, 0]} rotation={[0, 0, 1.25]}>
              <Cyl r={0.13} h={0.36} rot={[Math.PI / 2, 0, 0]} mat={joint} />
              <Box size={[0.15, 0.78, 0.17]} at={[0, 0.4, 0]} mat={p.ivory} />
              <group ref={wrist} position={[0, 0.8, 0]} rotation={[0, 0, 0.55]}>
                <Cyl r={0.09} h={0.26} rot={[Math.PI / 2, 0, 0]} mat={joint} />
                <Box size={[0.12, 0.16, 0.26]} at={[0, 0.12, 0]} mat={p.dark} />
                <group ref={fingerA} position={[0, 0.27, 0.08]}>
                  <Box size={[0.05, 0.18, 0.03]} mat={p.satin} />
                </group>
                <group ref={fingerB} position={[0, 0.27, -0.08]}>
                  <Box size={[0.05, 0.18, 0.03]} mat={p.satin} />
                </group>
              </group>
            </group>
          </group>
        </group>
      </Part>
    </group>
  )
}

// ---------------------------------------------------------------- industrial: a conveyor cell

function Conveyor({ accent }: { accent: string }) {
  const p = usePalette()
  const rollers = useRef<(THREE.Mesh | null)[]>([])
  const parts = useRef<(THREE.Group | null)[]>([])
  const scanLight = useRef<THREE.Mesh>(null)
  const scan = useGlow(accent)
  const L = 2.5
  const yBelt = 0.66
  const xs = Array.from({ length: 10 }, (_, i) => -L / 2 + 0.1 + (i * (L - 0.2)) / 9)
  useMotion((t) => {
    rollers.current.forEach((r) => {
      if (r) r.rotation.y = -t * 4
    })
    parts.current.forEach((g, i) => {
      if (!g) return
      const u = (((t * 0.28 + i / 3) % 1) + 1) % 1
      g.position.x = -L / 2 + 0.15 + u * (L - 0.3)
    })
    const m = scanLight.current?.material as THREE.MeshStandardMaterial | undefined
    if (m) m.emissiveIntensity = parts.current.some((g) => g && Math.abs(g.position.x - 0.35) < 0.14) ? 2.2 : 0.4
  })
  return (
    <group>
      <Part away={[0, -0.2, 0]}>
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => <Member key={`${sx}${sz}`} a={[sx * 1.1, 0, sz * 0.3]} b={[sx * 1.1, yBelt - 0.08, sz * 0.3]} r={0.03} mat={p.satin} />),
        )}
        <Box size={[L, 0.12, 0.06]} at={[0, yBelt - 0.04, 0.34]} mat={p.ivory} />
        <Box size={[L, 0.12, 0.06]} at={[0, yBelt - 0.04, -0.34]} mat={p.ivory} />
        {xs.map((x, i) => (
          <mesh
            key={x}
            ref={(m) => {
              rollers.current[i] = m
            }}
            position={[x, yBelt - 0.04, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[0.045, 0.6, 0.045]}
            material={p.satin}
            castShadow
          >
            <cylinderGeometry args={[1, 1, 1, 12]} />
          </mesh>
        ))}
      </Part>
      <Part away={[0, 0.12, 0]}>
        <Box size={[L - 0.1, 0.02, 0.56]} at={[0, yBelt + 0.02, 0]} mat={p.rubber} />
      </Part>
      <Part away={[0, 0.5, 0]}>
        {[0, 1, 2].map((i) => (
          <group
            key={i}
            ref={(g) => {
              parts.current[i] = g
            }}
            position={[-0.8 + i * 0.8, yBelt + 0.15, 0]}
          >
            <Box size={[0.26, 0.24, 0.26]} mat={i === 1 ? p.accent(accent) : p.ivory} />
          </group>
        ))}
      </Part>
      {/* The inspection station: a gantry with a sensor that lights as each part passes. */}
      <Part away={[0, 0.85, 0]}>
        <Member a={[0.35, 0, 0.5]} b={[0.35, 1.45, 0.5]} r={0.04} mat={p.dark} />
        <Member a={[0.35, 0, -0.5]} b={[0.35, 1.45, -0.5]} r={0.04} mat={p.dark} />
        <Member a={[0.35, 1.45, 0.54]} b={[0.35, 1.45, -0.54]} r={0.05} mat={p.accent(accent)} />
        <Box size={[0.18, 0.16, 0.2]} at={[0.35, 1.3, 0]} mat={p.ivory} />
        <mesh ref={scanLight} material={scan} position={[0.35, 1.2, 0]} scale={[0.04, 0.04, 0.04]}>
          <sphereGeometry args={[1, 12, 10]} />
        </mesh>
      </Part>
    </group>
  )
}

// ---------------------------------------------------------------- projects: a rover

function Rover({ accent }: { accent: string }) {
  const p = usePalette()
  const wheels = useRef<(THREE.Group | null)[]>([])
  const mast = useRef<THREE.Group>(null)
  useMotion((t) => {
    wheels.current.forEach((w) => {
      if (w) w.rotation.z = -t * 3
    })
    if (mast.current) mast.current.rotation.y = Math.sin(t * 0.8) * 0.5
  })
  const wheelAt: V3[] = [
    [-0.52, 0.26, 0.56],
    [0.52, 0.26, 0.56],
    [-0.52, 0.26, -0.56],
    [0.52, 0.26, -0.56],
  ]
  return (
    <group>
      <Part away={[0, -0.05, 0]}>
        <Box size={[1.5, 0.08, 0.9]} at={[0, 0.36, 0]} mat={p.ivory} />
        <Box size={[1.5, 0.03, 0.9]} at={[0, 0.415, 0]} mat={p.accent(accent)} />
      </Part>
      {wheelAt.map((at, i) => (
        <Part key={i} at={at} away={[0, -0.05, at[2] > 0 ? 0.55 : -0.55]}>
          <group
            ref={(g) => {
              wheels.current[i] = g
            }}
          >
            <Cyl r={0.26} h={0.16} rot={[Math.PI / 2, 0, 0]} mat={p.rubber} />
            <Cyl r={0.13} h={0.17} rot={[Math.PI / 2, 0, 0]} mat={p.satin} />
            <Box size={[0.4, 0.04, 0.171]} mat={p.satin} />
          </group>
        </Part>
      ))}
      <Part at={[-0.25, 0.53, 0]} away={[0, 0.5, 0]}>
        <Box size={[0.5, 0.2, 0.42]} mat={p.dark} />
      </Part>
      <Part at={[0.3, 0.45, 0]} away={[0, 0.7, 0]}>
        <Box size={[0.5, 0.03, 0.36]} mat={p.board} />
        <Box size={[0.16, 0.04, 0.16]} at={[0, 0.03, 0]} mat={p.dark} />
      </Part>
      <Part at={[0.62, 0.43, 0]} away={[0.45, 0.6, 0]}>
        <group ref={mast}>
          <Cyl r={0.025} h={0.5} at={[0, 0.25, 0]} mat={p.satin} low />
          <Box size={[0.1, 0.12, 0.34]} at={[0, 0.55, 0]} mat={p.ivory} />
          <Cyl r={0.045} h={0.06} at={[0.07, 0.55, 0.09]} rot={[0, 0, Math.PI / 2]} mat={p.satin} />
          <Cyl r={0.045} h={0.06} at={[0.07, 0.55, -0.09]} rot={[0, 0, Math.PI / 2]} mat={p.satin} />
        </group>
      </Part>
    </group>
  )
}

// ---------------------------------------------------------------- projects: a sensor node

function SensorNode({ accent }: { accent: string }) {
  const p = usePalette()
  const glow = useGlow(accent)
  const lamp = useRef<THREE.Mesh>(null)
  useMotion((t) => {
    const m = lamp.current?.material as THREE.MeshStandardMaterial | undefined
    if (m) m.emissiveIntensity = (t * 1.2) % 2 < 0.25 ? 2.4 : 0.3
  })
  return (
    <group>
      <Part away={[0, -0.1, 0]}>
        <Box size={[0.9, 0.08, 0.9]} at={[0, 0.04, 0]} mat={p.dark} />
        <Cyl r={0.05} h={1.9} at={[0, 1.0, 0]} mat={p.satin} />
      </Part>
      <Part at={[0, 1.05, 0.16]} away={[0, 0, 0.35]}>
        <Box size={[0.52, 0.62, 0.22]} mat={p.ivory} />
        <mesh ref={lamp} material={glow} position={[0.16, 0.2, 0.115]} scale={[0.03, 0.03, 0.03]}>
          <sphereGeometry args={[1, 12, 10]} />
        </mesh>
      </Part>
      <Part at={[0, 1.05, 0.29]} away={[0, 0, 0.8]}>
        <Box size={[0.5, 0.6, 0.03]} mat={p.accent(accent)} />
      </Part>
      <Part at={[0, 1.05, 0.13]} away={[0, 0, 0.12]}>
        <Box size={[0.36, 0.42, 0.02]} mat={p.board} />
      </Part>
      <Part at={[0, 2.0, 0]} away={[0, 0.5, 0]}>
        <group rotation={[-0.5, 0, 0]}>
          <Box size={[0.9, 0.04, 0.62]} mat={p.solar} />
          {[-0.225, 0, 0.225].map((x) => (
            <Box key={x} size={[0.006, 0.045, 0.6]} at={[x, 0, 0]} mat={p.satin} />
          ))}
          <Box size={[0.88, 0.045, 0.006]} mat={p.satin} />
        </group>
      </Part>
      <Part at={[0.22, 1.36, 0.1]} away={[0.3, 0.6, 0]}>
        <Cyl r={0.012} h={0.5} at={[0, 0.25, 0]} mat={p.dark} low />
        <mesh material={p.dark} position={[0, 0.52, 0]} scale={[0.03, 0.03, 0.03]}>
          <sphereGeometry args={[1, 12, 10]} />
        </mesh>
      </Part>
    </group>
  )
}

// ---------------------------------------------------------------- projects: a modular shelter

function Shelter({ accent }: { accent: string }) {
  const p = usePalette()
  const W = 1.9
  const D = 1.3
  const H = 0.95
  const y0 = 0.14
  const pitch = 0.38
  const roofLen = Math.hypot(D / 2 + 0.08, pitch)
  const angle = Math.atan2(pitch, D / 2 + 0.08)
  const roof = p.accent(accent)
  const gable = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, -D / 2, 0, 0, D / 2, 0, pitch, 0]), 3))
    g.computeVertexNormals()
    return g
  }, [])
  useEffect(() => () => gable.dispose(), [gable])
  return (
    <group>
      <Part away={[0, -0.12, 0]}>
        <Box size={[W + 0.3, 0.14, D + 0.3]} at={[0, 0.07, 0]} mat={p.dark} />
      </Part>
      <Part away={[0, 0, -0.45]}>
        <Box size={[W, H, 0.05]} at={[0, y0 + H / 2, -D / 2]} mat={p.ivory} />
      </Part>
      <Part away={[0, 0, 0.45]}>
        {/* Front wall with a door opening. */}
        <Box size={[W * 0.36, H, 0.05]} at={[-W / 2 + W * 0.18, y0 + H / 2, D / 2]} mat={p.ivory} />
        <Box size={[W * 0.36, H, 0.05]} at={[W / 2 - W * 0.18, y0 + H / 2, D / 2]} mat={p.ivory} />
        <Box size={[W * 0.28, H * 0.22, 0.05]} at={[0, y0 + H * 0.89, D / 2]} mat={p.ivory} />
        <Box size={[W * 0.2, H * 0.3, 0.02]} at={[-W / 2 + W * 0.18, y0 + H * 0.58, D / 2 + 0.03]} mat={p.glass} />
      </Part>
      {[-1, 1].map((s) => (
        <Part key={s} away={[s * 0.55, 0, 0]}>
          <Box size={[0.05, H, D]} at={[(s * W) / 2, y0 + H / 2, 0]} mat={p.ivory} />
          <mesh geometry={gable} material={p.gable} position={[(s * W) / 2, y0 + H, 0]} castShadow />
        </Part>
      ))}
      {[-1, 1].map((s) => (
        <Part key={`r${s}`} away={[0, 0.6, s * 0.35]}>
          <Box size={[W + 0.2, 0.05, roofLen]} at={[0, y0 + H + pitch / 2, (s * (D / 2 + 0.08)) / 2]} rot={[s * angle, 0, 0]} mat={roof} />
        </Part>
      ))}
    </group>
  )
}

const REGISTRY: Record<ModelId, (props: { accent: string }) => ReactElement> = {
  gears: Gears,
  gearbox: Gears,
  pcb: Pcb,
  frame: Frame,
  derrick: Derrick,
  reactor: Reactor,
  arm: Arm,
  conveyor: Conveyor,
  rover: Rover,
  'sensor-node': SensorNode,
  truss: Truss,
  shelter: Shelter,
}

export function Model({ id, accent }: { id: ModelId; accent: string }) {
  const Component = REGISTRY[id]
  return <Component accent={accent} />
}

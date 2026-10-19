'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import type { SceneProps } from '@/components/three/SceneMount'
import { ReadySignal, Studio, Ticker, configureRenderer } from '@/components/three/Studio'
import { Model, type ModelId } from '@/components/three/models'
import { ModelRig, PaletteProvider, usePalette } from '@/components/three/rig'

/*
 * The laboratory workbench: one project model on a round bench plate, turning slowly. Its
 * explode channel is driven from outside (a slider on /projects, the reading position on a
 * project's page), so the same scene serves both. `invalidateRef` lets the page request a
 * frame when the scene is otherwise still (reduced motion).
 */

export interface BenchSceneProps extends SceneProps {
  model: ModelId
  accent: string
  explodeRef: RefObject<number>
  invalidateRef?: RefObject<(() => void) | null>
  /** 'dark' sits the bench in the navy laboratory; 'light' on the ivory page. */
  surface: 'dark' | 'light'
  /** A fixed turn, in radians (capture tools only); otherwise the bench turns slowly. */
  angle?: number
}

const TARGET = new THREE.Vector3(0, 0.74, 0)

export default function BenchScene(props: BenchSceneProps) {
  const { quality, onError, still, activeRef } = props
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, quality === 'high' ? 2 : 1.5]}
      shadows={quality === 'high' ? 'percentage' : false}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: 30, position: [4.6, 3.4, 7.6], near: 0.1, far: 60 }}
      style={{ touchAction: 'pan-y' }}
      onCreated={({ gl, camera }) => {
        configureRenderer(gl, onError)
        camera.lookAt(TARGET)
      }}
    >
      <Studio quality={quality} shadowSize={3.5} />
      <PaletteProvider>
        <Bench {...props} />
      </PaletteProvider>
      <Ticker activeRef={activeRef} moving={!still} />
      <ReadySignal onReady={props.onReady} />
    </Canvas>
  )
}

function Bench({ model, accent, explodeRef, invalidateRef, still, quality, surface, angle }: BenchSceneProps) {
  const invalidate = useThree((s) => s.invalidate)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const p = usePalette()
  const turn = useRef<THREE.Group>(null)
  const running = useRef(!still)

  useEffect(() => {
    running.current = !still
  }, [still])

  useEffect(() => {
    if (invalidateRef) invalidateRef.current = invalidate
    return () => {
      if (invalidateRef) invalidateRef.current = null
    }
  }, [invalidate, invalidateRef])

  // Keep the whole exploded model in frame at any stage shape.
  useEffect(() => {
    const aspect = size.width / Math.max(size.height, 1)
    const d = Math.max(7.4, 9.4 / Math.min(aspect, 1.6))
    const dir = new THREE.Vector3(4.6, 3.4, 7.6).normalize()
    camera.position.copy(dir.multiplyScalar(d)).add(new THREE.Vector3(0, 0.4, 0))
    camera.lookAt(TARGET)
    invalidate()
  }, [camera, size.width, size.height, invalidate])

  useEffect(() => invalidate(), [model, invalidate])

  // A slow turn on the bench, so depth reads without any input.
  useFrame((_, dt) => {
    if (!turn.current) return
    if (angle !== undefined) {
      turn.current.rotation.y = angle
      return
    }
    if (still) return
    turn.current.rotation.y += Math.min(dt, 0.05) * 0.18
  })

  useEffect(() => invalidate(), [angle, invalidate])

  // On the navy laboratory the plate stays ivory, so the model reads against it.
  const seg = quality === 'high' ? 96 : 48
  return (
    <group>
      <mesh position={[0, -0.09, 0]} material={p.ivory} receiveShadow castShadow>
        <cylinderGeometry args={[1.78, 1.84, 0.18, seg]} />
      </mesh>
      <mesh position={[0, -0.2, 0]} material={surface === 'dark' ? p.satin : p.dark} receiveShadow>
        <cylinderGeometry args={[1.86, 1.86, 0.05, seg]} />
      </mesh>
      <mesh position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} material={p.accent(accent)}>
        <ringGeometry args={[1.62, 1.67, seg]} />
      </mesh>
      <group ref={turn} rotation={[0, -0.6, 0]} scale={1.1}>
        <ModelRig quality={quality} explode={explodeRef} running={running}>
          <Model key={model} id={model} accent={accent} />
        </ModelRig>
      </group>
    </group>
  )
}

'use client'

import { Environment, Lightformer } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, type RefObject } from 'react'
import * as THREE from 'three'

/** The same soft studio as the homepage sculpture: a key light, a warm fill and in-scene light panels. */
export function Studio({ quality, shadowSize = 4 }: { quality: 'high' | 'low'; shadowSize?: number }) {
  return (
    <>
      <ambientLight intensity={0.32} />
      <directionalLight
        position={[-3, 6, 7]}
        intensity={1.5}
        castShadow={quality === 'high'}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={4}
        shadow-camera-left={-shadowSize}
        shadow-camera-right={shadowSize}
        shadow-camera-top={shadowSize}
        shadow-camera-bottom={-shadowSize}
      />
      <directionalLight position={[5, 2, -4]} intensity={0.35} color="#fff3de" />
      <Environment resolution={quality === 'high' ? 256 : 64} frames={1}>
        <Lightformer form="rect" intensity={2} position={[0, 5, 3]} rotation-x={Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-6, 1, 3]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={0.7} color="#fff1d6" position={[6, 0.5, 3]} rotation-y={-Math.PI / 2} scale={[5, 3, 1]} />
        <color attach="background" args={['#b9bec7']} />
      </Environment>
    </>
  )
}

/** Shared renderer setup: neutral tone mapping, a transparent clear and context-loss handling. */
export function configureRenderer(gl: THREE.WebGLRenderer, onError: () => void) {
  gl.toneMapping = THREE.NeutralToneMapping
  gl.toneMappingExposure = 1.02
  gl.setClearColor(0x000000, 0)
  // Phones drop WebGL contexts under memory pressure and usually hand them back a moment later.
  // Only a context that stays lost counts as a failure.
  let timer = 0
  gl.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault()
    window.clearTimeout(timer)
    timer = window.setTimeout(onError, 2500)
  })
  gl.domElement.addEventListener('webglcontextrestored', () => window.clearTimeout(timer))
}

/**
 * Requests frames only while the scene is on screen, the tab is visible and something moves.
 * `moving` lets a scene stop the loop when its subject is still (reduced motion, or between
 * transitions that call `invalidate` themselves).
 */
export function Ticker({ activeRef, moving }: { activeRef: RefObject<boolean>; moving: boolean }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    if (!moving) return
    let raf = 0
    const loop = () => {
      if (activeRef.current) invalidate()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [activeRef, invalidate, moving])
  return null
}

/** Calls `onReady` after the first frames have been drawn, so the crossfade never shows an empty canvas. */
export function ReadySignal({ onReady }: { onReady: () => void }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    let a = 0
    let b = 0
    invalidate()
    a = requestAnimationFrame(() => {
      invalidate()
      b = requestAnimationFrame(() => onReady())
    })
    return () => {
      cancelAnimationFrame(a)
      cancelAnimationFrame(b)
    }
  }, [invalidate, onReady])
  return null
}

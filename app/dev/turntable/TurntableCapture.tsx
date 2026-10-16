'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import BenchScene from '@/components/pages/projects/BenchScene'
import type { ModelId } from '@/components/three/models'
import type { DisciplineId } from '@/content/disciplines'
import { DISCIPLINE_COLOR } from '@/content/platform/taxonomy'

declare global {
  interface Window {
    __setAngle?: (a: number) => void
    __ready?: boolean
  }
}

/** The bench at a fixed angle, on the light media stage, sized like the video (960 × 600). */
export function TurntableCapture({ model, discipline }: { model: ModelId; discipline: DisciplineId }) {
  const [angle, setAngle] = useState(-0.6)
  const activeRef = useRef(true)
  const explodeRef = useRef(0)
  const onReady = useCallback(() => {
    window.__ready = true
  }, [])
  const onError = useCallback(() => {}, [])
  useEffect(() => {
    window.__setAngle = setAngle
  }, [])
  return (
    <div
      id="turntable"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 960,
        height: 600,
        background: 'radial-gradient(60% 55% at 50% 62%, rgb(35 75 196 / 0.08), transparent 70%), linear-gradient(180deg, #fbfbf7, #eef1f5)',
      }}
    >
      <BenchScene
        activeRef={activeRef}
        still
        quality="high"
        onReady={onReady}
        onError={onError}
        model={model}
        accent={DISCIPLINE_COLOR[discipline]}
        explodeRef={explodeRef}
        surface="light"
        angle={angle}
      />
    </div>
  )
}

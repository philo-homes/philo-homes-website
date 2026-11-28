'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

// The app's 3D room viewer on the web. public/app-viewer/viewer.html is the
// page the app's WebView runs (scripts/sync-app-viewer.mjs copies it from
// philo-homes-mobile Room3DViewerDemo1.tsx); this component is the app
// component's bridge for a same-origin iframe: scene data in through
// window.__appViewerInit, events out through postMessage, calls straight on
// the iframe's window (the app injects "window.fn(arg)" the same way).
import { forwardRef, useEffect, useId, useImperativeHandle, useLayoutEffect, useRef } from 'react'

/** The app's pipeline-frame scene (roomHome.pipelineSceneFromFurnitureData). */
export type ViewerSceneData = {
  environment: 'studio'
  frame: 'pipeline'
  items: Array<{
    id: string
    name: string
    url: string
    position: number[]
    rotation: number[]
    scale: number[]
    lit?: boolean
    zUp?: boolean
    hiddenNodes?: number[]
  }>
}

/** The app's PlacementEvent (the subset the web reacts to is typed; the rest passes through). */
export type ViewerEvent =
  | { type: 'sceneReady' }
  | { type: 'viewerReset' }
  | { type: 'selected'; id: string | null }
  | { type: 'confirmed' }
  | { type: 'placed'; id: string; needsPlacement: boolean }
  | { type: 'placeFailed'; id: string }
  | { type: 'removed'; id: string }
  | { type: 'hidden'; id: string }
  | { type: 'restored'; id: string }
  | { type: 'moved'; id: string | null }
  | { type: 'rotated'; radians: number }
  | { type: 'arrangeState'; canUndo: boolean; canRestore: boolean }
  | { type: string; [k: string]: any }

/** exportScene(): pipeline frame, Z-up, centimetres. */
export type ViewerSceneExport = {
  hiddenRoomNodes: number[]
  items: Array<{ id: string; url: string; position: number[]; rotation: number[]; scale: number[]; replaces?: string }>
}

export type AppViewerHandle = {
  placeItem: (item: { id: string; url: string; klass?: 'floor' | 'wall'; quiet?: boolean }) => void
  removeItem: (id: string) => void
  rotateItem: (degrees: number) => void
  selectItem: (id: string | null) => void
  setEditMode: (on: boolean) => void
  setArrangeTargets: (pieces: Array<{ node: number }> | null) => void
  setRoomCut: (cut: { ceiling: boolean; walls: boolean }) => void
  undoArrange: () => void
  restoreLastDeleted: () => void
  restoreDeleted: (id: string) => void
  exportScene: () => Promise<ViewerSceneExport>
}

declare global {
  interface Window {
    __appViewerInit?: Record<string, { sceneData: ViewerSceneData | null }>
  }
}

type Props = {
  sceneData: ViewerSceneData
  /** Changes when the scene should load afresh (e.g. after a save). */
  sceneKey: string
  onEvent?: (e: ViewerEvent) => void
  className?: string
}

const AppViewer = forwardRef<AppViewerHandle, Props>(function AppViewer({ sceneData, sceneKey, onEvent, className }, ref) {
  const id = `v${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const frame = useRef<HTMLIFrameElement>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent
  const exportWaiters = useRef(new Map<number, { resolve: (s: ViewerSceneExport) => void; reject: (e: Error) => void }>())
  const seq = useRef(0)

  // The page reads its scene from here when it loads (synchronously, same
  // origin). Set in a layout effect, not during render: React's dev double
  // mount runs the cleanup once, and only an effect puts it back.
  useLayoutEffect(() => {
    window.__appViewerInit = { ...(window.__appViewerInit ?? {}), [id]: { sceneData } }
    return () => {
      if (window.__appViewerInit) delete window.__appViewerInit[id]
    }
  }, [id, sceneData])

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.__appViewer !== id) return
      let msg: any
      try {
        msg = JSON.parse(e.data.data)
      } catch {
        return
      }
      if (msg?.type === 'log') {
        console.log('[3D-page]', msg.level, msg.text)
        return
      }
      if (msg?.type === 'sceneExport') {
        const w = exportWaiters.current.get(msg.reqId)
        if (w) {
          exportWaiters.current.delete(msg.reqId)
          if (msg.error) w.reject(new Error(msg.error))
          else w.resolve(msg.scene)
        }
        return
      }
      onEventRef.current?.(msg)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [id])

  // window.fn(arg) in the page, the argument rebuilt in the page's own realm
  // (an array made here is not `instanceof Array` there).
  const call = (fn: string, arg?: unknown) => {
    const w = frame.current?.contentWindow as any
    if (!w || typeof w[fn] !== 'function') return
    w[fn](arg === undefined ? undefined : w.JSON.parse(JSON.stringify(arg)))
  }

  useImperativeHandle(ref, () => ({
    placeItem: (item) => call('placeItem', item),
    removeItem: (itemId) => call('removeItem', itemId),
    rotateItem: (deg) => call('rotateItem', deg),
    selectItem: (itemId) => call('selectItem', itemId),
    setEditMode: (on) => call('setEditMode', on),
    setArrangeTargets: (pieces) => call('setArrangeTargets', pieces),
    setRoomCut: (cut) => call('setRoomCut', cut),
    undoArrange: () => call('undoArrange'),
    restoreLastDeleted: () => call('restoreLastDeleted'),
    restoreDeleted: (key) => call('restoreDeleted', key),
    exportScene: () =>
      new Promise<ViewerSceneExport>((resolve, reject) => {
        const reqId = ++seq.current
        const timer = setTimeout(() => {
          exportWaiters.current.delete(reqId)
          reject(new Error('The 3D scene did not answer'))
        }, 5000)
        exportWaiters.current.set(reqId, {
          resolve: (s) => {
            clearTimeout(timer)
            resolve(s)
          },
          reject: (e) => {
            clearTimeout(timer)
            reject(e)
          },
        })
        call('exportScene', reqId)
      }),
  }))

  return (
    <iframe
      key={sceneKey}
      ref={frame}
      src={`/app-viewer/viewer.html?id=${id}`}
      title="3D room"
      className={className ?? 'w-full aspect-[16/10] border-0 block bg-[#f5f5f5]'}
    />
  )
})

export default AppViewer

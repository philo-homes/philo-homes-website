// How designs are grouped, the app's way (philo-homes-mobile RoomDesignParts
// designsForMode, useRoomDesigns isReplaceDesign, swapTemplates isSwapDesign,
// roomHome roomTypeLabel). Pure: used by the API routes and the pages.

export type DesignModeKey = 'whole' | 'replace' | 'add' | 'manual' | 'swap'

/** The app's five design modes, in the app's order. */
export const DESIGN_MODES: ReadonlyArray<{ key: DesignModeKey; label: string; blurb: string }> = [
  { key: 'whole', label: 'Whole room', blurb: 'The AI furnishes the whole room in a style.' },
  { key: 'replace', label: 'Replace a piece', blurb: 'Pieces of your room swapped for ones from the shop.' },
  { key: 'add', label: 'Add a piece', blurb: 'A piece from the shop added to your room.' },
  { key: 'manual', label: 'Arrange myself', blurb: 'Rooms you arranged yourself.' },
  { key: 'swap', label: 'Swap the whole room', blurb: 'Your room furnished from a template.' },
]

export const modeLabel = (k: string | null | undefined) => DESIGN_MODES.find((m) => m.key === k)?.label ?? 'Design'

/** A manual design saved from Replace a piece / Swap whole room carries this name prefix. */
const REPLACE_PREFIX = 'Replace: '
const SWAP_PREFIX = 'Swap: '

type DesignLike = {
  design_type: string
  name: string | null
  request?: Record<string, any> | null // eslint-disable-line @typescript-eslint/no-explicit-any
  result?: { mode?: string } | null
}

/** Which of the five modes made this design (null: none the customer would recognise). */
export function designMode(d: DesignLike): DesignModeKey | null {
  if (d.design_type === 'whole_room') return 'whole'
  if (d.design_type === 'manual') {
    if (d.name?.startsWith(SWAP_PREFIX)) return 'swap'
    if (d.name?.startsWith(REPLACE_PREFIX)) return 'replace'
    return 'manual'
  }
  if (d.design_type === 'single_item') {
    const m = d.result?.mode ?? d.request?.mode
    return m === 'replace' || m === 'add' ? m : null
  }
  return null
}

const ROOM_TYPE_LABELS: Record<string, string> = { 'living-dining-room': 'Living & dining room' }

/** "living-room" → "Living room" (the app's roomTypeLabel). */
export function roomTypeLabel(roomType: string | null | undefined): string {
  if (!roomType) return 'Room'
  if (ROOM_TYPE_LABELS[roomType]) return ROOM_TYPE_LABELS[roomType]
  const words = roomType.replace(/[-_]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** Room types that can be viewed but not designed yet (the app's DESIGNLESS_ROOM_TYPES). */
export const designsSupported = (roomType: string | null | undefined) => roomType !== 'studio'

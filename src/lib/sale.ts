// When the current sale ends — same rolling weekly schedule as the app
// (src/services/saleSchedule.ts): Sunday 23:59:59 local time, then the next
// week's sale starts, so the countdown never sits at zero.
export const getSaleEndsAt = (now: Date = new Date()): Date => {
  const end = new Date(now)
  const daysUntilSunday = (7 - end.getDay()) % 7
  end.setDate(end.getDate() + daysUntilSunday)
  end.setHours(23, 59, 59, 999)
  if (end.getTime() <= now.getTime()) end.setDate(end.getDate() + 7)
  return end
}

export type Countdown = { days: number; hours: number; minutes: number; seconds: number }
export const computeCountdown = (endsAt: Date, now = Date.now()): Countdown => {
  const total = Math.max(0, Math.floor((endsAt.getTime() - now) / 1000))
  return { days: Math.floor(total / 86400), hours: Math.floor((total % 86400) / 3600), minutes: Math.floor((total % 3600) / 60), seconds: total % 60 }
}

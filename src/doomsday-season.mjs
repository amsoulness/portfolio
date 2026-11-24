export const DOOMSDAY_END = Date.parse('2026-12-22T00:00:00+05:30')
export const isDoomsdaySeason = (now = Date.now()) => now < DOOMSDAY_END

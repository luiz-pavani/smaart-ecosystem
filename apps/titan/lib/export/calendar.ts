export interface AulaCalendarItem {
  id: string
  name: string
  location: string | null
  schedules: { day_of_week: number; start_time: string; end_time: string }[]
}

// iCal day abbreviations (0=Sunday)
const BYDAY: Record<number, string> = {
  0: 'SU',
  1: 'MO',
  2: 'TU',
  3: 'WE',
  4: 'TH',
  5: 'FR',
  6: 'SA',
}

function formatTime(time: string): string {
  // "15:00" or "15:00:00" → "150000"
  return time.replace(/:/g, '').padEnd(6, '0').slice(0, 6)
}

function uid(aulaId: string, day: number): string {
  return `${aulaId}-day${day}@titan.smaartpro.com`
}

// Returns next occurrence of a given weekday (0=Sun) from today
function nextWeekday(dayOfWeek: number): Date {
  const date = new Date()
  const diff = (dayOfWeek - date.getDay() + 7) % 7 || 7
  date.setDate(date.getDate() + diff)
  return date
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

export function exportAulasToCalendar(aulas: AulaCalendarItem[], academiaName = 'Academia') {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Titan SMAART PRO//Aulas//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${academiaName} — Aulas`,
    'X-WR-TIMEZONE:America/Sao_Paulo',
  ]

  for (const aula of aulas) {
    for (const schedule of aula.schedules) {
      const day = schedule.day_of_week
      const startDate = nextWeekday(day)
      const dtStart = `${formatDate(startDate)}T${formatTime(schedule.start_time)}`
      const dtEnd = `${formatDate(startDate)}T${formatTime(schedule.end_time)}`
      const byDay = BYDAY[day] ?? 'MO'

      lines.push('BEGIN:VEVENT')
      lines.push(`UID:${uid(aula.id, day)}`)
      lines.push(`DTSTART;TZID=America/Sao_Paulo:${dtStart}`)
      lines.push(`DTEND;TZID=America/Sao_Paulo:${dtEnd}`)
      lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${byDay}`)
      lines.push(`SUMMARY:${aula.name}`)
      if (aula.location) lines.push(`LOCATION:${aula.location}`)
      lines.push('END:VEVENT')
    }
  }

  lines.push('END:VCALENDAR')

  const ics = lines.join('\r\n')
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `aulas_academia.ics`
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

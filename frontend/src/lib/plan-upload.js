// Plan upload & parser for Excel (CSV) spreadsheets and structured JSON files.
import { parseCSV, matchExercise } from './import-csv.js'
import { EXIDX } from './exercises.js'
import { parsePlan } from './plan-share.js'
import { uid } from './format.js'
import { t } from './i18n.js'

const DAY_MAP = {
  mon: 1, monday: 1, m: 1, '1': 1,
  tue: 2, tues: 2, tuesday: 2, tu: 2, '2': 2,
  wed: 3, wednesday: 3, w: 3, '3': 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4, th: 4, '4': 4,
  fri: 5, friday: 5, f: 5, '5': 5,
  sat: 6, saturday: 6, sa: 6, '6': 6,
  sun: 0, sunday: 0, su: 0, '0': 0, '7': 0
}

export function parseDays(str) {
  if (!str) return []
  const parts = String(str).toLowerCase().split(/[,/;&\s]+/).filter(Boolean)
  const days = []
  for (const p of parts) {
    if (DAY_MAP[p] !== undefined && !days.includes(DAY_MAP[p])) {
      days.push(DAY_MAP[p])
    }
  }
  return days
}

function resolveExercise(nameOrId, customList) {
  if (!nameOrId) return null
  const str = String(nameOrId).trim()
  if (!str) return null

  // 1. Direct ID match in library
  if (EXIDX[str]) return str

  // 2. Existing custom exercise match
  const existingCustom = customList.find(c => (c.n || '').toLowerCase() === str.toLowerCase())
  if (existingCustom) return existingCustom.id

  // 3. Match against built-in exercises using fuzzy/alias matching
  const matched = matchExercise(str)
  if (matched && EXIDX[matched]) return matched

  // 4. Create custom exercise so user never loses their custom lifts
  const newCustomId = uid()
  customList.push({
    id: newCustomId,
    n: str,
    bp: 'other',
    desc: 'Imported from custom plan'
  })
  return newCustomId
}

/**
 * Parse a CSV exported from Excel, Google Sheets, Numbers, or LibreOffice.
 * Expected columns: Routine, Day, Exercise, Sets, Reps, Weight
 */
export function parseCSVPlan(csvText, filename = '') {
  const rows = parseCSV(csvText)
  if (!rows || rows.length < 2) {
    throw new Error(t('Spreadsheet appears to be empty or has no data rows'))
  }

  // Find header row
  const headerIdx = rows.findIndex(r => r.some(c => /routine|workout|exercise|lift/i.test(c)))
  if (headerIdx === -1) {
    throw new Error(t('Header row not found. Please ensure headers include: Routine, Day, Exercise, Sets, Reps'))
  }

  const header = rows[headerIdx].map(h => String(h || '').trim().toLowerCase())
  const colRoutine = header.findIndex(h => /routine|workout|session|split/i.test(h))
  const colDay = header.findIndex(h => /day|weekday|schedule/i.test(h))
  const colEx = header.findIndex(h => /exercise|lift|movement|name/i.test(h))
  const colSets = header.findIndex(h => /set/i.test(h))
  const colReps = header.findIndex(h => /rep/i.test(h))
  const colWeight = header.findIndex(h => /weight|load|kg|lb/i.test(h))

  if (colEx === -1) {
    throw new Error(t('Missing “Exercise” column in spreadsheet'))
  }

  const routineMap = new Map() // name -> { id, name, emoji, ex: [], days: Set }
  const customEx = []

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || !row.some(x => x && x.trim())) continue

    const rName = (colRoutine !== -1 && row[colRoutine] ? row[colRoutine].trim() : '') || 'Workout'
    const exName = row[colEx] ? row[colEx].trim() : ''
    if (!exName) continue

    const dayVal = colDay !== -1 ? row[colDay] : ''
    const sets = colSets !== -1 && parseInt(row[colSets], 10) ? Math.max(1, parseInt(row[colSets], 10)) : 3
    const reps = colReps !== -1 && parseInt(row[colReps], 10) ? Math.max(1, parseInt(row[colReps], 10)) : 10
    const weight = colWeight !== -1 && parseFloat(row[colWeight]) ? Math.max(0, parseFloat(row[colWeight])) : 0

    if (!routineMap.has(rName)) {
      routineMap.set(rName, {
        id: uid(),
        name: rName,
        emoji: 'figureStrength',
        ex: [],
        days: new Set()
      })
    }

    const rObj = routineMap.get(rName)
    if (dayVal) {
      parseDays(dayVal).forEach(d => rObj.days.add(d))
    }

    const exId = resolveExercise(exName, customEx)
    if (exId) {
      rObj.ex.push({ id: exId, sets, reps, weight })
    }
  }

  if (routineMap.size === 0) {
    throw new Error(t('No routines or exercises found in spreadsheet'))
  }

  const routines = Array.from(routineMap.values()).map(r => ({
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    ex: r.ex
  }))

  const week = {}
  routineMap.forEach(r => {
    r.days.forEach(d => {
      week[d] = r.id
    })
  })

  const planName = filename
    ? filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
    : 'Imported Plan'

  return {
    name: planName,
    routines,
    week,
    customEx,
    dropped: 0,
    routineCount: routines.length,
    exerciseCount: routines.reduce((n, r) => n + r.ex.length, 0),
    scheduledDays: Object.keys(week).length
  }
}

/**
 * Parse structured JSON plan (either openGym native or user-friendly simplified format).
 */
export function parseJSONPlan(jsonText, filename = '') {
  const data = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText
  if (!data || typeof data !== 'object') {
    throw new Error(t('Invalid JSON file format'))
  }

  // 1. Native openGym plan format
  if (data.opengym_plan && Array.isArray(data.routines)) {
    return parsePlan(data)
  }

  // 2. Simplified custom format
  if (Array.isArray(data.routines)) {
    const customEx = Array.isArray(data.customEx) ? [...data.customEx] : []
    const week = {}
    const rNameIdMap = {}

    const routines = data.routines.map(r => {
      const rid = r.id || uid()
      if (r.name) rNameIdMap[r.name.toLowerCase().trim()] = rid
      const exercises = Array.isArray(r.exercises) ? r.exercises : (Array.isArray(r.ex) ? r.ex : [])

      const cleanExList = exercises.map(e => {
        const id = resolveExercise(e.id || e.name || e.n, customEx)
        return {
          id,
          sets: e.sets || 3,
          reps: e.reps ?? 10,
          weight: e.weight || 0
        }
      }).filter(e => !!e.id)

      return {
        id: rid,
        name: r.name || t('Routine'),
        emoji: r.emoji || 'figureStrength',
        ex: cleanExList
      }
    })

    // Parse week schedule
    if (data.week && typeof data.week === 'object') {
      Object.entries(data.week).forEach(([dayKey, rVal]) => {
        const dList = parseDays(dayKey)
        const targetRid = (rVal && rNameIdMap[String(rVal).toLowerCase().trim()]) ||
          routines.find(r => r.id === rVal || r.name === rVal)?.id
        if (targetRid) {
          dList.forEach(d => { week[d] = targetRid })
        }
      })
    }

    const planName = data.name || (filename ? filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') : 'Imported Plan')

    return {
      name: planName,
      routines,
      week,
      customEx,
      dropped: 0,
      routineCount: routines.length,
      exerciseCount: routines.reduce((n, r) => n + r.ex.length, 0),
      scheduledDays: Object.keys(week).length
    }
  }

  throw new Error(t('JSON must contain a “routines” array'))
}

/**
 * Universal plan loader: automatically detects JSON vs CSV and parses into an openGym bundle.
 */
export function parseAnyPlan(raw, filename = '') {
  const isJson = (filename && filename.toLowerCase().endsWith('.json')) ||
    (typeof raw === 'string' && raw.trim().startsWith('{'))
  if (isJson) {
    try {
      return parseJSONPlan(raw, filename)
    } catch (e) {
      if (typeof raw === 'string' && raw.trim().startsWith('{')) throw e
    }
  }
  return parseCSVPlan(raw, filename)
}

/* ------------------------------- templates ------------------------------- */

export const SAMPLE_CSV = `Routine,Day,Exercise,Sets,Reps,Weight
Push Day,Monday,Barbell Bench Press,4,8,60
Push Day,Monday,Barbell Incline Bench Press,3,10,50
Push Day,Monday,Dumbbell Standing Overhead Press,3,10,16
Push Day,Monday,Dumbbell Lateral Raise,3,12,8
Push Day,Monday,Cable Triceps Pushdown,3,12,25
Pull Day,Wednesday,Wide Grip Pull-Up,4,8,0
Pull Day,Wednesday,Barbell Bent Over Row,4,8,50
Pull Day,Wednesday,Cable Lat Pulldown Full Range of Motion,3,10,45
Pull Day,Wednesday,Barbell Curl,3,10,25
Pull Day,Wednesday,Dumbbell Hammer Curl,3,12,12
Leg Day,Friday,Barbell Full Squat,4,8,80
Leg Day,Friday,Barbell Romanian Deadlift,3,10,60
Leg Day,Friday,Sled 45° Leg Press,3,12,120
Leg Day,Friday,Lever Leg Extension,3,12,40
Leg Day,Friday,Lever Lying Leg Curl,3,12,35`

export const SAMPLE_JSON = {
  name: "Push / Pull / Legs",
  week: {
    "Monday": "Push Day",
    "Wednesday": "Pull Day",
    "Friday": "Leg Day"
  },
  routines: [
    {
      name: "Push Day",
      emoji: "barbell",
      exercises: [
        { name: "Barbell Bench Press", sets: 4, reps: 8, weight: 60 },
        { name: "Barbell Incline Bench Press", sets: 3, reps: 10, weight: 50 },
        { name: "Dumbbell Standing Overhead Press", sets: 3, reps: 10, weight: 16 },
        { name: "Dumbbell Lateral Raise", sets: 3, reps: 12, weight: 8 },
        { name: "Cable Triceps Pushdown", sets: 3, reps: 12, weight: 25 }
      ]
    },
    {
      name: "Pull Day",
      emoji: "pullup",
      exercises: [
        { name: "Wide Grip Pull-Up", sets: 4, reps: 8, weight: 0 },
        { name: "Barbell Bent Over Row", sets: 4, reps: 8, weight: 50 },
        { name: "Cable Lat Pulldown Full Range of Motion", sets: 3, reps: 10, weight: 45 },
        { name: "Barbell Curl", sets: 3, reps: 10, weight: 25 },
        { name: "Dumbbell Hammer Curl", sets: 3, reps: 12, weight: 12 }
      ]
    },
    {
      name: "Leg Day",
      emoji: "legs",
      exercises: [
        { name: "Barbell Full Squat", sets: 4, reps: 8, weight: 80 },
        { name: "Barbell Romanian Deadlift", sets: 3, reps: 10, weight: 60 },
        { name: "Sled 45° Leg Press", sets: 3, reps: 12, weight: 120 },
        { name: "Lever Leg Extension", sets: 3, reps: 12, weight: 40 },
        { name: "Lever Lying Leg Curl", sets: 3, reps: 12, weight: 35 }
      ]
    }
  ]
}

export function downloadSampleCSV() {
  const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'opengym_plan_template.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

export function downloadSampleJSON() {
  const blob = new Blob([JSON.stringify(SAMPLE_JSON, null, 2)], { type: 'application/json;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'opengym_plan_template.json'
  a.click()
  URL.revokeObjectURL(a.href)
}

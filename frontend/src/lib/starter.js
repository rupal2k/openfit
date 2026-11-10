// Workout plan templates & starter routines. Shared by the "Load plan" catalog
// and by the demo build, which seeds a history on top of the PPL starter routines.
import { uid } from './format.js'

// A template exercise is [id, sets, reps] or, for a timed hold, [id, sets, seconds, T].
const T = { time: true }
// [id, sets, reps, SIDE]: one leg or arm at a time; reps count both sides (24 = 12 each)
const SIDE = { side: true }
// [id, sets, 60, M(10)]: an EMOM minute, 10 reps then rest until the next beep
const M = reps => ({ time: true, reps })
export const templateEx = ([id, sets, n, o]) => (o && o.time ? { id, sets, mode: 'time', sec: n, weight: 0, ...(o.reps ? { reps: o.reps } : {}) } : { id, sets, reps: n, weight: 0, ...(o && o.side ? { side: true } : {}) })
// Where a plan is meant to be done: the catalogue filters on it.
export const PLAN_WHERE = [['gym', 'Gym'], ['home', 'Home'], ['homegym', 'Home gym'], ['intervals', 'Intervals']]

const SPEC = [
  ['Push Day', 'barbell', [['0025', 4, 8], ['0047', 3, 10], ['0426', 3, 10], ['0334', 3, 12], ['0241', 3, 12], ['0251', 3, 10]]],
  ['Pull Day', 'pullup', [['2330', 4, 10], ['0027', 4, 8], ['1323', 3, 10], ['0031', 3, 10], ['0313', 3, 12]]],
  ['Leg Day', 'legs', [['0043', 4, 8], ['0085', 3, 10], ['0739', 3, 12], ['0585', 3, 12], ['0586', 3, 12], ['0605', 4, 15]]]
]

// Fresh routine objects (new ids) — [push, pull, legs].
export const starterRoutines = () =>
  SPEC.map(([name, emoji, list]) => ({ id: uid(), name, emoji, ex: list.map(([id, sets, reps]) => ({ id, sets, reps, weight: 0 })) }))

export const PLAN_TEMPLATES = [
  {
    id: 'ppl-3',
    name: 'Push / Pull / Legs (3‑day)',
    where: 'gym',
    badge: '3 days/wk',
    daysPerWeek: 3,
    icon: 'barbell',
    desc: 'Classic 3-day split: Push (chest, shoulders, triceps), Pull (back, biceps), and Legs. Great for muscle building and recovery.',
    scheduleDays: [1, 3, 5],
    routines: [
      {
        name: 'Push Day',
        emoji: 'barbell',
        ex: [['0025', 4, 8], ['0047', 3, 10], ['0426', 3, 10], ['0334', 3, 12], ['0241', 3, 12], ['0251', 3, 10]]
      },
      {
        name: 'Pull Day',
        emoji: 'pullup',
        ex: [['2330', 4, 10], ['0027', 4, 8], ['1323', 3, 10], ['0031', 3, 10], ['0313', 3, 12]]
      },
      {
        name: 'Leg Day',
        emoji: 'legs',
        ex: [['0043', 4, 8], ['0085', 3, 10], ['0739', 3, 12], ['0585', 3, 12], ['0586', 3, 12], ['0605', 4, 15]]
      }
    ]
  },
  {
    id: 'upper-lower-4',
    name: 'Upper / Lower (4‑day)',
    where: 'gym',
    badge: '4 days/wk',
    daysPerWeek: 4,
    icon: 'figureStrength',
    desc: 'Balanced 4-day split training every muscle group twice a week. Mon Upper A, Tue Lower A, Thu Upper B, Fri Lower B.',
    scheduleDays: [1, 2, 4, 5],
    routines: [
      {
        name: 'Upper A',
        emoji: 'figureStrength',
        ex: [['0025', 4, 8], ['0027', 4, 8], ['0426', 3, 10], ['2330', 3, 10], ['0334', 3, 12], ['0031', 3, 10], ['0241', 3, 12]]
      },
      {
        name: 'Lower A',
        emoji: 'legs',
        ex: [['0043', 4, 8], ['0085', 3, 10], ['0739', 3, 12], ['0585', 3, 12], ['0586', 3, 12], ['0605', 4, 15]]
      },
      {
        name: 'Upper B',
        emoji: 'arm',
        ex: [['0047', 4, 10], ['1323', 4, 10], ['0251', 3, 10], ['1429', 3, 8], ['0334', 3, 12], ['0313', 3, 12], ['0241', 3, 12]]
      },
      {
        name: 'Lower B',
        emoji: 'legs',
        ex: [['0032', 4, 6], ['0739', 4, 10], ['0586', 3, 12], ['0585', 3, 12], ['0605', 4, 15]]
      }
    ]
  },
  {
    id: 'full-body-3',
    name: 'Full Body (3‑day)',
    where: 'gym',
    badge: '3 days/wk',
    daysPerWeek: 3,
    icon: 'dumbbell',
    desc: 'High-frequency whole body training across Mon, Wed, and Fri. Ideal for building solid foundations and busy lifestyles.',
    scheduleDays: [1, 3, 5],
    routines: [
      {
        name: 'Full Body A',
        emoji: 'figureStrength',
        ex: [['0043', 4, 8], ['0025', 4, 8], ['0027', 4, 8], ['0334', 3, 12], ['0031', 3, 10]]
      },
      {
        name: 'Full Body B',
        emoji: 'dumbbell',
        ex: [['0032', 4, 6], ['0426', 4, 8], ['2330', 4, 10], ['0739', 3, 10], ['0241', 3, 12]]
      },
      {
        name: 'Full Body C',
        emoji: 'plate',
        ex: [['0047', 4, 10], ['0085', 4, 10], ['1323', 4, 10], ['0251', 3, 10], ['0313', 3, 12]]
      }
    ]
  },
  {
    id: 'ppl-6',
    name: 'Push / Pull / Legs (6-day)',
    where: 'gym',
    badge: '6 days/wk',
    daysPerWeek: 6,
    icon: 'barbell',
    desc: 'High-frequency 6-day split repeating Push, Pull, and Legs twice a week. Mon–Sat with Sunday rest.',
    scheduleMap: { 1: 0, 2: 1, 3: 2, 4: 0, 5: 1, 6: 2 },
    routines: [
      {
        name: 'Push Day',
        emoji: 'barbell',
        ex: [['0025', 4, 8], ['0047', 3, 10], ['0426', 3, 10], ['0334', 3, 12], ['0241', 3, 12], ['0251', 3, 10]]
      },
      {
        name: 'Pull Day',
        emoji: 'pullup',
        ex: [['2330', 4, 10], ['0027', 4, 8], ['1323', 3, 10], ['0031', 3, 10], ['0313', 3, 12]]
      },
      {
        name: 'Leg Day',
        emoji: 'legs',
        ex: [['0043', 4, 8], ['0085', 3, 10], ['0739', 3, 12], ['0585', 3, 12], ['0586', 3, 12], ['0605', 4, 15]]
      }
    ]
  },
  {
    id: 'arnold-split-6',
    name: 'Arnold Split (6-day)',
    where: 'gym',
    badge: '6 days/wk',
    daysPerWeek: 6,
    icon: 'bolt',
    desc: 'Classic 6-day split pairing antagonist muscle groups: Chest & Back, Shoulders & Arms, Legs — performed twice a week.',
    scheduleMap: { 1: 0, 2: 1, 3: 2, 4: 0, 5: 1, 6: 2 },
    routines: [
      {
        name: 'Chest & Back',
        emoji: 'barbell',
        ex: [['0025', 4, 8], ['0047', 3, 10], ['0251', 3, 10], ['1429', 4, 8], ['0027', 4, 8], ['2330', 3, 10]]
      },
      {
        name: 'Shoulders & Arms',
        emoji: 'arm',
        ex: [['0426', 4, 8], ['0334', 4, 12], ['0031', 3, 10], ['0313', 3, 12], ['0241', 4, 12]]
      },
      {
        name: 'Legs & Calves',
        emoji: 'legs',
        ex: [['0043', 4, 8], ['0085', 3, 10], ['0739', 3, 12], ['0585', 3, 12], ['0586', 3, 12], ['0605', 4, 15]]
      }
    ]
  },
  // ---- home: no equipment (a chair, a towel and floor space at most) ----
  {
    id: 'home-bw-3',
    where: 'home',
    name: 'Home Bodyweight Full Body (3‑day)',
    badge: '3 days/wk',
    daysPerWeek: 3,
    icon: 'figureStrength',
    desc: 'Calisthenics strength with no equipment: squats, push-ups, lunges, towel rows and core. A chair and a towel are all you need. Make it harder by adding reps or slowing the lowering phase.',
    scheduleMap: { 1: 0, 3: 1, 5: 2 },
    routines: [
      { name: 'Bodyweight A', emoji: 'figureStrength', rest: 60,
        ex: [['1685', 3, 15], ['0662', 3, 10], ['1460', 3, 24, SIDE], ['3013', 3, 15], ['3167', 3, 12], ['3665', 3, 30, T]] },
      { name: 'Bodyweight B', emoji: 'legs', rest: 60,
        ex: [['2368', 3, 20, SIDE], ['0493', 3, 12], ['0129', 3, 12], ['3561', 3, 12], ['0276', 3, 12], ['0705', 2, 30, T]] },
      { name: 'Bodyweight C', emoji: 'abs', rest: 60,
        ex: [['3769', 3, 24, SIDE], ['0283', 3, 8], ['1373', 3, 20], ['3167', 3, 12], ['0872', 3, 15], ['0630', 3, 40, T]] }
    ]
  },
  {
    id: 'home-hiit-3',
    where: 'home',
    name: 'Home HIIT Circuit (3‑day)',
    badge: '~25 min',
    daysPerWeek: 3,
    icon: 'flame',
    desc: 'Metabolic circuits with no equipment. Do every move for 40 s back to back, rest 60 s after the round, 4 rounds. Builds stamina and burns a lot in little time.',
    scheduleMap: { 2: 0, 4: 1, 6: 0 },
    routines: [
      { name: 'HIIT Circuit A', emoji: 'flame', rest: 60, circuit: true,
        ex: [['3223', 4, 40, T], ['0514', 4, 40, T], ['0630', 4, 40, T], ['0662', 4, 40, T], ['3361', 4, 40, T], ['1160', 4, 40, T]] },
      { name: 'HIIT Circuit B', emoji: 'bolt', rest: 60, circuit: true,
        ex: [['0685', 4, 40, T], ['3582', 4, 40, T], ['3239', 4, 40, T], ['3220', 4, 40, T], ['0464', 4, 40, T], ['0687', 4, 40, T]] }
    ]
  },
  {
    id: 'home-mobility',
    where: 'home',
    name: 'Mobility & Core (any day)',
    badge: '~15 min',
    daysPerWeek: 0,
    icon: 'stretch',
    desc: 'Yoga and Pilates style holds for hips, spine, hamstrings and shoulders, plus core control. Short rests. Good on rest days or after a session. Doesn’t change your weekly schedule.',
    routines: [
      { name: 'Mobility & Core', emoji: 'stretch', rest: 15,
        ex: [['1604', 2, 45, T], ['1366', 2, 30, T], ['1346', 2, 30, T], ['1494', 2, 45, T], ['1511', 2, 30, T], ['1424', 2, 30, T], ['1363', 2, 30, T], ['0276', 2, 10], ['0705', 2, 30, T]] }
    ]
  },
  // ---- home gym: dumbbells and a bench, or a kettlebell and bands ----
  {
    id: 'homegym-db-3',
    where: 'homegym',
    name: 'Home Gym: Dumbbell Full Body (3‑day)',
    badge: '3 days/wk',
    daysPerWeek: 3,
    icon: 'dumbbell',
    desc: 'Muscle building with a pair of dumbbells and a flat or incline bench. 3–4 sets of 8–12 reps. Alternates A and B through the week.',
    scheduleMap: { 1: 0, 3: 1, 5: 0 },
    routines: [
      { name: 'Dumbbell A', emoji: 'dumbbell', rest: 90,
        ex: [['1760', 4, 10], ['0289', 4, 8], ['0293', 4, 10], ['0405', 3, 10], ['1459', 3, 10], ['0294', 3, 12]] },
      { name: 'Dumbbell B', emoji: 'figureStrength', rest: 90,
        ex: [['0381', 3, 20, SIDE], ['0314', 3, 10], ['1330', 3, 20, SIDE], ['0334', 3, 12], ['0431', 3, 20, SIDE], ['0333', 3, 12], ['3665', 3, 40, T]] }
    ]
  },
  {
    id: 'homegym-kb-band-3',
    where: 'homegym',
    name: 'Kettlebell & Band Conditioning (3‑day)',
    badge: '3 days/wk',
    daysPerWeek: 3,
    icon: 'kettlebell',
    desc: 'Functional strength and conditioning with one kettlebell and a resistance band: swings, goblet squats, thrusters, presses and rows. Shorter rests keep the heart rate up.',
    scheduleMap: { 1: 0, 3: 0, 5: 0 },
    routines: [
      { name: 'Kettlebell & Band', emoji: 'kettlebell', rest: 60,
        ex: [['0549', 4, 15], ['0534', 3, 12], ['0541', 3, 20, SIDE], ['0997', 3, 12], ['1022', 3, 15], ['1009', 3, 12], ['0550', 3, 10]] }
    ]
  },
  // ---- interval formats: the timer runs Tabata and EMOM; AMRAP has one clock for the block ----
  {
    id: 'tabata-express',
    where: 'intervals',
    name: 'Tabata Express',
    badge: 'Tabata',
    daysPerWeek: 0,
    icon: 'bolt',
    desc: 'Four 4-minute Tabata blocks with no equipment: 20 s all-out, 10 s rest, 8 intervals alternating two moves. Start the first interval and the timer runs the block. Take a minute between blocks. About 20 min. Doesn’t change your weekly schedule.',
    routines: [
      { name: 'Tabata Express', emoji: 'bolt', rest: 10, format: 'tabata', circuit: 2,
        ex: [['0514', 4, 20, T], ['0662', 4, 20, T], ['0630', 4, 20, T], ['3582', 4, 20, T],
          ['3223', 4, 20, T], ['3665', 4, 20, T], ['3361', 4, 20, T], ['0687', 4, 20, T]] }
    ]
  },
  {
    id: 'emom-20',
    where: 'intervals',
    name: 'EMOM 20',
    badge: 'EMOM',
    daysPerWeek: 0,
    icon: 'timer',
    desc: 'Every minute on the minute for 20 minutes, no equipment: push-ups, squats, reverse crunches and burpees in turn, 5 rounds. Do the reps when the minute starts and rest until the beep. Too easy? Add reps. Doesn’t change your weekly schedule.',
    routines: [
      { name: 'EMOM 20', emoji: 'timer', format: 'emom', circuit: true,
        ex: [['0662', 5, 60, M(10)], ['1685', 5, 60, M(15)], ['0872', 5, 60, M(12)], ['1160', 5, 60, M(8)]] }
    ]
  },
  {
    id: 'amrap-15',
    where: 'intervals',
    name: 'AMRAP 15',
    badge: 'AMRAP',
    daysPerWeek: 0,
    icon: 'flame',
    desc: 'As many rounds as you can in 15 minutes, no equipment: 10 push-ups, 15 squats, 20 walking lunges and 15 reverse crunches. Start the clock, tick each set as you finish it, and beat your round count next time. Doesn’t change your weekly schedule.',
    routines: [
      { name: 'AMRAP 15', emoji: 'flame', format: 'amrap', cap: 900, circuit: true,
        ex: [['0662', 10, 10], ['1685', 10, 15], ['1460', 10, 20, SIDE], ['0872', 10, 15]] }
    ]
  },
  {
    id: 'kb-emom-16',
    where: 'intervals',
    name: 'Kettlebell EMOM 16',
    badge: 'EMOM',
    daysPerWeek: 0,
    icon: 'kettlebell',
    desc: 'One kettlebell, 16 minutes: 15 swings on odd minutes, 10 goblet squats on even minutes. Rest whatever is left of each minute. Doesn’t change your weekly schedule.',
    routines: [
      { name: 'Kettlebell EMOM 16', emoji: 'kettlebell', format: 'emom', circuit: true,
        ex: [['0549', 8, 60, M(15)], ['0534', 8, 60, M(10)]] }
    ]
  }
]

function groupEx(r) {
  const n = r.circuit === true ? r.ex.length : r.circuit > 1 ? r.circuit : 1
  let sg = null
  return r.ex.map((x, i) => {
    if (i % n === 0) sg = n > 1 ? 'sg' + uid() : null
    return { ...templateEx(x), ...(sg ? { sg } : {}) }
  })
}

export function instantiatePlan(template) {
  const createdRoutines = template.routines.map(r => ({
    id: uid(),
    name: r.name,
    emoji: r.emoji,
    ...(r.rest ? { rest: r.rest } : {}),
    ...(r.format ? { format: r.format } : {}),
    ...(r.cap ? { cap: r.cap } : {}),
    // circuit: true links the whole routine into one block; a number links that many at a time
    ex: groupEx(r)
  }))

  const weekAssignments = {}
  if (template.scheduleMap) {
    Object.entries(template.scheduleMap).forEach(([day, rIndex]) => {
      if (createdRoutines[rIndex]) {
        weekAssignments[day] = createdRoutines[rIndex].id
      }
    })
  } else if (template.scheduleDays) {
    template.scheduleDays.forEach((day, index) => {
      if (createdRoutines[index]) {
        weekAssignments[day] = createdRoutines[index].id
      }
    })
  }

  return { routines: createdRoutines, week: weekAssignments }
}

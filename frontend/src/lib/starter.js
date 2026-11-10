// Workout plan templates & starter routines. Shared by the "Load plan" catalog
// and by the demo build, which seeds a history on top of the PPL starter routines.
import { uid } from './format.js'

// A template exercise is [id, sets, reps] or, for a timed hold, [id, sets, seconds, T].
const T = { time: true }
export const templateEx = ([id, sets, n, o]) => (o && o.time ? { id, sets, mode: 'time', sec: n, weight: 0 } : { id, sets, reps: n, weight: 0 })
// Where a plan is meant to be done: the catalogue filters on it.
export const PLAN_WHERE = [['gym', 'Gym'], ['home', 'Home'], ['homegym', 'Home gym']]

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
        ex: [['1685', 3, 15], ['0662', 3, 10], ['1460', 3, 12], ['3013', 3, 15], ['3167', 3, 12], ['3665', 3, 30, T]] },
      { name: 'Bodyweight B', emoji: 'legs', rest: 60,
        ex: [['2368', 3, 10], ['0493', 3, 12], ['0129', 3, 12], ['3561', 3, 12], ['0276', 3, 12], ['0705', 2, 30, T]] },
      { name: 'Bodyweight C', emoji: 'abs', rest: 60,
        ex: [['3769', 3, 12], ['0283', 3, 8], ['1373', 3, 20], ['3167', 3, 12], ['0872', 3, 15], ['0630', 3, 40, T]] }
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
        ex: [['0381', 3, 10], ['0314', 3, 10], ['1330', 3, 10], ['0334', 3, 12], ['0431', 3, 10], ['0333', 3, 12], ['3665', 3, 40, T]] }
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
        ex: [['0549', 4, 15], ['0534', 3, 12], ['0541', 3, 10], ['0997', 3, 12], ['1022', 3, 15], ['1009', 3, 12], ['0550', 3, 10]] }
    ]
  }
]

export function instantiatePlan(template) {
  const createdRoutines = template.routines.map(r => ({
    id: uid(),
    name: r.name,
    emoji: r.emoji,
    ...(r.rest ? { rest: r.rest } : {}),
    // a circuit is one superset over the whole routine: rest comes after the round
    ex: (sg => r.ex.map(x => ({ ...templateEx(x), ...(sg ? { sg } : {}) })))(r.circuit ? 'sg' + uid() : null)
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

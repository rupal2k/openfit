// Workout plan templates & starter routines. Shared by the "Load plan" catalog
// and by the demo build, which seeds a history on top of the PPL starter routines.
import { uid } from './format.js'

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
    name: 'Push / Pull / Legs (3-day)',
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
    name: 'Upper / Lower (4-day)',
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
    name: 'Full Body (3-day)',
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
  }
]

export function instantiatePlan(template) {
  const createdRoutines = template.routines.map(r => ({
    id: uid(),
    name: r.name,
    emoji: r.emoji,
    ex: r.ex.map(([id, sets, reps]) => ({ id, sets, reps, weight: 0 }))
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

// Regression tests for the 2026-11-05 Labs audit (labs-audit/AUDIT.md). Each input is the example
// that saved a wrong value before the fix.
import { describe, it, expect } from 'vitest'
import { parseLabText } from './parse.js'
import { toCanonical } from './units.js'
import { reviewRows } from './reports.js'

const row = (s, o) => parseLabText(s, o).rows[0]

describe('1 · real extremes stay as printed on a digital report', () => {
  it('keeps glucose 900 and ferritin 15000', () => {
    expect(row('Glucose\t900\tmg/dL\t74 - 100')).toMatchObject({ value: 900, lo: 74, hi: 100 })
    expect(row('Ferritin\t15000\tng/mL\t30 - 400').value).toBe(15000)
    expect(row('Glucose\t900\tmg/dL\t74 - 100').fixed).toBeUndefined()
  })
  it('OCR repairs are never saved unless the person ticks them', () => {
    const [r] = reviewRows(parseLabText('MCHC\t333\tg/dL\t32-36', { ocr: true }).rows)
    expect(r).toMatchObject({ value: 33.3, fixed: true, include: false })
  })
})

describe('2 · thousands separators', () => {
  it('reads 1,050 / 1,250 / 1,234.5 / 2,50,000 as whole numbers', () => {
    expect(row('Vitamin B12\t1,050\tpg/mL\t197 - 771').value).toBe(1050)
    expect(row('LDH\t1,250\tU/L\t135 - 225').value).toBe(1250)
    expect(row('Ferritin\t1,234.5\tng/mL').value).toBe(1234.5)
    expect(row('Platelet Count\t2,50,000\t/cumm\t1,50,000 - 4,50,000')).toMatchObject({ value: 250000, lo: 150000, hi: 450000 })
  })
  it('still reads decimal commas', () => {
    expect(row('Kreatinin\t0,94\tmg/dL\t0,7 - 1,2')).toMatchObject({ value: 0.94, lo: 0.7, hi: 1.2 })
    expect(row('Glukose\t5,4\tmmol/L').value).toBe(5.4)
  })
})

describe('3 · a different test is not mapped to a lookalike marker', () => {
  const key = s => row(s).key
  it('maps the real names', () => {
    expect(key('Hb A1c\t6.1\t%\t4 - 5.6')).toBe('diabetes.hba1c')
    expect(key('Glycosylated Haemoglobin (HbA1c)\t6.1\t%')).toBe('diabetes.hba1c')
    expect(key('Cholesterol, HDL\t52\tmg/dL')).toBe('lipids.hdl')
    expect(key('Cholesterol, LDL\t120\tmg/dL')).toBe('lipids.ldl')
    expect(key('LDL Cholesterol (Direct)\t120\tmg/dL')).toBe('lipids.ldl')
    expect(key('AST (SGOT)\t31\tU/L')).toBe('biochemistry.ast')
    expect(key('TSH (Ultrasensitive)\t2.1\tuIU/mL')).toBe('thyroid.tsh')
  })
  it('leaves other tests unmatched', () => {
    for (const s of ['Glucose PP\t180\tmg/dL', 'Glucose Random\t140\tmg/dL', 'Cholesterol/HDL Ratio\t4.6', 'TG/HDL Ratio\t2.3',
      'Bilirubin Direct\t0.2\tmg/dL', 'Calcium, Ionized\t1.2\tmmol/L', 'RDW-SD\t42\tfL', 'RBC Folate\t400\tng/mL']) {
      expect(key(s), s).toBe(null)
    }
  })
})

describe('4 · single-space rows whose name ends in a digit', () => {
  it('keeps the result, not the range', () => {
    expect(row('Free T4 15.2 pmol/L 12 - 22')).toMatchObject({ key: 'thyroid.ft4', value: 15.2, unit: 'pmol/L', lo: 12, hi: 22 })
    expect(row('Apo A1 1.45 g/L 1.0 - 1.6')).toMatchObject({ key: 'lipids.apoAI', value: 1.45, lo: 1, hi: 1.6 })
    expect(row('Vitamin B12 450 pg/mL 197 - 771')).toMatchObject({ key: 'vitamins.vitaminB12', value: 450 })
  })
})

describe('5 · urea and BUN in mg/dL', () => {
  it('converts each with its own factor', () => {
    const urea = row('Blood Urea\t30\tmg/dL\t15 - 45'), bun = row('BUN\t14\tmg/dL\t7 - 20')
    expect(toCanonical(urea.key, urea.value, urea.unit, urea.basis).v).toBeCloseTo(4.995, 2)
    expect(toCanonical(bun.key, bun.value, bun.unit, bun.basis).v).toBeCloseTo(4.998, 2)
  })
})

describe('6 · units are never swapped for another', () => {
  it('leaves an unconvertible unit for the person instead of renaming it', () => {
    const lpa = row('Lipoprotein(a)\t45\tmg/dL')
    expect(lpa.unit).toBe('mg/dL')
    expect(toCanonical(lpa.key, lpa.value, lpa.unit).ok).toBe(false)
  })
  it('knows testosterone in ng/mL, Hb in mmol/L and two-charge mEq/L', () => {
    expect(toCanonical('hormones.testosterone', 5.5, 'ng/mL').v).toBeCloseTo(19.09, 1)
    expect(toCanonical('hematology.hemoglobin', 8.9, 'mmol/L').v).toBeCloseTo(143.4, 0)
    expect(toCanonical('electrolytes.magnesium', 1.8, 'mEq/L').v).toBeCloseTo(0.9, 6)
    expect(toCanonical('electrolytes.sodium', 139, 'mEq/L').v).toBe(139)
  })
})

describe('7 · leading zeros on a digital report are real', () => {
  it('reads "02 %" as 2 %', () => {
    expect(row('Eosinophils\t02\t%\t01 - 06')).toMatchObject({ value: 2, lo: 1, hi: 6 })
  })
})

describe('9 · Indian blood count units and names', () => {
  it('reads /cumm, lakhs/cumm, mill/cumm, gm% and mg%', () => {
    const tlc = row('Total Leucocyte Count\t7,800\t/cumm\t4000 - 11000')
    expect(toCanonical(tlc.key, tlc.value, tlc.unit).v).toBeCloseTo(7.8, 6)
    const plt = row('Platelet Count\t2.5\tlakhs/cumm\t1.5 - 4.5')
    expect(toCanonical(plt.key, plt.value, plt.unit).v).toBeCloseTo(250, 6)
    const rbc = row('RBC Count\t4.8\tmill/cumm\t4.5 - 5.5')
    expect(toCanonical(rbc.key, rbc.value, rbc.unit).v).toBeCloseTo(4.8, 6)
    expect(toCanonical('hematology.hemoglobin', 13.2, 'gm%').v).toBeCloseTo(132, 6)
    expect(toCanonical('biochemistry.glucose', 99, 'mg%').ok).toBe(true)
  })
  it('matches the usual Indian names', () => {
    expect(row('S. Creatinine\t0.9\tmg/dL').key).toBe('biochemistry.creatinine')
    expect(row('Blood Sugar Fasting\t92\tmg/dL').key).toBe('biochemistry.glucose')
    expect(row('Haemoglobin\t13.2\tgm%').key).toBe('hematology.hemoglobin')
  })
})

describe('10 · a value and its range are never scaled apart', () => {
  it('a normal count in /cumm reads as in range', () => {
    const r = row('TLC\t7,800\t/cumm\t4000-11000')
    expect(r).toMatchObject({ value: 7800, lo: 4000, hi: 11000 })
    expect(r.fixed).toBeUndefined()
  })
})

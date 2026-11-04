// Blood markers OPENFIT can read from a lab report.
// Keys, canonical (SI) units and unit factors follow getbased's marker schema and UNIT_CONVERSIONS
// (github.com/elkimek/get-based, AGPL-3.0-or-later; see NOTICE.md). Aliases are OPENFIT's own.
//
// unit:  canonical unit; every stored value is in it.
// alt:   other units a report may use: reported = canonical × f (+ o). us: 1 marks the unit US
//        labs print, shown when the person picks US units (US labs keep hs-CRP in mg/L, insulin in µIU/mL).
// pct:   key to use instead when the row's unit is % (absolute count vs percentage).

const m = (cat, name, unit, aliases, alt = [], extra = {}) => ({ cat, name, unit, aliases, alt, ...extra })

export const CATEGORIES = {
  hematology: 'Blood count', differential: 'White cell differential', biochemistry: 'Chemistry',
  electrolytes: 'Electrolytes', proteins: 'Proteins and inflammation', lipids: 'Lipids', iron: 'Iron',
  thyroid: 'Thyroid', vitamins: 'Vitamins', diabetes: 'Blood sugar', hormones: 'Hormones', fattyAcids: 'Fatty acids'
}

export const MARKERS = {
  'hematology.wbc': m('hematology', 'White blood cells', '10^9/L', ['wbc', 'white blood cells', 'white blood cell count', 'leukocytes', 'total leucocyte count', 'tlc', 'total wbc count']),
  'hematology.rbc': m('hematology', 'Red blood cells', '10^12/L', ['rbc', 'red blood cells', 'red blood cell count', 'erythrocytes', 'rbc count']),
  'hematology.hemoglobin': m('hematology', 'Hemoglobin', 'g/L', ['hemoglobin', 'haemoglobin', 'hgb', 'hb'], [{ unit: 'g/dL', f: 0.1, us: 1 }]),
  'hematology.hematocrit': m('hematology', 'Hematocrit', '%', ['hematocrit', 'haematocrit', 'hct', 'packed cell volume', 'pcv']),
  'hematology.mcv': m('hematology', 'MCV', 'fL', ['mcv', 'mean corpuscular volume', 'mean cell volume']),
  'hematology.mch': m('hematology', 'MCH', 'pg', ['mch', 'mean corpuscular hemoglobin', 'mean cell hemoglobin']),
  'hematology.mchc': m('hematology', 'MCHC', 'g/L', ['mchc', 'mean corpuscular hemoglobin concentration'], [{ unit: 'g/dL', f: 0.1, us: 1 }]),
  'hematology.rdwcv': m('hematology', 'RDW-CV', '%', ['rdw cv', 'rdw', 'red cell distribution width']),
  'hematology.platelets': m('hematology', 'Platelets', '10^9/L', ['platelets', 'platelet count', 'plt', 'thrombocytes']),
  'hematology.mpv': m('hematology', 'MPV', 'fL', ['mpv', 'mean platelet volume']),
  'hematology.pdw': m('hematology', 'PDW', 'fL', ['pdw', 'platelet distribution width']),
  'hematology.pct': m('hematology', 'Plateletcrit', '%', ['plateletcrit', 'pct', 'thrombocrit']),

  'differential.neutrophils': m('differential', 'Neutrophils', '10^9/L', ['neutrophils absolute', 'absolute neutrophil count', 'anc', 'neutrophils', 'neutrophil'], [], { pct: 'differential.neutrophilsPct' }),
  'differential.lymphocytes': m('differential', 'Lymphocytes', '10^9/L', ['lymphocytes absolute', 'absolute lymphocyte count', 'alc', 'lymphocytes', 'lymphocyte'], [], { pct: 'differential.lymphocytesPct' }),
  'differential.monocytes': m('differential', 'Monocytes', '10^9/L', ['monocytes absolute', 'absolute monocyte count', 'monocytes', 'monocyte'], [], { pct: 'differential.monocytesPct' }),
  'differential.eosinophils': m('differential', 'Eosinophils', '10^9/L', ['eosinophils absolute', 'absolute eosinophil count', 'aec', 'eosinophils', 'eosinophil'], [], { pct: 'differential.eosinophilsPct' }),
  'differential.basophils': m('differential', 'Basophils', '10^9/L', ['basophils absolute', 'absolute basophil count', 'basophils', 'basophil'], [], { pct: 'differential.basophilsPct' }),
  'differential.neutrophilsPct': m('differential', 'Neutrophils %', '%', ['neutrophils %', 'neutrophils percent']),
  'differential.lymphocytesPct': m('differential', 'Lymphocytes %', '%', ['lymphocytes %', 'lymphocytes percent']),
  'differential.monocytesPct': m('differential', 'Monocytes %', '%', ['monocytes %', 'monocytes percent']),
  'differential.eosinophilsPct': m('differential', 'Eosinophils %', '%', ['eosinophils %', 'eosinophils percent']),
  'differential.basophilsPct': m('differential', 'Basophils %', '%', ['basophils %', 'basophils percent']),

  'biochemistry.glucose': m('biochemistry', 'Glucose', 'mmol/L', ['fasting glucose', 'glucose fasting', 'fasting blood sugar', 'fbs', 'fasting plasma glucose', 'fpg', 'blood glucose', 'plasma glucose', 'glucose'], [{ unit: 'mg/dL', f: 18.018, us: 1 }]),
  'biochemistry.urea': m('biochemistry', 'Urea / BUN', 'mmol/L', ['bun', 'blood urea nitrogen', 'urea nitrogen', 'urea'], [{ unit: 'mg/dL', f: 2.801, us: 1 }]),
  'biochemistry.creatinine': m('biochemistry', 'Creatinine', 'µmol/L', ['creatinine', 'serum creatinine'], [{ unit: 'mg/dL', f: 0.01131, us: 1 }]),
  'biochemistry.egfr': m('biochemistry', 'eGFR', 'mL/min/1.73m²', ['egfr', 'estimated gfr', 'gfr estimated']),
  'biochemistry.uricAcid': m('biochemistry', 'Uric acid', 'µmol/L', ['uric acid', 'urate'], [{ unit: 'mg/dL', f: 0.01681, us: 1 }]),
  'biochemistry.bilirubinTotal': m('biochemistry', 'Bilirubin, total', 'µmol/L', ['bilirubin total', 'total bilirubin', 'bilirubin'], [{ unit: 'mg/dL', f: 0.05848, us: 1 }]),
  'biochemistry.ast': m('biochemistry', 'AST', 'U/L', ['ast', 'sgot', 'aspartate aminotransferase', 'aspartate transaminase'], [{ unit: 'µkat/L', f: 1 / 60 }]),
  'biochemistry.alt': m('biochemistry', 'ALT', 'U/L', ['alt', 'sgpt', 'alanine aminotransferase', 'alanine transaminase'], [{ unit: 'µkat/L', f: 1 / 60 }]),
  'biochemistry.alp': m('biochemistry', 'Alkaline phosphatase', 'U/L', ['alkaline phosphatase', 'alp', 'alk phos'], [{ unit: 'µkat/L', f: 1 / 60 }]),
  'biochemistry.ggt': m('biochemistry', 'GGT', 'U/L', ['ggt', 'gamma gt', 'gamma glutamyl transferase', 'ggtp'], [{ unit: 'µkat/L', f: 1 / 60 }]),
  'biochemistry.ldh': m('biochemistry', 'LDH', 'U/L', ['ldh', 'lactate dehydrogenase'], [{ unit: 'µkat/L', f: 1 / 60 }]),
  'biochemistry.homocysteine': m('biochemistry', 'Homocysteine', 'µmol/L', ['homocysteine', 'total homocysteine']),

  'electrolytes.sodium': m('electrolytes', 'Sodium', 'mmol/L', ['sodium', 'na']),
  'electrolytes.potassium': m('electrolytes', 'Potassium', 'mmol/L', ['potassium', 'k']),
  'electrolytes.chloride': m('electrolytes', 'Chloride', 'mmol/L', ['chloride', 'cl']),
  'electrolytes.calciumTotal': m('electrolytes', 'Calcium', 'mmol/L', ['calcium total', 'total calcium', 'calcium'], [{ unit: 'mg/dL', f: 4.008, us: 1 }]),
  'electrolytes.phosphorus': m('electrolytes', 'Phosphorus', 'mmol/L', ['phosphorus', 'phosphate', 'inorganic phosphorus'], [{ unit: 'mg/dL', f: 3.097, us: 1 }]),
  'electrolytes.magnesium': m('electrolytes', 'Magnesium', 'mmol/L', ['magnesium', 'mg'], [{ unit: 'mg/dL', f: 2.431, us: 1 }]),

  'proteins.totalProtein': m('proteins', 'Total protein', 'g/L', ['total protein', 'protein total'], [{ unit: 'g/dL', f: 0.1, us: 1 }]),
  'proteins.albumin': m('proteins', 'Albumin', 'g/L', ['albumin', 'serum albumin'], [{ unit: 'g/dL', f: 0.1, us: 1 }]),
  'proteins.hsCRP': m('proteins', 'hs-CRP', 'mg/L', ['high sensitivity crp', 'hs crp', 'hscrp', 'high sensitivity c reactive protein', 'crp high sensitivity'], [{ unit: 'mg/dL', f: 0.1 }]),
  'proteins.crp': m('proteins', 'CRP', 'mg/L', ['c reactive protein', 'crp'], [{ unit: 'mg/dL', f: 0.1 }]),

  'lipids.cholesterol': m('lipids', 'Total cholesterol', 'mmol/L', ['cholesterol total', 'total cholesterol', 'cholesterol', 'serum cholesterol'], [{ unit: 'mg/dL', f: 38.67, us: 1 }]),
  'lipids.triglycerides': m('lipids', 'Triglycerides', 'mmol/L', ['triglycerides', 'triglyceride', 'tg'], [{ unit: 'mg/dL', f: 88.57, us: 1 }]),
  'lipids.hdl': m('lipids', 'HDL cholesterol', 'mmol/L', ['hdl cholesterol', 'hdl c', 'hdl'], [{ unit: 'mg/dL', f: 38.67, us: 1 }]),
  'lipids.ldl': m('lipids', 'LDL cholesterol', 'mmol/L', ['ldl cholesterol', 'ldl c', 'ldl'], [{ unit: 'mg/dL', f: 38.67, us: 1 }]),
  'lipids.nonHdl': m('lipids', 'Non-HDL cholesterol', 'mmol/L', ['non hdl cholesterol', 'non hdl'], [{ unit: 'mg/dL', f: 38.67, us: 1 }]),
  'lipids.apoAI': m('lipids', 'Apo A-I', 'g/L', ['apolipoprotein a i', 'apolipoprotein a1', 'apo a i', 'apo a1', 'apoa1'], [{ unit: 'mg/dL', f: 100, us: 1 }]),
  'lipids.apoB': m('lipids', 'Apo B', 'g/L', ['apolipoprotein b', 'apo b', 'apob'], [{ unit: 'mg/dL', f: 100, us: 1 }]),
  'lipids.lpA': m('lipids', 'Lp(a)', 'nmol/L', ['lipoprotein a', 'lp a', 'lpa']),

  'iron.iron': m('iron', 'Iron', 'µmol/L', ['iron', 'serum iron'], [{ unit: 'µg/dL', f: 5.585, us: 1 }]),
  'iron.ferritin': m('iron', 'Ferritin', 'µg/L', ['ferritin', 'serum ferritin'], [{ unit: 'ng/mL', f: 1, us: 1 }]),
  'iron.transferrin': m('iron', 'Transferrin', 'g/L', ['transferrin'], [{ unit: 'mg/dL', f: 100, us: 1 }]),
  'iron.tibc': m('iron', 'TIBC', 'µmol/L', ['tibc', 'total iron binding capacity'], [{ unit: 'µg/dL', f: 5.585, us: 1 }]),
  'iron.transferrinSat': m('iron', 'Transferrin saturation', '%', ['transferrin saturation', 'tsat', 'iron saturation']),

  'thyroid.tsh': m('thyroid', 'TSH', 'mIU/L', ['tsh', 'thyroid stimulating hormone', 'thyrotropin']),
  'thyroid.ft4': m('thyroid', 'Free T4', 'pmol/L', ['free t4', 'ft4', 'free thyroxine'], [{ unit: 'ng/dL', f: 0.07769, us: 1 }]),
  'thyroid.ft3': m('thyroid', 'Free T3', 'pmol/L', ['free t3', 'ft3', 'free triiodothyronine'], [{ unit: 'pg/mL', f: 0.6513, us: 1 }]),
  'thyroid.tpoAb': m('thyroid', 'TPO antibodies', 'kU/L', ['tpo antibodies', 'anti tpo', 'thyroid peroxidase antibodies', 'tpo ab']),
  'thyroid.tgAb': m('thyroid', 'Thyroglobulin antibodies', 'kU/L', ['thyroglobulin antibodies', 'anti tg', 'tg ab']),

  'vitamins.vitaminD': m('vitamins', 'Vitamin D (25-OH)', 'nmol/L', ['vitamin d 25 hydroxy', '25 hydroxy vitamin d', '25 oh vitamin d', 'vitamin d', '25 oh d'], [{ unit: 'ng/mL', f: 0.4006, us: 1 }]),
  'vitamins.vitaminB12': m('vitamins', 'Vitamin B12', 'pmol/L', ['vitamin b12', 'b12', 'cobalamin', 'cyanocobalamin'], [{ unit: 'pg/mL', f: 1.355, us: 1 }]),
  'vitamins.folate': m('vitamins', 'Folate', 'nmol/L', ['folate', 'folic acid', 'serum folate'], [{ unit: 'ng/mL', f: 0.4413, us: 1 }]),

  // mmol/mol (IFCC) ↔ % (NGSP): mmol/mol = 10.929 × (% − 2.15)
  'diabetes.hba1c': m('diabetes', 'HbA1c', '%', ['hemoglobin a1c', 'haemoglobin a1c', 'hemoglobin alc', 'hba1c', 'hbalc', 'glycated hemoglobin', 'glycosylated hemoglobin', 'a1c'], [{ unit: 'mmol/mol', f: 10.929, o: -23.497 }]),
  'diabetes.insulin': m('diabetes', 'Insulin (fasting)', 'µIU/mL', ['fasting insulin', 'insulin fasting', 'insulin'], [{ unit: 'pmol/L', f: 6 }]),
  'diabetes.cPeptide': m('diabetes', 'C-peptide', 'ng/mL', ['c peptide'], [{ unit: 'nmol/L', f: 0.331 }]),
  'diabetes.fructosamine': m('diabetes', 'Fructosamine', 'µmol/L', ['fructosamine']),
  'diabetes.homaIR': m('diabetes', 'HOMA-IR (from report)', '', ['homa ir']),

  'hormones.testosterone': m('hormones', 'Testosterone', 'nmol/L', ['total testosterone', 'testosterone total', 'testosterone'], [{ unit: 'ng/dL', f: 28.818, us: 1 }]),
  'hormones.shbg': m('hormones', 'SHBG', 'nmol/L', ['shbg', 'sex hormone binding globulin']),
  'hormones.estradiol': m('hormones', 'Estradiol', 'pmol/L', ['estradiol', 'oestradiol', 'e2'], [{ unit: 'pg/mL', f: 0.2724, us: 1 }]),

  'fattyAcids.omega3Index': m('fattyAcids', 'Omega-3 Index', '%', ['omega 3 index', 'omega3 index'])
}

// Lower-case words only: "Bilirubin, Total" and "bilirubin total" compare equal.
export const norm = s => String(s).toLowerCase().replace(/µ|μ/g, 'u').replace(/%/g, ' % ')
  .replace(/[^a-z0-9%]+/g, ' ').trim()

const ALIASES = Object.entries(MARKERS)
  .flatMap(([key, d]) => d.aliases.map(a => [norm(a), key]))
  .sort((a, b) => b[0].length - a[0].length)   // longest first: "hemoglobin a1c" before "hemoglobin"

// The marker a report row starts with, and the text after its name.
export function findMarker(name) {
  const n = norm(name)
  for (const [a, key] of ALIASES) {
    if (n === a || n.startsWith(a + ' ')) return { key, rest: n.slice(a.length).trim() }
  }
  return null
}

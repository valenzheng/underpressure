// scenarios.js — All scenario data for Patient 1 & 2, patient charts

// Scenarios
const scenarios = [
  {
    prompt: "What is the FIRST priority intervention?",
    options: [
      { text: "A. Start a full head-to-toe assessment", correct: false, pulseChange: +10 },
      { text: "B. Call for imaging (CT abdomen)", correct: false, pulseChange: +12 },
      { text: "C. Begin rapid IV fluid resuscitation", correct: true, pulseChange: -8 },
      { text: "D. Ask the patient for their medical history", correct: false, pulseChange: +10 },
    ],
    correctFeedback:
      "Correct! Signs of hypovolemic shock require immediate fluid resuscitation to maintain circulation.",
    incorrectFeedback:
      "Incorrect. Shock requires immediate fluid resuscitation, not delayed assessment or imaging. Pulse will drop faster.",
    rationale: "In hypovolemic shock, circulating volume must be restored immediately. Assessment and imaging are secondary until hemodynamic stability is achieved.",
    bpChange: { systolic: 0, diastolic: 0 },
  },
  {
    prompt: "What is most likely happening internally?",
    options: [
      { text: "A. Pneumothorax", correct: false, pulseChange: +15 },
      { text: "B. Internal hemorrhage", correct: true, pulseChange: -10 },
      { text: "C. Cardiac tamponade", correct: false, pulseChange: +15 },
      { text: "D. Anxiety-induced hyperventilation", correct: false, pulseChange: +12 },
    ],
    correctFeedback:
      "Correct! Abdominal rigidity, trauma mechanism and shock vitals strongly indicate internal bleeding.",
    incorrectFeedback:
      "Incorrect. Abdominal trauma with rigid abdomen suggests internal hemorrhage. Heart rate will drop faster over time.",
    rationale: "Blunt abdominal trauma with a rigid abdomen, tachycardia, and hypotension is internal hemorrhage until proven otherwise. Pneumothorax would present with breath sounds changes, not abdominal rigidity.",
    bpChange: { systolic: -2, diastolic: -1 },
  },
  {
    prompt: "Which type of shock best fits this presentation?",
    options: [
      { text: "A. Hypovolemic shock", correct: true, pulseChange: -7 },
      { text: "B. Cardiogenic shock", correct: false, pulseChange: +10 },
      { text: "C. Septic shock", correct: false, pulseChange: +10 },
      { text: "D. Neurogenic shock", correct: false, pulseChange: +10 },
    ],
    correctFeedback:
      "Correct! Blood loss causes low blood pressure, rapid pulse and poor tissue perfusion.",
    incorrectFeedback:
      "Incorrect. This is hypovolemic shock from blood loss. BP will decrease more rapidly.",
    rationale: "Hypovolemic shock hallmarks: tachycardia, hypotension, pale/clammy skin, trauma mechanism. Septic shock would show fever/warmth; cardiogenic would show pulmonary edema; neurogenic shows bradycardia.",
    bpChange: { systolic: -3, diastolic: -2 },
  },
  {
    prompt: "Which assessment framework should guide care RIGHT NOW?",
    options: [
      { text: "A. Head-to-toe assessment", correct: false, pulseChange: +8 },
      { text: "B. ABCs / Primary survey", correct: true, pulseChange: -6 },
      { text: "C. Pain assessment", correct: false, pulseChange: +8 },
      { text: "D. Secondary survey", correct: false, pulseChange: +8 },
    ],
    correctFeedback:
      "Correct! Life-threatening problems must be addressed before secondary assessments.",
    incorrectFeedback:
      "Incorrect. Primary survey (ABCs) takes priority in unstable patients. Heart rate will decline gradually.",
    rationale: "ABCDE (Airway, Breathing, Circulation, Disability, Exposure) — the primary survey — identifies life threats first. Head-to-toe and pain assessments come only after life-threatening issues are controlled.",
    bpChange: { systolic: -2, diastolic: -1 },
  },
  {
    prompt: "Which IV access is most appropriate RIGHT NOW?",
    options: [
      { text: "A. 24-gauge IV in hand", correct: false, pulseChange: +15 },
      { text: "B. 20-gauge in wrist", correct: false, pulseChange: +12 },
      { text: "C. 18-gauge in antecubital", correct: true, pulseChange: -9 },
      { text: "D. No IV-give oral fluids", correct: false, pulseChange: +20 },
    ],
    correctFeedback:
      "Correct! Large-bore IV access allows rapid delivery of fluids and blood.",
    incorrectFeedback:
      "Incorrect. IV too small, fluids infusing too slowly... Pulse will drop faster for the next two questions.",
    rationale: "An 18-gauge or larger in the antecubital fossa maximizes flow rate. A 24-gauge delivers ~1 mL/min; an 18-gauge delivers ~90 mL/min. In hemorrhagic shock, every second of adequate volume delivery matters.",
    bpChange: { systolic: -2, diastolic: -1 },
    penalty: "ivPenalty",
  },
  {
    prompt: "Which fluid is most appropriate initially?",
    options: [
      { text: "A. D5W", correct: false, pulseChange: +10 },
      { text: "B. Normal saline", correct: false, pulseChange: +8 },
      { text: "C. Oral fluids", correct: false, pulseChange: +15 },
      { text: "D. Lactated Ringer’s", correct: true, pulseChange: -7 },
    ],
    correctFeedback:
      "Correct! Lactated Ringer’s is commonly used to restore volume in trauma patients.",
    incorrectFeedback:
      "Incorrect. Minimal improvement in vitals, heart rate remains unstable.",
    rationale: "Lactated Ringer's closely mimics plasma electrolyte composition. D5W is hypotonic and worsens edema; normal saline in large volumes causes hyperchloremic acidosis; oral fluids are contraindicated in surgical emergencies.",
    bpChange: { systolic: +1, diastolic: +1 },
  },
  {
    prompt: "What should a nurse do next?",
    options: [
      { text: "A. Increase fluid rate", correct: false, pulseChange: +18 },
      { text: "B. Prepare for emergency blood transfusion", correct: true, pulseChange: -12 },
      { text: "C. Wait for the doctor to arrive", correct: false, pulseChange: +25 },
      { text: "D. Get a CT scan quickly", correct: false, pulseChange: +22 },
    ],
    correctFeedback:
      "Correct! Persistent hypotension after fluids indicates ongoing blood loss.",
    incorrectFeedback:
      "Incorrect. One more wrong answer will cause cardiac arrest.",
    rationale: "Fluid-refractory hypotension (BP not improving after 1-2L crystalloid) triggers blood product resuscitation. Waiting or scanning an unstable patient wastes critical time before the patient decompensates.",
    bpChange: { systolic: -10, diastolic: -6 },
    critical: true,
  },
  {
    prompt: "When is blood indicated in trauma resuscitation?",
    options: [
      { text: "A. After CT confirms bleeding", correct: false, pulseChange: +15 },
      { text: "B. When BP remains unstable despite fluids", correct: true, pulseChange: -10 },
      { text: "C. Only after labs return", correct: false, pulseChange: +18 },
      { text: "D. When pain is controlled", correct: false, pulseChange: +15 },
    ],
    correctFeedback:
      "Correct! Blood is required when fluids alone cannot stabilize circulation.",
    incorrectFeedback:
      "Incorrect. Sudden heart rate drop, patient is in near-failure state.",
    rationale: "Damage control resuscitation uses a 1:1:1 ratio of packed RBCs, fresh frozen plasma, and platelets. Waiting for labs or imaging in an actively hemorrhaging patient delays life-saving intervention.",
    bpChange: { systolic: -5, diastolic: -3 },
  },
  {
    prompt: "Why is CT imaging NOT the priority right now?",
    options: [
      { text: "A. CT takes too long to schedule", correct: false, pulseChange: +12 },
      { text: "B. Imaging worsens bleeding", correct: false, pulseChange: +12 },
      { text: "C. The patient is hemodynamically unstable", correct: true, pulseChange: -8 },
      { text: "D. CT is only for fractures", correct: false, pulseChange: +15 },
    ],
    correctFeedback:
      "Correct! Unstable patients must be stabilized before imaging.",
    incorrectFeedback:
      "Incorrect. Heart rhythm becomes irregular, one final chance remains.",
    rationale: "CT is diagnostic, not treatment. A hemodynamically unstable patient who arrests in the scanner cannot be resuscitated effectively. Stabilize first — OR or interventional radiology may be needed immediately.",
    bpChange: { systolic: -5, diastolic: -3 },
  },
  {
    prompt: "What is your PRIORITY action?",
    options: [
      { text: "A. Comfort the patient", correct: false, pulseChange: +30 },
      { text: "B. Document findings", correct: false, pulseChange: +35 },
      { text: "C. Reassess temperature", correct: false, pulseChange: +30 },
      { text: "D. Notify trauma team-suspected internal hemorrhage", correct: true, pulseChange: -15 },
    ],
    correctFeedback:
      "Correct! Rapid escalation ensures immediate surgical intervention.",
    incorrectFeedback: "Incorrect. Fatal delay, cardiac arrest occurs.",
    rationale: "Trauma team activation triggers a coordinated surgical response. Internal hemorrhage often requires emergent operative management — no nursing intervention replaces surgical hemorrhage control.",
    bpChange: { systolic: -10, diastolic: -5 },
    final: true,
  },
];

// ─────────────────────────────────────────────────────────
// PATIENT 2 — MARIA LOPEZ (Septic Shock)
// ─────────────────────────────────────────────────────────
const scenarios2 = [
  {
    prompt: "What finding is MOST concerning right now?",
    options: [
      { text: "A. Fever of 103.1°F", correct: false, pulseChange: +8 },
      { text: "B. Elevated respiratory rate", correct: false, pulseChange: +8 },
      { text: "C. Low blood pressure of 86/54", correct: true, pulseChange: -6 },
      { text: "D. Confusion", correct: false, pulseChange: +10 },
    ],
    correctFeedback: "Correct! Low blood pressure indicates poor tissue perfusion and possible septic shock.",
    incorrectFeedback: "Incorrect. Hypotension is the most life-threatening finding — organ damage occurs rapidly when circulation is compromised.",
    rationale: "While all findings are concerning, hypotension (86/54) signals hemodynamic instability. Septic shock is defined by persistent hypotension despite fluid resuscitation, requiring vasopressors to maintain perfusion.",
    bpChange: { systolic: 0, diastolic: 0 },
  },
  {
    prompt: "Which recent history finding most likely contributed to her condition?",
    options: [
      { text: "A. Mild hypertension", correct: false, pulseChange: +10 },
      { text: "B. Urinary tract infection", correct: true, pulseChange: -7 },
      { text: "C. Seasonal allergies", correct: false, pulseChange: +10 },
      { text: "D. Chronic back pain", correct: false, pulseChange: +10 },
    ],
    correctFeedback: "Correct! Untreated UTIs are a common cause of sepsis, especially in older adults.",
    incorrectFeedback: "Incorrect. The UTI is the likely source — bacteria enter the bloodstream and trigger a systemic inflammatory response.",
    rationale: "Urosepsis accounts for roughly 25% of all sepsis cases. In elderly patients, atypical presentation (confusion, weakness) is common. A UTI diagnosed 3 days ago without adequate treatment is the clear infection source here.",
    bpChange: { systolic: -2, diastolic: -1 },
  },
  {
    prompt: "What condition best explains the patient's symptoms?",
    options: [
      { text: "A. Stroke", correct: false, pulseChange: +12 },
      { text: "B. Heart failure", correct: false, pulseChange: +12 },
      { text: "C. Septic shock", correct: true, pulseChange: -8 },
      { text: "D. Asthma exacerbation", correct: false, pulseChange: +12 },
    ],
    correctFeedback: "Correct! Fever, hypotension, tachycardia, altered mental status, and known infection strongly suggest septic shock.",
    incorrectFeedback: "Incorrect. Septic shock is defined by the combination of infection, systemic inflammatory response, and organ hypoperfusion. Heart rate will increase.",
    rationale: "SIRS criteria: temp >38°C, HR >90, RR >20, altered WBC. Combined with infection and hypotension, this meets septic shock criteria. Stroke would show focal neurologic deficits; heart failure would show pulmonary congestion.",
    bpChange: { systolic: -3, diastolic: -2 },
  },
  {
    prompt: "What should guide nursing care RIGHT NOW?",
    options: [
      { text: "A. Complete head-to-toe assessment", correct: false, pulseChange: +8 },
      { text: "B. ABCs / Primary survey", correct: true, pulseChange: -6 },
      { text: "C. Pain assessment", correct: false, pulseChange: +8 },
      { text: "D. Fall-risk evaluation", correct: false, pulseChange: +8 },
    ],
    correctFeedback: "Correct! Airway, breathing, and circulation must always take priority when a patient is unstable.",
    incorrectFeedback: "Incorrect. ABCs come first — always. A fall-risk evaluation while the patient is in shock can be fatal.",
    rationale: "The primary survey identifies and addresses immediate life threats in order: Airway → Breathing → Circulation → Disability → Exposure. Secondary surveys (including fall risk and pain) are performed only once the patient is stabilized.",
    bpChange: { systolic: -2, diastolic: -1 },
  },
  {
    prompt: "What intervention should occur immediately to improve oxygen delivery?",
    options: [
      { text: "A. Encourage deep breathing only", correct: false, pulseChange: +12 },
      { text: "B. Apply supplemental oxygen", correct: true, pulseChange: -7 },
      { text: "C. Wait for respiratory therapy", correct: false, pulseChange: +14 },
      { text: "D. Obtain another temperature reading", correct: false, pulseChange: +10 },
    ],
    correctFeedback: "Correct! Supplemental oxygen supports tissue perfusion while definitive sepsis treatment is initiated.",
    incorrectFeedback: "Incorrect. SpO2 92% is below the goal of ≥95% in sepsis. Waiting worsens tissue hypoxia.",
    rationale: "Sepsis impairs oxygen delivery through vasodilation and microvascular dysfunction. Supplemental O2 targets SpO2 ≥94%. In severe cases, high-flow oxygen via non-rebreather mask may be needed to maintain saturation.",
    bpChange: { systolic: -2, diastolic: -1 },
  },
  {
    prompt: "What intervention is most appropriate for the falling blood pressure?",
    options: [
      { text: "A. Restrict fluids", correct: false, pulseChange: +15 },
      { text: "B. Begin IV fluid resuscitation", correct: true, pulseChange: -10 },
      { text: "C. Administer insulin", correct: false, pulseChange: +12 },
      { text: "D. Give oral hydration", correct: false, pulseChange: +18 },
    ],
    correctFeedback: "Correct! IV fluids are a cornerstone of sepsis treatment and help restore circulation and blood pressure.",
    incorrectFeedback: "Incorrect. Circulatory support delayed — BP continues falling.",
    rationale: "Sepsis Hour-1 Bundle includes 30 mL/kg IV crystalloid for hypotension or lactate ≥4. Early aggressive fluid resuscitation improves tissue perfusion and is one of the strongest mortality-reducing interventions in sepsis management.",
    bpChange: { systolic: -3, diastolic: -2 },
    penalty: "ivPenalty",
  },
  {
    prompt: "What treatment is most important to initiate early in suspected sepsis?",
    options: [
      { text: "A. Broad-spectrum antibiotics", correct: true, pulseChange: -10 },
      { text: "B. Sedatives", correct: false, pulseChange: +20 },
      { text: "C. Blood transfusion", correct: false, pulseChange: +15 },
      { text: "D. Anticoagulants", correct: false, pulseChange: +15 },
    ],
    correctFeedback: "Correct! Early broad-spectrum antibiotics significantly reduce sepsis mortality.",
    incorrectFeedback: "Incorrect. Source of infection remains uncontrolled — every hour of delay in antibiotics worsens outcomes.",
    rationale: "For every hour of delay in antibiotic administration in septic shock, mortality increases by ~7%. Broad-spectrum coverage is used empirically until culture results guide de-escalation. The Sepsis-3 Hour Bundle mandates antibiotics within 3 hours.",
    bpChange: { systolic: -4, diastolic: -2 },
    critical: true,
  },
  {
    prompt: "Which laboratory test is especially important in suspected sepsis?",
    options: [
      { text: "A. Pregnancy test", correct: false, pulseChange: +12 },
      { text: "B. Serum lactate level", correct: true, pulseChange: -8 },
      { text: "C. Cholesterol panel", correct: false, pulseChange: +12 },
      { text: "D. Thyroid function tests", correct: false, pulseChange: +12 },
    ],
    correctFeedback: "Correct! Elevated lactate indicates poor tissue perfusion and helps assess sepsis severity.",
    incorrectFeedback: "Incorrect. Serum lactate ≥2 mmol/L is a key indicator of inadequate tissue oxygenation and guides resuscitation goals.",
    rationale: "Lactate is a byproduct of anaerobic metabolism when cells are oxygen-deprived. A lactate ≥4 mmol/L is a diagnostic criterion for septic shock. Serial lactate measurements guide resuscitation effectiveness — clearance of ≥10% in 2 hours is the goal.",
    bpChange: { systolic: -4, diastolic: -2 },
  },
  {
    prompt: "Despite treatment, BP remains 78/48. What should the nurse do next?",
    options: [
      { text: "A. Continue observing", correct: false, pulseChange: +22 },
      { text: "B. Prepare for vasopressor support and notify the sepsis team", correct: true, pulseChange: -12 },
      { text: "C. Focus on fever reduction only", correct: false, pulseChange: +20 },
      { text: "D. Schedule discharge planning", correct: false, pulseChange: +25 },
    ],
    correctFeedback: "Correct! Persistent hypotension despite fluids indicates severe septic shock requiring vasopressors.",
    incorrectFeedback: "Incorrect. Fluid-refractory hypotension requires vasopressors — norepinephrine is the first-line agent.",
    rationale: "When MAP remains <65 mmHg despite adequate fluid resuscitation, vasopressor therapy is indicated. Norepinephrine is first-line. Delay in vasopressors leads to prolonged hypoperfusion, organ failure, and death.",
    bpChange: { systolic: -8, diastolic: -5 },
    critical: true,
  },
  {
    prompt: "SEPTIC SHOCK PROGRESSION DETECTED — What is your PRIORITY action?",
    options: [
      { text: "A. Document findings", correct: false, pulseChange: +30 },
      { text: "B. Reassess pain level", correct: false, pulseChange: +25 },
      { text: "C. Continue aggressive sepsis management and notify rapid response team", correct: true, pulseChange: -15 },
      { text: "D. Obtain a dietary consultation", correct: false, pulseChange: +35 },
    ],
    correctFeedback: "Correct! Rapid escalation and aggressive treatment are necessary to prevent organ failure and cardiac arrest.",
    incorrectFeedback: "Incorrect. Multi-organ failure — BP reaches critical levels. Cardiac arrest imminent.",
    rationale: "Septic shock is a medical emergency with >40% mortality. Rapid response team activation ensures immediate intensivist involvement. Continued aggressive management per sepsis bundle — antibiotics, fluids, vasopressors, source control — is the only path to survival.",
    bpChange: { systolic: -10, diastolic: -6 },
    final: true,
  },
];

// Patient chart data for each case
const patientCharts = {
  1: {
    name: "Jordan R.", age: 28, case: "Trauma — Motorcycle Crash",
    rows: [
      ["Mechanism", "Motorcycle crash — blunt abdominal trauma"],
      ["Status", "Pale, cool, clammy skin"],
      ["Abdomen", "Rigid on palpation, severe pain"],
      ["Pulse", "130 BPM (weak, thready)"],
      ["BP", "88/60 mmHg"],
      ["Respirations", "28/min"],
      ["Complaint", "Severe abdominal pain"],
      ["Concern", "Suspected internal hemorrhage / hypovolemic shock"],
    ]
  },
  2: {
    name: "Maria Lopez", age: 56, case: "Sepsis — UTI Source",
    rows: [
      ["Chief Complaint", "Fever, weakness, confusion"],
      ["History", "UTI diagnosed 3 days ago"],
      ["Family Report", "Increasingly confused and lethargic since morning"],
      ["Temperature", "103.1°F (39.5°C)"],
      ["Pulse", "124 BPM (rapid)"],
      ["BP", "86/54 mmHg"],
      ["Respirations", "30/min"],
      ["SpO₂", "92%"],
      ["Skin", "Warm, flushed, delayed responses"],
      ["Concern", "Suspected septic shock from urosepsis"],
    ]
  }
};
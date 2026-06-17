export type ChecklistItemType = 'pass-fail' | 'numeric' | 'visual' | 'pressure';
export type FailReason = 'corroded' | 'damaged' | 'missing' | 'leaking' | 'obstructed' | 'expired' | 'painted' | 'dirty' | 'blocked' | 'low_pressure' | 'high_pressure' | 'not_functioning' | 'not_accessible' | 'tampered' | 'wrong_type' | 'not_synchronized' | 'low_volume' | 'low_battery' | 'no_signal' | 'worn' | 'loose' | 'incorrect_mounting';

export const FAIL_REASON_LABELS: Record<FailReason, string> = {
  corroded: 'Corroded',
  damaged: 'Damaged',
  missing: 'Missing',
  leaking: 'Leaking',
  obstructed: 'Obstructed',
  expired: 'Expired',
  painted: 'Painted',
  dirty: 'Dirty / Loaded with Dust',
  blocked: 'Blocked',
  low_pressure: 'Low Pressure',
  high_pressure: 'High Pressure',
  not_functioning: 'Not Functioning',
  not_accessible: 'Not Accessible',
  tampered: 'Tampered',
  wrong_type: 'Wrong Type / Incorrect',
  not_synchronized: 'Not Synchronized',
  low_volume: 'Low Volume',
  low_battery: 'Low Battery',
  no_signal: 'No Signal',
  worn: 'Worn / Deteriorated',
  loose: 'Loose / Not Secure',
  incorrect_mounting: 'Incorrect Mounting',
};

export interface ChecklistItemDef {
  id: string;
  category: string;
  description: string;
  type: ChecklistItemType;
  unit?: string;
  min?: number;
  max?: number;
  fail_reasons?: FailReason[];
}

export interface ChecklistResult {
  status: 'pass' | 'fail' | 'needs_attention' | 'not_applicable';
  fail_reason?: FailReason;
  value?: number;
  notes?: string;
  photo_urls?: string[];
}

export interface ChecklistItem {
  id: string;
  category: string;
  description: string;
  type: ChecklistItemType;
  unit?: string;
  min?: number;
  max?: number;
  fail_reasons?: FailReason[];
  result: ChecklistResult;
}

export const ASSET_CHECKLISTS: Record<string, ChecklistItemDef[]> = {

  // ═══════════════════════════════════════════════════════════
  // 1. FIRE ALARM SYSTEMS — NFPA 72
  // ═══════════════════════════════════════════════════════════
  Alarm: [
    // Control Panel
    { id: 'alm-01', category: 'Control Panel', description: 'FACP panel accessible and unobstructed', type: 'pass-fail', fail_reasons: ['blocked', 'not_accessible'] },
    { id: 'alm-02', category: 'Control Panel', description: 'LED indicators and display functioning correctly — no trouble or supervisory signals active', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'alm-03', category: 'Control Panel', description: 'Ground fault detection test — no ground faults present', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'alm-04', category: 'Control Panel', description: 'Date and time set correctly on panel', type: 'pass-fail' },
    { id: 'alm-05', category: 'Control Panel', description: 'Event history log accessible and printing (if equipped)', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'alm-06', category: 'Control Panel', description: 'Battery voltage under load', type: 'numeric', unit: 'VDC', min: 23, max: 28 },
    { id: 'alm-07', category: 'Control Panel', description: 'Battery terminals clean, tight, and free of corrosion — battery date within 3-year window', type: 'pass-fail', fail_reasons: ['corroded', 'expired', 'loose'] },
    // Smoke Detectors
    { id: 'alm-08', category: 'Detection Devices', description: 'Smoke detectors clean and free of dust, paint, or covers', type: 'pass-fail', fail_reasons: ['dirty', 'painted', 'damaged'] },
    { id: 'alm-09', category: 'Detection Devices', description: 'Detector sensitivity within manufacturer range', type: 'numeric', unit: '%', min: 0.5, max: 4.0 },
    { id: 'alm-10', category: 'Detection Devices', description: 'Proper placement — no obstructions within 36 inches', type: 'pass-fail', fail_reasons: ['obstructed', 'incorrect_mounting'] },
    { id: 'alm-11', category: 'Detection Devices', description: 'Functional test — detector activates and reports to FACP', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'alm-12', category: 'Detection Devices', description: 'Device count matches system map / as-built drawings', type: 'pass-fail', fail_reasons: ['missing'] },
    { id: 'alm-13', category: 'Detection Devices', description: 'Heat detectors unobstructed and in correct locations', type: 'pass-fail', fail_reasons: ['obstructed', 'wrong_type'] },
    { id: 'alm-14', category: 'Detection Devices', description: 'Duct detectors functioning with sampling tubes clear', type: 'pass-fail', fail_reasons: ['dirty', 'not_functioning'] },
    // Pull Stations
    { id: 'alm-15', category: 'Pull Stations', description: 'Manual pull stations accessible — not blocked by furniture or storage', type: 'pass-fail', fail_reasons: ['blocked', 'not_accessible'] },
    { id: 'alm-16', category: 'Pull Stations', description: 'Pull station operates correctly and reports to FACP', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'alm-17', category: 'Pull Stations', description: 'No physical damage to housing or handle', type: 'pass-fail', fail_reasons: ['damaged'] },
    // Notification
    { id: 'alm-18', category: 'Notification', description: 'Audible alarm devices (horns/bells) produce clear, distinguishable sound throughout', type: 'pass-fail', fail_reasons: ['not_functioning', 'low_volume'] },
    { id: 'alm-19', category: 'Notification', description: 'Visual strobes flash correctly — covers clean and undamaged', type: 'pass-fail', fail_reasons: ['not_functioning', 'damaged', 'dirty'] },
    { id: 'alm-20', category: 'Notification', description: 'Candela output meets area coverage requirements', type: 'pass-fail', fail_reasons: ['wrong_type'] },
    { id: 'alm-21', category: 'Notification', description: 'AV devices synchronized across notification zones', type: 'pass-fail', fail_reasons: ['not_synchronized'] },
    { id: 'alm-22', category: 'Notification', description: 'Decibel reading at notification device (min 15 dB above ambient)', type: 'numeric', unit: 'dB', min: 75, max: 120 },
    // Communication
    { id: 'alm-23', category: 'Communication', description: 'Signal reaches central monitoring station — verified', type: 'pass-fail', fail_reasons: ['no_signal'] },
    { id: 'alm-24', category: 'Communication', description: 'Cellular backup communicator operational', type: 'pass-fail', fail_reasons: ['no_signal', 'not_functioning'] },
    { id: 'alm-25', category: 'Communication', description: 'Internet / IP backup communicator operational', type: 'pass-fail', fail_reasons: ['no_signal', 'not_functioning'] },
    { id: 'alm-26', category: 'Communication', description: 'Central station monitoring account active and confirmed', type: 'pass-fail' },
    // Zone Test
    { id: 'alm-27', category: 'Zone Test', description: 'All zones report correctly to FACP during walk test', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'alm-28', category: 'Zone Test', description: 'Elevator recall interface tested and verified (if equipped)', type: 'pass-fail', fail_reasons: ['not_functioning'] },
  ],

  // ═══════════════════════════════════════════════════════════
  // 2. FIRE SPRINKLER SYSTEMS — NFPA 25
  // ═══════════════════════════════════════════════════════════
  Sprinkler: [
    // Control Valves
    { id: 'spr-01', category: 'Control Valves', description: 'All control valves in fully open position', type: 'pass-fail', fail_reasons: ['tampered', 'obstructed'] },
    { id: 'spr-02', category: 'Control Valves', description: 'Valves locked and supervised (tamper switch functional)', type: 'pass-fail', fail_reasons: ['tampered', 'not_functioning'] },
    { id: 'spr-03', category: 'Control Valves', description: 'No leakage at valve stems, packing, or flanges', type: 'pass-fail', fail_reasons: ['leaking'] },
    { id: 'spr-04', category: 'Control Valves', description: 'Valves accessible — not blocked by storage or equipment', type: 'pass-fail', fail_reasons: ['blocked', 'not_accessible'] },
    // Sprinkler Heads
    { id: 'spr-05', category: 'Sprinkler Heads', description: 'Sprinkler heads free from paint, corrosion, or physical damage', type: 'pass-fail', fail_reasons: ['painted', 'corroded', 'damaged'] },
    { id: 'spr-06', category: 'Sprinkler Heads', description: 'Quantity of affected heads (if painted/corroded/damaged)', type: 'numeric', unit: 'heads' },
    { id: 'spr-07', category: 'Sprinkler Heads', description: 'Correct orientation and spacing per design', type: 'pass-fail', fail_reasons: ['incorrect_mounting', 'wrong_type'] },
    { id: 'spr-08', category: 'Sprinkler Heads', description: 'No obstructions within 18 inches of deflector', type: 'pass-fail', fail_reasons: ['obstructed'] },
    { id: 'spr-09', category: 'Sprinkler Heads', description: 'Escutcheon plates properly seated and flush with ceiling', type: 'pass-fail', fail_reasons: ['missing', 'loose'] },
    { id: 'spr-10', category: 'Sprinkler Heads', description: 'No signs of leakage at heads or fittings', type: 'pass-fail', fail_reasons: ['leaking'] },
    { id: 'spr-11', category: 'Sprinkler Heads', description: 'Coverage area free of storage or structural changes affecting spray pattern', type: 'pass-fail', fail_reasons: ['obstructed'] },
    // Pipe Inspection
    { id: 'spr-12', category: 'Pipe Inspection', description: 'No visible leaks on branch lines or mains', type: 'pass-fail', fail_reasons: ['leaking'] },
    { id: 'spr-13', category: 'Pipe Inspection', description: 'No visible corrosion or external degradation on piping', type: 'pass-fail', fail_reasons: ['corroded'] },
    { id: 'spr-14', category: 'Pipe Inspection', description: 'Seismic bracing secure and undamaged', type: 'pass-fail', fail_reasons: ['loose', 'damaged', 'missing'] },
    { id: 'spr-15', category: 'Pipe Inspection', description: 'Pipe hangers secure — no sagging or missing hangers', type: 'pass-fail', fail_reasons: ['loose', 'missing', 'damaged'] },
    // Water Flow Test
    { id: 'spr-16', category: 'Water Flow Test', description: 'Static pressure at main riser', type: 'pressure', unit: 'PSI', min: 40, max: 175 },
    { id: 'spr-17', category: 'Water Flow Test', description: 'Residual pressure during flow', type: 'pressure', unit: 'PSI', min: 30, max: 175 },
    { id: 'spr-18', category: 'Water Flow Test', description: 'Flow rate at inspectors test connection', type: 'numeric', unit: 'GPM' },
    { id: 'spr-19', category: 'Water Flow Test', description: 'Main drain test — static to residual drop within acceptable range', type: 'pass-fail', fail_reasons: ['low_pressure', 'obstructed'] },
    { id: 'spr-20', category: 'Water Flow Test', description: 'Alarm valve / waterflow switch activates within 90 seconds of test valve opening', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    // FDC
    { id: 'spr-21', category: 'FDC & Connections', description: 'Fire department connection caps in place and not damaged', type: 'pass-fail', fail_reasons: ['missing', 'damaged'] },
    { id: 'spr-22', category: 'FDC & Connections', description: 'FDC swivels turn freely — gaskets intact and lubricated', type: 'pass-fail', fail_reasons: ['corroded', 'damaged'] },
    { id: 'spr-23', category: 'FDC & Connections', description: 'FDC identification sign present and legible', type: 'pass-fail', fail_reasons: ['missing'] },
    // Documentation
    { id: 'spr-24', category: 'Documentation', description: 'System nameplate and hydraulic placard legible and present at riser', type: 'pass-fail', fail_reasons: ['missing'] },
    { id: 'spr-25', category: 'Documentation', description: 'Spare sprinkler cabinet stocked — correct heads, wrench, and count ≥ 6', type: 'pass-fail', fail_reasons: ['missing', 'wrong_type'] },
    { id: 'spr-26', category: 'Documentation', description: 'Last 5-year internal pipe inspection within compliance window', type: 'pass-fail', fail_reasons: ['expired'] },
    // Environmental
    { id: 'spr-27', category: 'Environmental', description: 'Ambient temperature at least 40°F in wet system areas (no freezing risk)', type: 'numeric', unit: '°F', min: 40 },
    { id: 'spr-28', category: 'Environmental', description: 'No signs of freezing, frost, or cold weather damage', type: 'pass-fail', fail_reasons: ['damaged'] },
    { id: 'spr-29', category: 'Environmental', description: 'Dry system air pressure within range', type: 'numeric', unit: 'PSI', min: 15, max: 60 },
  ],

  // ═══════════════════════════════════════════════════════════
  // 3. FIRE EXTINGUISHERS — NFPA 10
  // ═══════════════════════════════════════════════════════════
  Extinguisher: [
    // Location & Accessibility
    { id: 'ext-01', category: 'Location & Accessibility', description: 'Extinguisher in designated location per fire safety plan — visible and accessible', type: 'pass-fail', fail_reasons: ['missing', 'not_accessible', 'blocked'] },
    { id: 'ext-02', category: 'Location & Accessibility', description: 'Travel distance to extinguisher ≤ 75 ft for Class A hazards', type: 'pass-fail', fail_reasons: ['incorrect_mounting'] },
    { id: 'ext-03', category: 'Location & Accessibility', description: 'Mounting bracket secure — top of extinguisher between 3.5–5 ft from floor (≤ 40 lbs)', type: 'pass-fail', fail_reasons: ['loose', 'incorrect_mounting'] },
    { id: 'ext-04', category: 'Location & Accessibility', description: 'Location sign / pictogram visible from 50+ feet and unobstructed', type: 'pass-fail', fail_reasons: ['missing', 'blocked'] },
    // Physical Condition
    { id: 'ext-05', category: 'Physical Condition', description: 'Cylinder exterior free of dents, rust, corrosion, or weld damage', type: 'pass-fail', fail_reasons: ['corroded', 'damaged'] },
    { id: 'ext-06', category: 'Physical Condition', description: 'Hose and nozzle not cracked, clogged, or obstructed', type: 'pass-fail', fail_reasons: ['damaged', 'obstructed'] },
    { id: 'ext-07', category: 'Physical Condition', description: 'Locking pin intact with tamper seal unbroken', type: 'pass-fail', fail_reasons: ['missing', 'tampered'] },
    { id: 'ext-08', category: 'Physical Condition', description: 'Handle undamaged — operates smoothly with no binding', type: 'pass-fail', fail_reasons: ['damaged', 'not_functioning'] },
    // Pressure & Charge
    { id: 'ext-09', category: 'Pressure & Charge', description: 'Pressure gauge needle in green (operable) zone', type: 'pass-fail', fail_reasons: ['low_pressure', 'high_pressure'] },
    { id: 'ext-10', category: 'Pressure & Charge', description: 'Gauge pressure reading', type: 'numeric', unit: 'PSI', min: 100, max: 250 },
    { id: 'ext-11', category: 'Pressure & Charge', description: 'Weight verification — cylinder feels fully charged (CO₂ / clean agent heft test)', type: 'pass-fail', fail_reasons: ['low_pressure'] },
    // Labeling & Documentation
    { id: 'ext-12', category: 'Labeling & Documentation', description: 'Operating instructions label legible, facing outward', type: 'pass-fail', fail_reasons: ['damaged', 'missing'] },
    { id: 'ext-13', category: 'Labeling & Documentation', description: 'Annual maintenance tag present, punched, and current', type: 'pass-fail', fail_reasons: ['missing', 'expired'] },
    { id: 'ext-14', category: 'Labeling & Documentation', description: '6-year internal maintenance date within compliance', type: 'pass-fail', fail_reasons: ['expired'] },
    { id: 'ext-15', category: 'Labeling & Documentation', description: '12-year hydrostatic test date within compliance', type: 'pass-fail', fail_reasons: ['expired'] },
    { id: 'ext-16', category: 'Labeling & Documentation', description: 'UL / ULC rating label legible and affixed', type: 'pass-fail', fail_reasons: ['missing', 'damaged'] },
  ],

  // ═══════════════════════════════════════════════════════════
  // 4. STANDPIPES & HYDRANTS — NFPA 25
  // ═══════════════════════════════════════════════════════════
  Hydrant: [
    // Accessibility
    { id: 'hyd-01', category: 'Accessibility', description: 'Hydrant visible and accessible from street / fire lane approach', type: 'pass-fail', fail_reasons: ['blocked', 'not_accessible'] },
    { id: 'hyd-02', category: 'Accessibility', description: 'No vegetation, debris, snow, or storage within 3 ft clearance', type: 'pass-fail', fail_reasons: ['blocked', 'obstructed'] },
    { id: 'hyd-03', category: 'Accessibility', description: 'Reflective marker or flag present and visible at night', type: 'pass-fail', fail_reasons: ['missing'] },
    // Physical Condition
    { id: 'hyd-04', category: 'Physical Condition', description: 'Barrel free of cracks, rust-through, or impact damage', type: 'pass-fail', fail_reasons: ['corroded', 'damaged'] },
    { id: 'hyd-05', category: 'Physical Condition', description: 'Paint visible — no excessive peeling, fading, or corrosion beneath', type: 'pass-fail', fail_reasons: ['corroded'] },
    { id: 'hyd-06', category: 'Physical Condition', description: 'Hydrant cap threads clean and undamaged — gaskets in good condition', type: 'pass-fail', fail_reasons: ['corroded', 'damaged', 'missing'] },
    { id: 'hyd-07', category: 'Physical Condition', description: 'Operating nut not rounded or damaged — turns freely', type: 'pass-fail', fail_reasons: ['damaged', 'corroded'] },
    { id: 'hyd-08', category: 'Physical Condition', description: 'Nozzle caps removable without excessive force', type: 'pass-fail', fail_reasons: ['corroded', 'damaged'] },
    // Flow Test
    { id: 'hyd-09', category: 'Flow Test', description: 'Static pressure before flow', type: 'numeric', unit: 'PSI', min: 20, max: 200 },
    { id: 'hyd-10', category: 'Flow Test', description: 'Residual pressure during flow', type: 'numeric', unit: 'PSI', min: 15, max: 200 },
    { id: 'hyd-11', category: 'Flow Test', description: 'Flow rate measured at hydrant outlet', type: 'numeric', unit: 'GPM', min: 500, max: 5000 },
    { id: 'hyd-12', category: 'Flow Test', description: 'Flow test results marked on hydrant with date and GPM', type: 'pass-fail', fail_reasons: ['missing'] },
    // Drainage & Operation
    { id: 'hyd-13', category: 'Drainage & Operation', description: 'Hydrant drains properly after closure — no standing water in barrel', type: 'pass-fail', fail_reasons: ['obstructed', 'not_functioning'] },
    { id: 'hyd-14', category: 'Drainage & Operation', description: 'No water leakage around base flanges or ground', type: 'pass-fail', fail_reasons: ['leaking'] },
    { id: 'hyd-15', category: 'Drainage & Operation', description: 'Main valve opens and closes fully — proper turns count', type: 'numeric', unit: 'turns', min: 12, max: 25 },
    { id: 'hyd-16', category: 'Drainage & Operation', description: 'Lubrication applied to operating nut and threads', type: 'pass-fail' },
  ],

  // ═══════════════════════════════════════════════════════════
  // 5. FIRE HOSES — NFPA 1962
  // ═══════════════════════════════════════════════════════════
  Hose: [
    { id: 'hos-01', category: 'Cabinet & Mounting', description: 'Hose cabinet door opens freely — not blocked or painted shut', type: 'pass-fail', fail_reasons: ['blocked', 'damaged'] },
    { id: 'hos-02', category: 'Cabinet & Mounting', description: 'Cabinet glass intact (if applicable) — no sharp edges or cracks', type: 'pass-fail', fail_reasons: ['damaged'] },
    { id: 'hos-03', category: 'Cabinet & Mounting', description: 'Hose rack properly mounted, rotates freely, and supports full weight', type: 'pass-fail', fail_reasons: ['loose', 'damaged'] },
    { id: 'hos-04', category: 'Hose Condition', description: 'Hose exterior free of cuts, abrasions, mildew, dry rot, or delamination', type: 'pass-fail', fail_reasons: ['damaged', 'worn'] },
    { id: 'hos-05', category: 'Hose Condition', description: 'Couplings not deformed — threads clean, undamaged, and free of corrosion', type: 'pass-fail', fail_reasons: ['corroded', 'damaged'] },
    { id: 'hos-06', category: 'Hose Condition', description: 'Hose gasket present, seated correctly, and not cracked', type: 'pass-fail', fail_reasons: ['missing', 'damaged'] },
    { id: 'hos-07', category: 'Hose Condition', description: 'Hose properly folded / racked in cabinet per NFPA accordion or flat-load method', type: 'pass-fail', fail_reasons: ['incorrect_mounting'] },
    { id: 'hos-08', category: 'Nozzle', description: 'Nozzle attached securely — operates smoothly through all spray patterns', type: 'pass-fail', fail_reasons: ['loose', 'not_functioning'] },
    { id: 'hos-09', category: 'Nozzle', description: 'Nozzle free of debris, corrosion, cracks, or physical damage', type: 'pass-fail', fail_reasons: ['corroded', 'damaged', 'dirty'] },
    { id: 'hos-10', category: 'Valve', description: 'Angle hose valve opens and closes fully without binding', type: 'pass-fail', fail_reasons: ['not_functioning', 'corroded'] },
    { id: 'hos-11', category: 'Valve', description: 'Valve handle present, tight on stem, and undamaged', type: 'pass-fail', fail_reasons: ['missing', 'loose', 'damaged'] },
    { id: 'hos-12', category: 'Valve', description: 'No leakage at valve stem or packing when fully open', type: 'pass-fail', fail_reasons: ['leaking'] },
    { id: 'hos-13', category: 'Documentation', description: 'Operating instructions label present and legible inside cabinet', type: 'pass-fail', fail_reasons: ['missing'] },
    { id: 'hos-14', category: 'Documentation', description: 'Annual service test tag present and within date', type: 'pass-fail', fail_reasons: ['missing', 'expired'] },
  ],

  // ═══════════════════════════════════════════════════════════
  // 6. BACKFLOW PREVENTERS — NFPA 25
  // ═══════════════════════════════════════════════════════════
  'Backflow Preventer': [
    { id: 'bfp-01', category: 'Visual Inspection', description: 'Backflow preventer accessible — not blocked or buried', type: 'pass-fail', fail_reasons: ['blocked', 'not_accessible'] },
    { id: 'bfp-02', category: 'Visual Inspection', description: 'No visible leaks, drips, or discharge from assembly', type: 'pass-fail', fail_reasons: ['leaking'] },
    { id: 'bfp-03', category: 'Visual Inspection', description: 'No external corrosion, rust, or physical damage', type: 'pass-fail', fail_reasons: ['corroded', 'damaged'] },
    { id: 'bfp-04', category: 'Visual Inspection', description: 'OS&Y valves fully open and locked/sealed', type: 'pass-fail', fail_reasons: ['tampered'] },
    { id: 'bfp-05', category: 'Testing', description: 'Forward flow test completed — check valve #1 passes', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'bfp-06', category: 'Testing', description: 'Check valve #2 differential pressure within range', type: 'numeric', unit: 'PSID', min: 1 },
    { id: 'bfp-07', category: 'Testing', description: 'Relief valve operates correctly — no excessive discharge', type: 'pass-fail', fail_reasons: ['leaking', 'not_functioning'] },
    { id: 'bfp-08', category: 'Testing', description: 'Shut-off valve #1 static pressure', type: 'numeric', unit: 'PSI', min: 20, max: 200 },
    { id: 'bfp-09', category: 'Testing', description: 'Shut-off valve #2 static pressure', type: 'numeric', unit: 'PSI', min: 20, max: 200 },
    { id: 'bfp-10', category: 'Documentation', description: 'Annual test report tag affixed and current', type: 'pass-fail', fail_reasons: ['missing', 'expired'] },
    { id: 'bfp-11', category: 'Documentation', description: 'Assembly identification tag / number matches records', type: 'pass-fail', fail_reasons: ['missing'] },
  ],

  // ═══════════════════════════════════════════════════════════
  // 7. FIRE PUMPS — NFPA 20
  // ═══════════════════════════════════════════════════════════
  'Fire Pump': [
    { id: 'fpm-01', category: 'Visual Inspection', description: 'Pump room accessible, clean, and ventilated — no storage in room', type: 'pass-fail', fail_reasons: ['blocked', 'not_accessible'] },
    { id: 'fpm-02', category: 'Visual Inspection', description: 'No visible leaks at pump casing, seals, or packing gland', type: 'pass-fail', fail_reasons: ['leaking'] },
    { id: 'fpm-03', category: 'Visual Inspection', description: 'Suction and discharge gauges reading within normal range', type: 'pressure', fail_reasons: ['low_pressure'] },
    { id: 'fpm-04', category: 'Electrical / Diesel', description: 'Controller indicator lights all normal — no alarms or trouble signals', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'fpm-05', category: 'Electrical / Diesel', description: 'Battery voltage (both banks if diesel)', type: 'numeric', unit: 'VDC', min: 23, max: 28 },
    { id: 'fpm-06', category: 'Electrical / Diesel', description: 'Diesel fuel tank level adequate (min 2/3 full)', type: 'pass-fail', fail_reasons: ['low_pressure'] },
    { id: 'fpm-07', category: 'Electrical / Diesel', description: 'Oil level, coolant level, and belts in good condition (diesel)', type: 'pass-fail', fail_reasons: ['low_pressure', 'worn'] },
    { id: 'fpm-08', category: 'Churn Test', description: 'Weekly churn test completed successfully', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'fpm-09', category: 'Churn Test', description: 'Churn test — suction pressure', type: 'numeric', unit: 'PSI' },
    { id: 'fpm-10', category: 'Churn Test', description: 'Churn test — discharge pressure', type: 'numeric', unit: 'PSI' },
    { id: 'fpm-11', category: 'Churn Test', description: 'Pump RPM during churn test', type: 'numeric', unit: 'RPM' },
    { id: 'fpm-12', category: 'Churn Test', description: 'Motor voltage (all legs)', type: 'numeric', unit: 'VAC' },
    { id: 'fpm-13', category: 'Churn Test', description: 'Motor current draw (all legs)', type: 'numeric', unit: 'Amps' },
    { id: 'fpm-14', category: 'Churn Test', description: 'Pump run duration for test', type: 'numeric', unit: 'min', min: 10 },
    { id: 'fpm-15', category: 'Automatic Start', description: 'Pump starts automatically on pressure drop (pressure switch test)', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'fpm-16', category: 'Automatic Start', description: 'Pressure relief valve / circulation relief operates correctly', type: 'pass-fail', fail_reasons: ['not_functioning', 'leaking'] },
  ],

  // ═══════════════════════════════════════════════════════════
  // 8. KITCHEN SUPPRESSION SYSTEMS — NFPA 17A
  // ═══════════════════════════════════════════════════════════
  'Kitchen Suppression': [
    { id: 'kit-01', category: 'Visual Inspection', description: 'Nozzle blow-off caps in place and undamaged', type: 'pass-fail', fail_reasons: ['missing', 'damaged'] },
    { id: 'kit-02', category: 'Visual Inspection', description: 'Nozzles aimed correctly at cooking surfaces per manufacturer layout', type: 'pass-fail', fail_reasons: ['incorrect_mounting'] },
    { id: 'kit-03', category: 'Visual Inspection', description: 'Nozzles free of grease buildup or blockage', type: 'pass-fail', fail_reasons: ['dirty', 'obstructed'] },
    { id: 'kit-04', category: 'Visual Inspection', description: 'Detection link / fusible links clean and undamaged — correct temperature rating', type: 'pass-fail', fail_reasons: ['dirty', 'damaged', 'wrong_type'] },
    { id: 'kit-05', category: 'Agent Cylinder', description: 'Agent cylinder within hydrostatic test date (12-year)', type: 'pass-fail', fail_reasons: ['expired'] },
    { id: 'kit-06', category: 'Agent Cylinder', description: 'Cylinder gauge in green / operable range', type: 'pass-fail', fail_reasons: ['low_pressure'] },
    { id: 'kit-07', category: 'Agent Cylinder', description: 'Cylinder weight within tolerance of nameplate stamped weight', type: 'numeric', unit: 'lbs' },
    { id: 'kit-08', category: 'Mechanical', description: 'Control head / actuator mechanism moves freely', type: 'pass-fail', fail_reasons: ['not_functioning', 'corroded'] },
    { id: 'kit-09', category: 'Mechanical', description: 'Manual pull station accessible — not blocked by equipment', type: 'pass-fail', fail_reasons: ['blocked', 'not_accessible'] },
    { id: 'kit-10', category: 'Mechanical', description: 'Manual pull station functions and releases mechanism', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'kit-11', category: 'Interlocks', description: 'Gas shut-off valve closes on system activation (verified)', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'kit-12', category: 'Interlocks', description: 'Electrical power shut-off to cooking appliances on activation (verified)', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'kit-13', category: 'Interlocks', description: 'Building fire alarm interface functional (if equipped)', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'kit-14', category: 'Documentation', description: 'Semi-annual service tag present and within 6 months', type: 'pass-fail', fail_reasons: ['missing', 'expired'] },
    { id: 'kit-15', category: 'Documentation', description: 'System layout / as-built drawing present in kitchen', type: 'pass-fail', fail_reasons: ['missing'] },
  ],

  // ═══════════════════════════════════════════════════════════
  // 9. EMERGENCY LIGHTING — NFPA 101
  // ═══════════════════════════════════════════════════════════
  'Emergency Lighting': [
    { id: 'eml-01', category: 'Visual Inspection', description: 'Unit housing secure and undamaged — no cracks or discoloration', type: 'pass-fail', fail_reasons: ['damaged', 'loose'] },
    { id: 'eml-02', category: 'Visual Inspection', description: 'Lamp heads aimed correctly for egress path coverage', type: 'pass-fail', fail_reasons: ['incorrect_mounting'] },
    { id: 'eml-03', category: 'Visual Inspection', description: 'Lamps / LED modules clean and free of dust or debris', type: 'pass-fail', fail_reasons: ['dirty'] },
    { id: 'eml-04', category: 'Visual Inspection', description: 'No physical damage to lamps, lenses, or LED modules', type: 'pass-fail', fail_reasons: ['damaged'] },
    { id: 'eml-05', category: 'Functional Test', description: 'AC power indicator LED illuminated (if equipped)', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'eml-06', category: 'Functional Test', description: '30-second push-button test — lamps illuminate at full brightness', type: 'pass-fail', fail_reasons: ['not_functioning', 'low_battery'] },
    { id: 'eml-07', category: 'Functional Test', description: 'Battery voltage under load', type: 'numeric', unit: 'VDC', min: 6 },
    { id: 'eml-08', category: 'Functional Test', description: '90-minute full discharge test completed within last 12 months', type: 'pass-fail', fail_reasons: ['expired'] },
    { id: 'eml-09', category: 'Functional Test', description: 'Battery date within 4-year replacement window', type: 'pass-fail', fail_reasons: ['expired'] },
    { id: 'eml-10', category: 'Exit Signs', description: 'Exit sign illuminated — both AC and emergency modes', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'eml-11', category: 'Exit Signs', description: 'Exit sign lettering legible and properly oriented', type: 'pass-fail', fail_reasons: ['damaged'] },
    { id: 'eml-12', category: 'Documentation', description: 'Monthly test log present and current', type: 'pass-fail', fail_reasons: ['missing'] },
  ],

  // ═══════════════════════════════════════════════════════════
  // 10. SMOKE CONTROL SYSTEMS — NFPA 92
  // ═══════════════════════════════════════════════════════════
  'Smoke Control': [
    { id: 'smk-01', category: 'Visual Inspection', description: 'Smoke control panel accessible and free of trouble signals', type: 'pass-fail', fail_reasons: ['not_accessible', 'not_functioning'] },
    { id: 'smk-02', category: 'Visual Inspection', description: 'All fans visible and accessible — no physical obstruction', type: 'pass-fail', fail_reasons: ['blocked', 'not_accessible'] },
    { id: 'smk-03', category: 'Visual Inspection', description: 'Fan belts tight and in good condition (no cracks or fraying)', type: 'pass-fail', fail_reasons: ['worn', 'loose'] },
    { id: 'smk-04', category: 'Visual Inspection', description: 'Dampers in correct position — actuators undamaged', type: 'pass-fail', fail_reasons: ['damaged', 'not_functioning'] },
    { id: 'smk-05', category: 'Functional Test', description: 'System initiates on alarm signal — fans start and dampers reposition', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'smk-06', category: 'Functional Test', description: 'Stairwell pressurization fan produces positive pressure differential', type: 'numeric', unit: 'inH₂O', min: 0.05, max: 0.35 },
    { id: 'smk-07', category: 'Functional Test', description: 'Smoke exhaust fan airflow rate', type: 'numeric', unit: 'CFM' },
    { id: 'smk-08', category: 'Functional Test', description: 'System returns to normal on alarm reset — all components home', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'smk-09', category: 'Functional Test', description: 'Duct smoke detectors trigger appropriate response sequence', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'smk-10', category: 'Documentation', description: 'Weekly self-test log reviewed — no uncleared faults', type: 'pass-fail', fail_reasons: ['missing'] },
    { id: 'smk-11', category: 'Documentation', description: 'Sequence of operation matrix posted at control panel', type: 'pass-fail', fail_reasons: ['missing'] },
  ],

  // ═══════════════════════════════════════════════════════════
  // 11. ELEVATOR RECALL / FIRE INTERFACE — NFPA 72
  // ═══════════════════════════════════════════════════════════
  'Elevator Recall': [
    { id: 'elv-01', category: 'Visual Inspection', description: 'Elevator machine room smoke detector(s) clean and unobstructed', type: 'pass-fail', fail_reasons: ['dirty', 'obstructed'] },
    { id: 'elv-02', category: 'Visual Inspection', description: 'Elevator lobby smoke detectors clean and in correct locations', type: 'pass-fail', fail_reasons: ['dirty', 'incorrect_mounting'] },
    { id: 'elv-03', category: 'Visual Inspection', description: 'Hoistway smoke detectors (if equipped) clean and accessible', type: 'pass-fail', fail_reasons: ['dirty', 'not_accessible'] },
    { id: 'elv-04', category: 'Functional Test', description: 'Lobby detector activation — elevator recalls to designated floor (Phase I)', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'elv-05', category: 'Functional Test', description: 'Machine room detector activation — shunt trip verified (if applicable)', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'elv-06', category: 'Functional Test', description: 'Fire hat / recall light illuminates at designated floor', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'elv-07', category: 'Functional Test', description: 'Elevator doors open at recall floor and remain open', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'elv-08', category: 'Functional Test', description: 'Phase II firefighter operation verified — keyswitch functions correctly', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'elv-09', category: 'Functional Test', description: 'Emergency communication / phone in elevator verified', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'elv-10', category: 'Documentation', description: 'Annual test report on file — within compliance window', type: 'pass-fail', fail_reasons: ['missing', 'expired'] },
    { id: 'elv-11', category: 'Documentation', description: 'Elevator recall sequence diagram posted in machine room', type: 'pass-fail', fail_reasons: ['missing'] },
  ],

  // ═══════════════════════════════════════════════════════════
  // 12. MONITORING SYSTEMS — NFPA 72
  // ═══════════════════════════════════════════════════════════
  'Monitoring System': [
    { id: 'mon-01', category: 'Communicator', description: 'DACT / cellular communicator powered and free of trouble LEDs', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'mon-02', category: 'Communicator', description: 'Primary phone line voltage / dial tone verified', type: 'pass-fail', fail_reasons: ['no_signal'] },
    { id: 'mon-03', category: 'Communicator', description: 'Cellular signal strength', type: 'numeric', unit: 'dBm', min: -95, max: -50 },
    { id: 'mon-04', category: 'Communicator', description: 'Internet / IP communicator status — connected to receiver', type: 'pass-fail', fail_reasons: ['no_signal'] },
    { id: 'mon-05', category: 'Signal Test', description: 'Alarm signal sent to central station — received and acknowledged', type: 'pass-fail', fail_reasons: ['no_signal', 'not_functioning'] },
    { id: 'mon-06', category: 'Signal Test', description: 'Trouble signal sent to central station — received and acknowledged', type: 'pass-fail', fail_reasons: ['no_signal'] },
    { id: 'mon-07', category: 'Signal Test', description: 'Supervisory signal sent to central station — received and acknowledged', type: 'pass-fail', fail_reasons: ['no_signal'] },
    { id: 'mon-08', category: 'Signal Test', description: 'Communication path failover test — primary to backup path transitions within 4 minutes', type: 'pass-fail', fail_reasons: ['not_functioning'] },
    { id: 'mon-09', category: 'Documentation', description: 'Central station account number and call list current', type: 'pass-fail' },
    { id: 'mon-10', category: 'Documentation', description: 'Annual communication test report on file', type: 'pass-fail', fail_reasons: ['missing', 'expired'] },
  ],
};

export function initChecklistItems(assetType: string): ChecklistItem[] {
  const definitions = ASSET_CHECKLISTS[assetType] || [];
  return definitions.map((def) => ({
    ...def,
    result: {
      status: 'not_applicable' as const,
    },
  }));
}

export function computeChecklistSummary(items: ChecklistItem[]): {
  total: number;
  applicable: number;
  pass: number;
  fail: number;
  needsAttention: number;
  notApplicable: number;
  passRate: number;
} {
  const applicable = items.filter((i) => i.result.status !== 'not_applicable');
  const pass = applicable.filter((i) => i.result.status === 'pass').length;
  const fail = applicable.filter((i) => i.result.status === 'fail').length;
  const needsAttention = applicable.filter((i) => i.result.status === 'needs_attention').length;

  return {
    total: items.length,
    applicable: applicable.length,
    pass,
    fail,
    needsAttention,
    notApplicable: items.filter((i) => i.result.status === 'not_applicable').length,
    passRate: applicable.length > 0 ? Math.round((pass / applicable.length) * 100) : 0,
  };
}

export function checklistToOverallRating(summary: ReturnType<typeof computeChecklistSummary>): string {
  if (summary.applicable === 0) return 'not_rated';
  if (summary.passRate >= 90 && summary.fail === 0) return 'pass';
  if (summary.fail > 0) return 'fail';
  return 'needs_attention';
}
import type { ChecklistItem, FailReason } from './checklists';

interface SuggestionContext {
  item: ChecklistItem;
  assetType: string;
  assetName: string;
  previousNotes?: string;
}

const SUGGESTION_TEMPLATES: Record<string, Record<string, string[]>> = {
  pass: {
    default: [
      'Item inspected and found to be in satisfactory condition.',
      'Component operates within manufacturer specifications.',
      'Visual and functional inspection completed — no deficiencies noted.',
      'All parameters within acceptable range. System functioning normally.',
    ],
    'Control Panel': [
      'Panel inspected — all indicators functioning normally. No active trouble or supervisory signals.',
      'FACP operational. Display, LEDs, and controls responding as expected.',
    ],
    'Detection Devices': [
      'Detector clean and unobstructed. Sensitivity and functional test passed.',
      'Smoke/heat detector tested and verified operational at FACP.',
    ],
    'Sprinkler Heads': [
      'Heads free from paint, corrosion, and physical damage. Orientation correct.',
      'Sprinkler coverage unobstructed. Spacing and deflector clearance within NFPA requirements.',
    ],
    'Pipe Inspection': [
      'Piping visually inspected — no leaks, corrosion, or structural damage observed.',
      'Hangers and seismic bracing secure. No sagging or missing supports.',
    ],
    'Physical Condition': [
      'Physical condition satisfactory — no dents, rust, cracks, or other damage.',
      'Exterior surfaces clean. Cylinder, hose, and fittings in good condition.',
    ],
    'Pressure & Charge': [
      'Pressure gauge reading within acceptable range. Charge verified.',
      'Weight and pressure confirmed within manufacturer specifications.',
    ],
    'Valve': [
      'Valve operates smoothly through full range. No binding or leakage.',
      'Handle secure, stem tight, and packing in good condition.',
    ],
    'Functional Test': [
      'Functional test completed successfully. Device responds within required parameters.',
      'Test passed — output and response time meet code requirements.',
    ],
    'Flow Test': [
      'Flow test completed — static and residual pressures within acceptable range.',
      'Water flow and pressure readings recorded. System performing as designed.',
    ],
    'Notification': [
      'Audible and visual notification devices tested. Sound level and candela output verified.',
      'Strobes and horns operating. Synchronization confirmed across zones.',
    ],
    'Communication': [
      'Signal transmission to central station verified. Backup communicator tested.',
      'Primary and secondary communication paths operational.',
    ],
    'Accessibility': [
      'Component accessible and free from obstruction. Clearance maintained per code.',
      'Location verified against site plan. Visibility and access acceptable.',
    ],
  },
  fail: {
    default: [
      'Deficiency identified during inspection. Corrective action required before next scheduled inspection.',
      'Item failed inspection criteria. Immediate attention recommended to restore compliance.',
      'Non-compliance noted. Detailed findings and recommended repairs documented above.',
    ],
    corroded: [
      'Corrosion observed on component surfaces. Integrity compromised — replacement or refinishing required.',
      'Significant corrosion detected. Continued deterioration may lead to system failure.',
    ],
    damaged: [
      'Physical damage observed. Component may not function as designed under emergency conditions.',
      'Cracks, dents, or deformation noted. Replacement recommended to ensure reliability.',
    ],
    leaking: [
      'Active leak detected. Water loss may affect system pressure and availability.',
      'Leakage observed at seals, packing, or fittings. Repair required to prevent further damage.',
    ],
    obstructed: [
      'Obstruction detected that may impede operation or coverage. Remove blocking material.',
      'Clearance not maintained per code. Item blocked by storage, equipment, or debris.',
    ],
    expired: [
      'Component past required service/test date. Renewal or replacement necessary for compliance.',
      'Date stamp indicates expired certification. Schedule hydrostatic test or replacement.',
    ],
    missing: [
      'Required component or documentation not present at time of inspection.',
      'Item missing from designated location. Verify against inventory and replace.',
    ],
    not_functioning: [
      'Component failed functional test. Does not operate as designed. Repair or replacement required.',
      'Device unresponsive during activation test. Troubleshoot and repair to restore operation.',
    ],
    low_pressure: [
      'Pressure reading below acceptable minimum. System may not provide adequate coverage.',
      'Low pressure detected. Investigate cause — potential obstruction, leak, or supply issue.',
    ],
    high_pressure: [
      'Pressure reading exceeds maximum acceptable. Risk of component damage or unsafe operation.',
      'Overpressure condition noted. Check regulator, relief valve, or supply configuration.',
    ],
    painted: [
      'Component painted over. Paint may prevent proper heat transfer or operation.',
      'Paint or foreign material detected. Clean or replace to restore proper function.',
    ],
    dirty: [
      'Excessive dust, grease, or debris accumulation noted. Clean to ensure proper operation.',
      'Contamination may impair sensitivity or mechanical function. Schedule cleaning service.',
    ],
    blocked: [
      'Access blocked by storage, equipment, or debris. Clear to ensure immediate availability.',
      'Obstruction prevents quick access. Relocate blocking items and verify clearances.',
    ],
    tampered: [
      'Evidence of tampering detected. Seal broken, valve position altered, or lock missing.',
      'Unauthorized modification or tampering noted. Restore to original configuration and secure.',
    ],
    not_accessible: [
      'Component not accessible for inspection or maintenance. Relocate or improve access.',
      'Access obstructed by permanent structures or locked enclosures. Coordinate with facility.',
    ],
    worn: [
      'Wear and deterioration observed. Component approaching end of service life.',
      'Belts, gaskets, or seals show significant wear. Preventive replacement recommended.',
    ],
    loose: [
      'Mounting or fasteners loose. Secure to prevent displacement or failure.',
      'Connection not tight. Risk of vibration damage or disconnection under load.',
    ],
    incorrect_mounting: [
      'Improper installation or orientation. Does not match manufacturer or code requirements.',
      'Mounting position or spacing incorrect. Reinstall to comply with specifications.',
    ],
    wrong_type: [
      'Incorrect type or rating for application. Replace with code-compliant component.',
      'Component specification does not match hazard classification. Verify and correct.',
    ],
  },
  needs_attention: {
    default: [
      'Item functional but showing early signs of wear. Recommend monitoring or preventive maintenance.',
      'Marginal condition noted. No immediate failure risk, but trending toward deficiency.',
      'Operates within limits but approaching threshold. Schedule follow-up or preventive service.',
      'Minor issue observed. Recommend addressing during next scheduled maintenance window.',
    ],
  },
};

function getCategory(item: ChecklistItem): string {
  return item.category;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateAiSuggestion(ctx: SuggestionContext): string {
  const { item } = ctx;
  const status = item.result.status;
  const failReason = item.result.fail_reason;

  if (status === 'not_applicable') {
    return 'Item not applicable to this system or location. Verified against site plan and scope of work.';
  }

  const category = getCategory(item);
  const templates = SUGGESTION_TEMPLATES[status];
  if (!templates) return '';

  // Try fail reason specific first
  if (status === 'fail' && failReason && templates[failReason]) {
    return pickRandom(templates[failReason]);
  }

  // Try category specific
  if (templates[category]) {
    return pickRandom(templates[category]);
  }

  // Fallback to default
  return pickRandom(templates.default || ['Inspection completed.']);
}

// Grammar check: basic cleanup
export function grammarCheck(text: string): { cleaned: string; changes: string[] } {
  const changes: string[] = [];
  let cleaned = text.trim();

  if (!cleaned) return { cleaned, changes };

  // Capitalize first letter
  if (cleaned[0] !== cleaned[0].toUpperCase()) {
    cleaned = cleaned[0].toUpperCase() + cleaned.slice(1);
    changes.push('Capitalized first letter');
  }

  // Ensure period at end
  if (!/[.!?]$/.test(cleaned)) {
    cleaned += '.';
    changes.push('Added closing punctuation');
  }

  // Double spaces
  const beforeSpaces = cleaned;
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  if (cleaned !== beforeSpaces) changes.push('Fixed extra spaces');

  // Common typos
  const typos: Record<string, string> = {
    'teh ': 'the ',
    'Teh ': 'The ',
    'recieve': 'receive',
    'Recieve': 'Receive',
    'occured': 'occurred',
    'Occured': 'Occurred',
    'maintainance': 'maintenance',
    'Maintainance': 'Maintenance',
    'deficency': 'deficiency',
    'Deficency': 'Deficiency',
    'corosion': 'corrosion',
    'Corosion': 'Corrosion',
    'leakege': 'leakage',
    'Leakege': 'Leakage',
    'pressue': 'pressure',
    'Pressue': 'Pressure',
    'operatonal': 'operational',
    'Operatonal': 'Operational',
    'funtional': 'functional',
    'Funtional': 'Functional',
    'inspecton': 'inspection',
    'Inspecton': 'Inspection',
    'sprinklr': 'sprinkler',
    'Sprinklr': 'Sprinkler',
    'extingisher': 'extinguisher',
    'Extingisher': 'Extinguisher',
    'hydrent': 'hydrant',
    'Hydrent': 'Hydrant',
    'noticible': 'noticeable',
    'Noticible': 'Noticeable',
    'unaccesible': 'inaccessible',
    'Unaccesible': 'Inaccessible',
    'apropriate': 'appropriate',
    'Apropriate': 'Appropriate',
    'excesive': 'excessive',
    'Excesive': 'Excessive',
  };

  for (const [typo, fix] of Object.entries(typos)) {
    const before = cleaned;
    cleaned = cleaned.replace(new RegExp(typo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fix);
    if (cleaned !== before) {
      changes.push(`Fixed "${typo.trim()}" → "${fix.trim()}"`);
    }
  }

  return { cleaned, changes };
}

// Check for missing required fields
export interface MissingFieldWarning {
  itemId: string;
  itemDescription: string;
  message: string;
  severity: 'warning' | 'error';
}

export function checkMissingFields(items: ChecklistItem[]): MissingFieldWarning[] {
  const warnings: MissingFieldWarning[] = [];

  for (const item of items) {
    const result = item.result;

    // Skip N/A items
    if (result.status === 'not_applicable') continue;

    // Numeric items need a value
    if ((item.type === 'numeric' || item.type === 'pressure') && (result.value === undefined || result.value === null)) {
      warnings.push({
        itemId: item.id,
        itemDescription: item.description,
        message: `Missing required numeric value for "${item.description}" (${item.unit || 'units'})`,
        severity: 'error',
      });
    }

    // Fail items need a fail reason
    if (result.status === 'fail' && item.fail_reasons && item.fail_reasons.length > 0 && !result.fail_reason) {
      warnings.push({
        itemId: item.id,
        itemDescription: item.description,
        message: `Failed item needs a deficiency type selected for "${item.description}"`,
        severity: 'error',
      });
    }

    // Needs attention or fail should have a note
    if ((result.status === 'fail' || result.status === 'needs_attention') && (!result.notes || result.notes.trim().length < 10)) {
      warnings.push({
        itemId: item.id,
        itemDescription: item.description,
        message: `${result.status === 'fail' ? 'Failed' : 'Attention'} item "${item.description}" should include detailed notes`,
        severity: 'warning',
      });
    }

    // Pass items with numeric out of range
    if ((item.type === 'numeric' || item.type === 'pressure') && result.value !== undefined && result.value !== null) {
      if (item.min !== undefined && result.value < item.min) {
        warnings.push({
          itemId: item.id,
          itemDescription: item.description,
          message: `Value ${result.value}${item.unit ? ' ' + item.unit : ''} is below minimum ${item.min}${item.unit ? ' ' + item.unit : ''}`,
          severity: 'error',
        });
      }
      if (item.max !== undefined && result.value > item.max) {
        warnings.push({
          itemId: item.id,
          itemDescription: item.description,
          message: `Value ${result.value}${item.unit ? ' ' + item.unit : ''} exceeds maximum ${item.max}${item.unit ? ' ' + item.unit : ''}`,
          severity: 'error',
        });
      }
    }
  }

  return warnings;
}

// Quick stats for AI panel
export function getAiInspectionStats(items: ChecklistItem[]) {
  const applicable = items.filter((i) => i.result.status !== 'not_applicable');
  const failed = applicable.filter((i) => i.result.status === 'fail');
  const attention = applicable.filter((i) => i.result.status === 'needs_attention');
  const missingValues = items.filter((i) => (i.type === 'numeric' || i.type === 'pressure') && i.result.status !== 'not_applicable' && (i.result.value === undefined || i.result.value === null));
  const missingNotes = applicable.filter((i) => (i.result.status === 'fail' || i.result.status === 'needs_attention') && (!i.result.notes || i.result.notes.trim().length < 10));

  return {
    total: items.length,
    applicable: applicable.length,
    pass: applicable.filter((i) => i.result.status === 'pass').length,
    fail: failed.length,
    attention: attention.length,
    missingValues: missingValues.length,
    missingNotes: missingNotes.length,
    completionPercent: items.length > 0 ? Math.round((applicable.length / items.length) * 100) : 0,
    hasCriticalIssues: failed.length > 0 || attention.length > 0,
  };
}
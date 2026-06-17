export interface DeficiencyItem {
  id: string;
  inspection_id: string;
  asset_id: string | null;
  customer_id: string;
  customer_name: string;
  asset_name: string | null;
  checklist_item_id: string;
  checklist_item_description: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  corrective_action: string | null;
  status: 'open' | 'in_progress' | 'resolved';
  estimated_cost: number | null;
  resolved_at: string | null;
  created_at: string;
}

export const mockDeficiencies: DeficiencyItem[] = [
  {
    id: 'def-001',
    inspection_id: 'insp-001',
    asset_id: 'asset-001',
    customer_id: 'cust-001',
    customer_name: 'Acme Office Building',
    asset_name: 'Main Lobby Extinguisher #1',
    checklist_item_id: 'ext-05',
    checklist_item_description: 'Cylinder exterior free of dents, rust, corrosion, or weld damage',
    severity: 'medium',
    description: 'Extinguisher cylinder shows surface rust on bottom bracket. Corrosion present around mounting clamp.',
    corrective_action: 'Replace extinguisher with new unit. Install stainless steel mounting bracket.',
    status: 'open',
    estimated_cost: 185.0,
    resolved_at: null,
    created_at: '2025-05-15T10:30:00Z',
  },
  {
    id: 'def-002',
    inspection_id: 'insp-002',
    asset_id: 'asset-003',
    customer_id: 'cust-001',
    customer_name: 'Acme Office Building',
    asset_name: 'East Wing Sprinkler Riser',
    checklist_item_id: 'spr-02',
    checklist_item_description: 'Valves locked and supervised (tamper switch functional)',
    severity: 'critical',
    description: 'Main control valve tamper switch is non-functional. Valve seal appears cut and wire is disconnected.',
    corrective_action: 'Replace tamper switch assembly. Re-wire to FACP. Test signal transmission.',
    status: 'in_progress',
    estimated_cost: 420.0,
    resolved_at: null,
    created_at: '2025-05-18T14:15:00Z',
  },
  {
    id: 'def-003',
    inspection_id: 'insp-004',
    asset_id: 'asset-005',
    customer_id: 'cust-002',
    customer_name: 'Riverside Manufacturing',
    asset_name: 'Warehouse Fire Alarm Panel',
    checklist_item_id: 'alm-02',
    checklist_item_description: 'LED indicators and display functioning correctly',
    severity: 'high',
    description: 'FACP showing persistent ground fault on Zone 4. Display flickers intermittently during event log review.',
    corrective_action: 'Troubleshoot ground fault on Zone 4 wiring. Replace display module if flickering persists.',
    status: 'open',
    estimated_cost: 650.0,
    resolved_at: null,
    created_at: '2025-05-20T09:00:00Z',
  },
  {
    id: 'def-004',
    inspection_id: 'insp-005',
    asset_id: 'asset-007',
    customer_id: 'cust-003',
    customer_name: 'St. Mary Hospital',
    asset_name: '3rd Floor Corridor Hydrant',
    checklist_item_id: 'hyd-03',
    checklist_item_description: 'Reflective marker or flag present and visible at night',
    severity: 'low',
    description: 'Reflective marker on hydrant post is faded and peeling. Still somewhat visible but needs replacement.',
    corrective_action: 'Replace reflective marker with new high-visibility version.',
    status: 'resolved',
    estimated_cost: 35.0,
    resolved_at: '2025-05-22T11:30:00Z',
    created_at: '2025-05-10T08:45:00Z',
  },
  {
    id: 'def-005',
    inspection_id: 'insp-006',
    asset_id: 'asset-009',
    customer_id: 'cust-004',
    customer_name: 'Grand Hotel Downtown',
    asset_name: 'Kitchen Hood Suppression #2',
    checklist_item_id: 'kit-03',
    checklist_item_description: 'Nozzles free of grease buildup or blockage',
    severity: 'critical',
    description: 'Three nozzles in the south hood line are completely blocked with grease buildup. System would fail to discharge properly.',
    corrective_action: 'Complete system clean including all nozzles, fusible links, and agent cylinder. Re-certify.',
    status: 'open',
    estimated_cost: 1200.0,
    resolved_at: null,
    created_at: '2025-05-25T16:20:00Z',
  },
  {
    id: 'def-006',
    inspection_id: 'insp-007',
    asset_id: null,
    customer_id: 'cust-005',
    customer_name: 'Liberty School District',
    asset_name: null,
    checklist_item_id: 'eml-08',
    checklist_item_description: '90-minute full discharge test completed within last 12 months',
    severity: 'high',
    description: 'Annual 90-minute discharge test is overdue by 4 months for all emergency lighting units in Building B.',
    corrective_action: 'Schedule and perform full 90-minute discharge test on all Building B units. Replace any batteries that fail.',
    status: 'in_progress',
    estimated_cost: 890.0,
    resolved_at: null,
    created_at: '2025-05-12T07:15:00Z',
  },
];

export const severityStyles: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-50 text-amber-600',
  high: 'bg-orange-50 text-orange-600',
  critical: 'bg-red-50 text-red-600',
};

export const statusStyles: Record<string, string> = {
  open: 'bg-red-50 text-red-600',
  in_progress: 'bg-brand-cyan/10 text-brand-cyan',
  resolved: 'bg-emerald-50 text-emerald-600',
};
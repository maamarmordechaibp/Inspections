export interface WorkOrderItem {
  id: string;
  proposal_id: string | null;
  customer_id: string;
  customer_name: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to: string | null;
  assigned_name: string | null;
  scheduled_date: string | null;
  completed_date: string | null;
  labor_hours: number | null;
  materials_cost: number;
  labor_cost: number;
  total_cost: number;
  created_at: string;
}

export const mockWorkOrders: WorkOrderItem[] = [
  {
    id: 'wo-001',
    proposal_id: 'prop-003',
    customer_id: 'cust-004',
    customer_name: 'Grand Hotel Downtown',
    title: 'Kitchen Hood System Deep Clean & Recertification',
    description: 'Complete cleaning of south hood line nozzles, fusible links, agent cylinder recharge, and recertification.',
    priority: 'urgent',
    status: 'in_progress',
    assigned_to: 'user-003',
    assigned_name: 'Marcus Chen',
    scheduled_date: '2025-05-29',
    completed_date: null,
    labor_hours: 6,
    materials_cost: 1200.0,
    labor_cost: 570.0,
    total_cost: 1770.0,
    created_at: '2025-05-27T15:00:00Z',
  },
  {
    id: 'wo-002',
    proposal_id: null,
    customer_id: 'cust-001',
    customer_name: 'Acme Office Building',
    title: 'Sprinkler Riser Valve Repair',
    description: 'Replace tamper switch assembly and re-wire to FACP on east wing riser.',
    priority: 'high',
    status: 'pending',
    assigned_to: null,
    assigned_name: null,
    scheduled_date: null,
    completed_date: null,
    labor_hours: null,
    materials_cost: 185.0,
    labor_cost: 285.0,
    total_cost: 470.0,
    created_at: '2025-05-19T11:00:00Z',
  },
  {
    id: 'wo-003',
    proposal_id: null,
    customer_id: 'cust-005',
    customer_name: 'Liberty School District',
    title: 'Building B Emergency Lighting 90-Min Test',
    description: 'Schedule and perform full 90-minute discharge test on all emergency lighting units.',
    priority: 'medium',
    status: 'pending',
    assigned_to: null,
    assigned_name: null,
    scheduled_date: '2025-06-03',
    completed_date: null,
    labor_hours: null,
    materials_cost: 450.0,
    labor_cost: 440.0,
    total_cost: 890.0,
    created_at: '2025-05-22T08:00:00Z',
  },
  {
    id: 'wo-004',
    proposal_id: null,
    customer_id: 'cust-003',
    customer_name: 'St. Mary Hospital',
    title: 'Hydrant Reflective Marker Replacement',
    description: 'Replace faded reflective marker on 3rd floor corridor hydrant post.',
    priority: 'low',
    status: 'completed',
    assigned_to: 'user-002',
    assigned_name: 'Sarah Johnson',
    scheduled_date: '2025-05-20',
    completed_date: '2025-05-22',
    labor_hours: 0.5,
    materials_cost: 35.0,
    labor_cost: 47.5,
    total_cost: 82.5,
    created_at: '2025-05-20T09:00:00Z',
  },
];

export const priorityStyles: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-50 text-amber-600',
  high: 'bg-orange-50 text-orange-600',
  urgent: 'bg-red-50 text-red-600',
};

export const statusStyles: Record<string, string> = {
  pending: 'bg-brand-cyan/10 text-brand-cyan',
  in_progress: 'bg-amber-50 text-amber-600',
  completed: 'bg-emerald-50 text-emerald-600',
  cancelled: 'bg-gray-100 text-gray-500',
};
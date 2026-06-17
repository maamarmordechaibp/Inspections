export interface ProposalItem {
  id: string;
  customer_id: string;
  customer_name: string;
  title: string;
  description: string | null;
  deficiency_ids: string[];
  line_items: { description: string; quantity: number; unit_price: number; total: number }[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
  sent_at: string | null;
  approved_at: string | null;
  valid_until: string | null;
  created_at: string;
}

export const mockProposals: ProposalItem[] = [
  {
    id: 'prop-001',
    customer_id: 'cust-001',
    customer_name: 'Acme Office Building',
    title: 'Fire Extinguisher & Valve Repair',
    description: 'Replace corroded extinguisher and repair tamper switch on east wing sprinkler riser.',
    deficiency_ids: ['def-001', 'def-002'],
    line_items: [
      { description: 'ABC Fire Extinguisher 10lb', quantity: 1, unit_price: 145.0, total: 145.0 },
      { description: 'Stainless Steel Wall Bracket', quantity: 1, unit_price: 40.0, total: 40.0 },
      { description: 'Tamper Switch Assembly', quantity: 1, unit_price: 185.0, total: 185.0 },
      { description: 'Labor — Replace & Rewire', quantity: 3, unit_price: 95.0, total: 285.0 },
    ],
    subtotal: 655.0,
    tax_rate: 8.25,
    tax_amount: 54.04,
    total: 709.04,
    status: 'sent',
    sent_at: '2025-05-19T10:00:00Z',
    approved_at: null,
    valid_until: '2025-06-19',
    created_at: '2025-05-18T16:30:00Z',
  },
  {
    id: 'prop-002',
    customer_id: 'cust-002',
    customer_name: 'Riverside Manufacturing',
    title: 'Zone 4 Ground Fault Troubleshooting',
    description: 'Diagnose and repair ground fault condition on Zone 4 of the FACP.',
    deficiency_ids: ['def-003'],
    line_items: [
      { description: 'Ground Fault Diagnostic & Repair', quantity: 1, unit_price: 450.0, total: 450.0 },
      { description: 'FACP Display Module (if needed)', quantity: 1, unit_price: 320.0, total: 320.0 },
      { description: 'Labor — Troubleshoot & Replace', quantity: 4, unit_price: 95.0, total: 380.0 },
    ],
    subtotal: 1150.0,
    tax_rate: 8.25,
    tax_amount: 94.88,
    total: 1244.88,
    status: 'draft',
    sent_at: null,
    approved_at: null,
    valid_until: '2025-07-20',
    created_at: '2025-05-21T09:15:00Z',
  },
  {
    id: 'prop-003',
    customer_id: 'cust-004',
    customer_name: 'Grand Hotel Downtown',
    title: 'Kitchen Hood System Deep Clean & Recertification',
    description: 'Complete system cleaning including nozzles, links, cylinder, and recertification.',
    deficiency_ids: ['def-005'],
    line_items: [
      { description: 'Hood System Deep Clean (south line)', quantity: 1, unit_price: 650.0, total: 650.0 },
      { description: 'Fusible Link Replacement (set of 4)', quantity: 1, unit_price: 85.0, total: 85.0 },
      { description: 'Agent Cylinder Recharge', quantity: 1, unit_price: 320.0, total: 320.0 },
      { description: 'System Recertification & Tags', quantity: 1, unit_price: 145.0, total: 145.0 },
    ],
    subtotal: 1200.0,
    tax_rate: 8.25,
    tax_amount: 99.0,
    total: 1299.0,
    status: 'approved',
    sent_at: '2025-05-26T08:00:00Z',
    approved_at: '2025-05-27T14:30:00Z',
    valid_until: '2025-06-26',
    created_at: '2025-05-25T17:00:00Z',
  },
];

export const statusStyles: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-brand-cyan/10 text-brand-cyan',
  approved: 'bg-emerald-50 text-emerald-600',
  rejected: 'bg-red-50 text-red-600',
  expired: 'bg-gray-100 text-gray-500',
};
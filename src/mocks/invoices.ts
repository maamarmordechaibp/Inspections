export interface InvoiceItem {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  title: string;
  description: string | null;
  line_items: { description: string; quantity: number; unit_price: number; total: number }[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  sent_at: string | null;
  paid_at: string | null;
  due_date: string | null;
  created_at: string;
}

export const mockInvoices: InvoiceItem[] = [
  {
    id: 'inv-001',
    invoice_number: 'INV-1001',
    customer_id: 'cust-001',
    customer_name: 'Acme Office Building',
    title: 'Fire Extinguisher & Valve Repair',
    description: 'Invoice for completed extinguisher replacement and valve tamper switch repair.',
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
    status: 'paid',
    sent_at: '2025-05-20T10:00:00Z',
    paid_at: '2025-05-25T14:30:00Z',
    due_date: '2025-06-20',
    created_at: '2025-05-20T09:00:00Z',
  },
  {
    id: 'inv-002',
    invoice_number: 'INV-1002',
    customer_id: 'cust-004',
    customer_name: 'Grand Hotel Downtown',
    title: 'Kitchen Hood System Deep Clean & Recertification',
    description: 'Invoice for hood system cleaning, link replacement, cylinder recharge, and recertification.',
    line_items: [
      { description: 'Hood System Deep Clean', quantity: 1, unit_price: 650.0, total: 650.0 },
      { description: 'Fusible Link Replacement (set of 4)', quantity: 1, unit_price: 85.0, total: 85.0 },
      { description: 'Agent Cylinder Recharge', quantity: 1, unit_price: 320.0, total: 320.0 },
      { description: 'System Recertification & Tags', quantity: 1, unit_price: 145.0, total: 145.0 },
      { description: 'Labor — 6 hours @ $95/hr', quantity: 6, unit_price: 95.0, total: 570.0 },
    ],
    subtotal: 1770.0,
    tax_rate: 8.25,
    tax_amount: 146.03,
    total: 1916.03,
    status: 'sent',
    sent_at: '2025-05-28T09:00:00Z',
    paid_at: null,
    due_date: '2025-06-28',
    created_at: '2025-05-28T08:00:00Z',
  },
  {
    id: 'inv-003',
    invoice_number: 'INV-1003',
    customer_id: 'cust-003',
    customer_name: 'St. Mary Hospital',
    title: 'Hydrant Marker & Misc Service',
    description: 'Invoice for hydrant marker replacement and routine inspection service.',
    line_items: [
      { description: 'Reflective Marker Replacement', quantity: 1, unit_price: 35.0, total: 35.0 },
      { description: 'Labor — 0.5 hours @ $95/hr', quantity: 0.5, unit_price: 95.0, total: 47.5 },
    ],
    subtotal: 82.5,
    tax_rate: 8.25,
    tax_amount: 6.81,
    total: 89.31,
    status: 'overdue',
    sent_at: '2025-05-23T10:00:00Z',
    paid_at: null,
    due_date: '2025-05-30',
    created_at: '2025-05-23T09:00:00Z',
  },
  {
    id: 'inv-004',
    invoice_number: 'INV-1004',
    customer_id: 'cust-005',
    customer_name: 'Liberty School District',
    title: 'Building B Emergency Lighting Test',
    description: 'Invoice for 90-minute discharge test and battery replacements.',
    line_items: [
      { description: '90-Minute Discharge Test (full building)', quantity: 1, unit_price: 450.0, total: 450.0 },
      { description: 'Battery Replacement (12 units)', quantity: 12, unit_price: 45.0, total: 540.0 },
      { description: 'Labor — 4.5 hours @ $95/hr', quantity: 4.5, unit_price: 95.0, total: 427.5 },
    ],
    subtotal: 1417.5,
    tax_rate: 8.25,
    tax_amount: 116.94,
    total: 1534.44,
    status: 'draft',
    sent_at: null,
    paid_at: null,
    due_date: '2025-07-15',
    created_at: '2025-05-29T08:00:00Z',
  },
];

export const statusStyles: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-brand-cyan/10 text-brand-cyan',
  paid: 'bg-emerald-50 text-emerald-600',
  overdue: 'bg-red-50 text-red-600',
  cancelled: 'bg-gray-100 text-gray-500',
};
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import type { DeficiencyItem } from '@/mocks/deficiencies';

interface ConvertDeficiencyModalProps {
  /** One or more deficiencies to convert. Must all belong to the same customer. */
  deficiencies: DeficiencyItem[];
  onClose: () => void;
  /** Called after a successful conversion so the parent can refresh / mark items. */
  onConverted: (deficiencyIds: string[]) => void;
}

type Target = 'proposal' | 'work_order';

const severityToPriority: Record<DeficiencyItem['severity'], string> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'urgent',
};

const DEFAULT_TAX_RATE = 0;

export default function ConvertDeficiencyModal({ deficiencies, onClose, onConverted }: ConvertDeficiencyModalProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const [target, setTarget] = useState<Target>('proposal');
  const [saving, setSaving] = useState(false);
  const [markInProgress, setMarkInProgress] = useState(true);

  const customer = deficiencies[0];
  const customerName = customer?.customer_name || 'Customer';

  // Build editable line items from each deficiency.
  const initialLines = useMemo(
    () =>
      deficiencies.map((d) => ({
        deficiencyId: d.id,
        description:
          d.corrective_action?.trim() ||
          d.description ||
          d.checklist_item_description ||
          'Corrective work',
        assetName: d.asset_name,
        quantity: 1,
        unit_price: d.estimated_cost ?? 0,
      })),
    [deficiencies],
  );
  const [lines, setLines] = useState(initialLines);
  const [taxRate, setTaxRate] = useState(DEFAULT_TAX_RATE);
  const [title, setTitle] = useState(
    deficiencies.length === 1
      ? `Repair: ${deficiencies[0].asset_name || deficiencies[0].description.slice(0, 40)}`
      : `Corrective work — ${deficiencies.length} items`,
  );

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.quantity * l.unit_price, 0),
    [lines],
  );
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const total = subtotal + taxAmount;

  // Highest severity drives work-order priority.
  const priority = useMemo(() => {
    const order: DeficiencyItem['severity'][] = ['low', 'medium', 'high', 'critical'];
    const top = deficiencies.reduce(
      (acc, d) => (order.indexOf(d.severity) > order.indexOf(acc) ? d.severity : acc),
      'low' as DeficiencyItem['severity'],
    );
    return severityToPriority[top];
  }, [deficiencies]);

  const updateLine = (i: number, patch: Partial<(typeof lines)[number]>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const buildDescription = () =>
    deficiencies
      .map((d) => {
        const asset = d.asset_name ? `[${d.asset_name}] ` : '';
        return `${asset}${d.description}${d.corrective_action ? ` — Recommended: ${d.corrective_action}` : ''}`;
      })
      .join('\n');

  const handleConvert = async () => {
    if (!title.trim()) {
      toast.warning('Please enter a title.');
      return;
    }
    setSaving(true);
    const deficiencyIds = deficiencies.map((d) => d.id);

    try {
      let newId: string | null = null;

      if (target === 'proposal') {
        const lineItems = lines.map((l) => ({
          description: l.assetName ? `${l.assetName}: ${l.description}` : l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          total: Math.round(l.quantity * l.unit_price * 100) / 100,
        }));
        const { data, error } = await supabase
          .from('proposals')
          .insert({
            customer_id: customer.customer_id,
            title: title.trim(),
            description: buildDescription(),
            line_items: lineItems,
            subtotal,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            total,
            status: 'draft',
            deficiency_ids: deficiencyIds,
          })
          .select('id')
          .single();
        if (error) throw error;
        newId = data.id;
      } else {
        const { data, error } = await supabase
          .from('work_orders')
          .insert({
            customer_id: customer.customer_id,
            title: title.trim(),
            description: buildDescription(),
            priority,
            status: 'pending',
            materials_cost: subtotal,
            labor_cost: 0,
            total_cost: total,
          })
          .select('id')
          .single();
        if (error) throw error;
        newId = data.id;
      }

      // Optionally advance the deficiencies to "in progress".
      if (markInProgress) {
        await supabase
          .from('deficiencies')
          .update({ status: 'in_progress' })
          .in('id', deficiencyIds);
      }

      onConverted(markInProgress ? deficiencyIds : []);
      toast.success(
        target === 'proposal'
          ? `Proposal created for ${customerName}.`
          : `Work order created for ${customerName}.`,
      );
      onClose();
      if (newId) {
        navigate(target === 'proposal' ? '/proposals' : `/work-orders/${newId}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Conversion failed.';
      toast.error(`Could not create ${target === 'proposal' ? 'proposal' : 'work order'}: ${msg}`);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9000] flex items-end sm:items-center justify-center bg-brand-navy/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-brand-navy">Convert to revenue</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {deficiencies.length} deficienc{deficiencies.length === 1 ? 'y' : 'ies'} · {customerName}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg hover:bg-gray-50 flex items-center justify-center text-gray-400 cursor-pointer"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Target toggle */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Create a</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTarget('proposal')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all cursor-pointer ${
                  target === 'proposal'
                    ? 'border-brand-gold bg-brand-gold/10 text-brand-navy'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <i className="ri-file-list-3-line text-base"></i>
                Proposal / Quote
              </button>
              <button
                onClick={() => setTarget('work_order')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all cursor-pointer ${
                  target === 'work_order'
                    ? 'border-brand-gold bg-brand-gold/10 text-brand-navy'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <i className="ri-hammer-line text-base"></i>
                Work Order
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15"
            />
          </div>

          {/* Line items */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              {target === 'proposal' ? 'Line items' : 'Work items'}
            </label>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={l.deficiencyId} className="flex items-start gap-2 bg-gray-50 rounded-lg p-2.5">
                  <div className="flex-1 min-w-0">
                    <input
                      value={l.description}
                      onChange={(e) => updateLine(i, { description: e.target.value })}
                      className="w-full px-2 py-1.5 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:border-brand-gold"
                    />
                    {l.assetName && <p className="text-[11px] text-gray-400 mt-1 px-1">Asset: {l.assetName}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min={1}
                      value={l.quantity}
                      onChange={(e) => updateLine(i, { quantity: Math.max(1, Number(e.target.value)) })}
                      className="w-12 px-1.5 py-1.5 rounded-md border border-gray-200 bg-white text-sm text-center focus:outline-none focus:border-brand-gold"
                      aria-label="Quantity"
                    />
                    <span className="text-gray-300 text-xs">×</span>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={l.unit_price}
                        onChange={(e) => updateLine(i, { unit_price: Math.max(0, Number(e.target.value)) })}
                        className="w-24 pl-5 pr-2 py-1.5 rounded-md border border-gray-200 bg-white text-sm text-right focus:outline-none focus:border-brand-gold"
                        aria-label="Unit price"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium text-gray-900">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-1.5">
                Tax
                <input
                  type="number"
                  min={0}
                  max={1}
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Math.max(0, Math.min(1, Number(e.target.value))))}
                  className="w-16 px-1.5 py-1 rounded border border-gray-200 bg-white text-xs text-center focus:outline-none focus:border-brand-gold"
                  aria-label="Tax rate (decimal, e.g. 0.08)"
                />
                <span className="text-gray-400 text-xs">({(taxRate * 100).toFixed(0)}%)</span>
              </span>
              <span className="font-medium text-gray-900">${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between text-sm pt-1.5 border-t border-gray-200">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold text-brand-navy text-base">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {target === 'work_order' && (
            <p className="text-xs text-gray-500">
              Priority will be set to <span className="font-semibold capitalize">{priority}</span> based on the highest deficiency severity.
            </p>
          )}

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={markInProgress}
              onChange={(e) => setMarkInProgress(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-brand-navy focus:ring-brand-gold cursor-pointer"
            />
            Mark {deficiencies.length === 1 ? 'this deficiency' : 'these deficiencies'} as “In Progress”
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConvert}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-brand-navy hover:bg-brand-navy/90 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <i className="ri-loader-4-line animate-spin"></i>}
            {target === 'proposal' ? 'Create Proposal' : 'Create Work Order'}
          </button>
        </div>
      </div>
    </div>
  );
}

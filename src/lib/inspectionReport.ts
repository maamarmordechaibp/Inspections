// Branded, print-ready inspection report / certificate generator.
//
// Produces a self-contained HTML document (inline CSS, no external assets) that
// can be either downloaded as an .html file or opened in a new window and saved
// as a PDF via the browser's native "Print → Save as PDF". This keeps the bundle
// dependency-free while giving customers/AHJs a polished, official-looking
// inspection certificate.

import { computeChecklistSummary } from '@/mocks/checklists';

export interface ReportCustomer {
  name: string;
  company?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  phone?: string | null;
  email?: string | null;
  contact_name?: string | null;
}

export interface ReportInspection {
  id: string;
  asset_name: string;
  asset_location: string;
  inspection_type: string;
  scheduled_date: string;
  completed_date: string | null;
  status: string;
  inspector_name: string;
  rating: string | null;
  findings: string | null;
  checklist_data: any[] | null;
  signature_tech?: string | null;
  signature_customer?: string | null;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  check_in_lat?: number | null;
  check_in_lng?: number | null;
  customer: ReportCustomer | null;
}

export interface ReportAsset {
  serial_number?: string | null;
  manufacturer?: string | null;
  install_date?: string | null;
  status?: string | null;
}

const FAIL_REASON_LABELS: Record<string, string> = {
  corroded: 'Corroded', damaged: 'Damaged', missing: 'Missing', leaking: 'Leaking',
  obstructed: 'Obstructed', expired: 'Expired', painted: 'Painted', dirty: 'Dirty / Dust',
  blocked: 'Blocked', low_pressure: 'Low Pressure', high_pressure: 'High Pressure',
  not_functioning: 'Not Functioning', not_accessible: 'Not Accessible', tampered: 'Tampered',
  wrong_type: 'Wrong Type', not_synchronized: 'Not Synchronized', low_volume: 'Low Volume',
  low_battery: 'Low Battery', no_signal: 'No Signal', worn: 'Worn', loose: 'Loose',
  incorrect_mounting: 'Incorrect Mounting',
};

// Map the inspection type to the governing NFPA standard for the compliance statement.
const NFPA_BY_TYPE: { pattern: RegExp; code: string }[] = [
  { pattern: /alarm|notification|monitor|elevator|smoke control/i, code: 'NFPA 72' },
  { pattern: /sprinkler|standpipe|hydrant|backflow|water-based/i, code: 'NFPA 25' },
  { pattern: /extinguisher/i, code: 'NFPA 10' },
  { pattern: /hose/i, code: 'NFPA 1962' },
  { pattern: /pump/i, code: 'NFPA 20' },
  { pattern: /kitchen|suppression|hood/i, code: 'NFPA 17A' },
  { pattern: /emergency light|egress/i, code: 'NFPA 101' },
];

function nfpaStandardFor(type: string): string | null {
  for (const { pattern, code } of NFPA_BY_TYPE) {
    if (pattern.test(type)) return code;
  }
  return null;
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US');
}

function overallResult(inspection: ReportInspection): { label: string; cls: string } {
  const summary = inspection.checklist_data ? computeChecklistSummary(inspection.checklist_data) : null;
  if (summary) {
    if (summary.fail > 0) return { label: 'DEFICIENCIES FOUND', cls: 'stamp-fail' };
    if (summary.needsAttention > 0) return { label: 'CONDITIONAL PASS', cls: 'stamp-attn' };
    if (summary.pass > 0) return { label: 'PASSED', cls: 'stamp-pass' };
  }
  if (inspection.rating === 'pass') return { label: 'PASSED', cls: 'stamp-pass' };
  if (inspection.rating === 'fail') return { label: 'DEFICIENCIES FOUND', cls: 'stamp-fail' };
  if (inspection.rating === 'needs_attention') return { label: 'CONDITIONAL PASS', cls: 'stamp-attn' };
  return { label: 'COMPLETED', cls: 'stamp-pass' };
}

export function buildInspectionReportHtml(inspection: ReportInspection, asset?: ReportAsset | null): string {
  const summary = inspection.checklist_data ? computeChecklistSummary(inspection.checklist_data) : null;
  const now = new Date().toLocaleString('en-US');
  const result = overallResult(inspection);
  const nfpa = nfpaStandardFor(inspection.inspection_type);
  const reportNo = inspection.id.slice(0, 8).toUpperCase();

  const items = (inspection.checklist_data || []).filter(
    (i: any) => i.result?.status && i.result.status !== 'not_applicable',
  );
  const failedItems = items.filter((i: any) => i.result?.status === 'fail' || i.result?.status === 'needs_attention');

  const customerAddress = inspection.customer
    ? [inspection.customer.address, [inspection.customer.city, inspection.customer.state].filter(Boolean).join(', '), inspection.customer.zip]
        .filter(Boolean)
        .join(' · ')
    : '';

  const deficienciesHtml = failedItems.length
    ? `
<div class="section">
  <h2>Deficiencies Requiring Attention <span class="count">${failedItems.length}</span></h2>
  <table>
    <thead><tr><th style="width:42px">#</th><th>Item</th><th>Category</th><th>Result</th><th>Reason</th></tr></thead>
    <tbody>
      ${failedItems.map((item: any) => `
      <tr>
        <td>${esc(item.id)}</td>
        <td>${esc(item.description)}</td>
        <td>${esc(item.category)}</td>
        <td><span class="badge ${item.result?.status === 'fail' ? 'badge-fail' : 'badge-pending'}">${esc((item.result?.status || '').replace(/_/g, ' '))}</span></td>
        <td>${item.result?.fail_reason ? esc(FAIL_REASON_LABELS[item.result.fail_reason] || item.result.fail_reason) : '—'}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`
    : '';

  const checklistHtml = items.length
    ? `
<div class="section avoid-break">
  <h2>Full Inspection Checklist <span class="count">${items.length}</span></h2>
  <table>
    <thead><tr><th style="width:42px">#</th><th>Category</th><th>Item</th><th>Result</th><th>Value</th></tr></thead>
    <tbody>
      ${items.map((item: any) => `
      <tr>
        <td>${esc(item.id)}</td>
        <td>${esc(item.category)}</td>
        <td>${esc(item.description)}</td>
        <td><span class="badge ${
          item.result?.status === 'pass' ? 'badge-pass' : item.result?.status === 'fail' ? 'badge-fail' : 'badge-pending'
        }">${esc((item.result?.status || '').replace(/_/g, ' '))}</span></td>
        <td>${item.result?.value !== undefined && item.result?.value !== null ? `${esc(item.result.value)} ${esc(item.unit || '')}` : '—'}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`
    : '';

  const gpsHtml = inspection.checked_in_at
    ? `
<div class="section">
  <h2>Service Verification</h2>
  <div class="grid2">
    <div class="kv"><span class="k">Checked In</span><span class="v">${esc(fmtDateTime(inspection.checked_in_at))}</span></div>
    <div class="kv"><span class="k">Checked Out</span><span class="v">${esc(fmtDateTime(inspection.checked_out_at))}</span></div>
    ${inspection.check_in_lat != null ? `<div class="kv"><span class="k">On-site GPS</span><span class="v">${esc(inspection.check_in_lat.toFixed(5))}, ${esc((inspection.check_in_lng ?? 0).toFixed(5))}</span></div>` : ''}
  </div>
</div>`
    : '';

  const sigBlock = (label: string, name: string, img?: string | null) => `
  <div class="sig">
    ${img ? `<img src="${esc(img)}" alt="${esc(label)} signature" />` : '<div class="sig-empty"></div>'}
    <div class="sig-line"></div>
    <div class="sig-label">${esc(label)}</div>
    <div class="sig-name">${esc(name)}</div>
  </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>DouseFire Inspection Certificate — ${esc(inspection.asset_name)}</title>
<style>
  @page { size: letter; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #0a1628; margin: 0; background: #fff; }
  .toolbar { position: sticky; top: 0; display: flex; gap: 10px; justify-content: flex-end; padding: 12px 20px; background: #0a1628; }
  .toolbar button { font: inherit; font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 8px; border: 0; cursor: pointer; }
  .toolbar .print { background: #c9a227; color: #0a1628; }
  .toolbar .close { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,.3); }
  .page { max-width: 850px; margin: 0 auto; padding: 32px 36px 48px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #c9a227; padding-bottom: 18px; margin-bottom: 22px; }
  .brand { font-size: 12px; color: #c9a227; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
  .brand .name { font-size: 22px; color: #0a1628; letter-spacing: 0; display: block; margin-top: 2px; }
  .doc-title { text-align: right; }
  .doc-title h1 { font-size: 18px; margin: 0; }
  .doc-title .sub { font-size: 12px; color: #6b7280; margin-top: 4px; }
  .stamp { display: inline-block; margin-top: 8px; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 800; letter-spacing: .5px; border: 2px solid; }
  .stamp-pass { color: #065f46; border-color: #10b981; background: #ecfdf5; }
  .stamp-attn { color: #92400e; border-color: #f59e0b; background: #fffbeb; }
  .stamp-fail { color: #991b1b; border-color: #ef4444; background: #fef2f2; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 24px; margin-bottom: 22px; padding: 18px 20px; background: #f9fafb; border-radius: 10px; }
  .meta-label { font-size: 10px; text-transform: uppercase; color: #9ca3af; font-weight: 700; letter-spacing: .5px; }
  .meta-value { font-size: 14px; color: #0a1628; font-weight: 500; margin-top: 2px; }
  .compliance { font-size: 12.5px; line-height: 1.6; color: #374151; background: #fffdf5; border-left: 3px solid #c9a227; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 22px; }
  .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 24px; }
  .summary-stat { text-align: center; padding: 14px 8px; background: #f9fafb; border-radius: 10px; }
  .summary-stat .num { font-size: 24px; font-weight: 800; }
  .summary-stat .lbl { font-size: 9.5px; color: #6b7280; text-transform: uppercase; letter-spacing: .4px; margin-top: 2px; }
  .section { margin-bottom: 22px; }
  .section h2 { font-size: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin: 0 0 12px; display: flex; align-items: center; gap: 8px; }
  .section h2 .count { font-size: 11px; background: #0a1628; color: #fff; border-radius: 10px; padding: 1px 8px; }
  .finding { font-size: 13px; color: #374151; line-height: 1.7; white-space: pre-wrap; background: #fafafa; padding: 14px 16px; border-radius: 8px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; }
  .kv { display: flex; flex-direction: column; }
  .kv .k { font-size: 10px; text-transform: uppercase; color: #9ca3af; font-weight: 700; }
  .kv .v { font-size: 13px; color: #0a1628; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th { text-align: left; padding: 8px 10px; background: #f3f4f6; font-size: 9.5px; text-transform: uppercase; color: #374151; letter-spacing: .3px; }
  td { padding: 8px 10px; border-bottom: 1px solid #eef0f2; color: #4b5563; vertical-align: top; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; text-transform: capitalize; }
  .badge-pass { background: #d1fae5; color: #065f46; }
  .badge-fail { background: #fee2e2; color: #991b1b; }
  .badge-pending { background: #fef3c7; color: #92400e; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 28px; }
  .sig { text-align: center; }
  .sig img { max-height: 60px; max-width: 100%; object-fit: contain; }
  .sig-empty { height: 60px; }
  .sig-line { border-bottom: 1px solid #0a1628; margin: 4px 0 6px; }
  .sig-label { font-size: 10px; text-transform: uppercase; color: #9ca3af; font-weight: 700; }
  .sig-name { font-size: 13px; font-weight: 600; }
  .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10.5px; color: #9ca3af; display: flex; justify-content: space-between; }
  .avoid-break { page-break-inside: auto; }
  @media print { .toolbar { display: none; } .page { padding: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="toolbar">
  <button class="print" onclick="window.print()">Print / Save as PDF</button>
  <button class="close" onclick="window.close()">Close</button>
</div>
<div class="page">
  <div class="header">
    <div class="brand">DouseFire<span class="name">Inspection Certificate</span></div>
    <div class="doc-title">
      <h1>${esc(inspection.asset_name)}</h1>
      <div class="sub">Report #${esc(reportNo)} · ${esc(inspection.inspection_type)}</div>
      <div class="stamp ${result.cls}">${esc(result.label)}</div>
    </div>
  </div>

  <div class="meta">
    <div><div class="meta-label">Customer</div><div class="meta-value">${esc(inspection.customer?.company || inspection.customer?.name || 'N/A')}</div></div>
    <div><div class="meta-label">Site Contact</div><div class="meta-value">${esc(inspection.customer?.contact_name || inspection.customer?.name || '—')}</div></div>
    <div><div class="meta-label">Service Address</div><div class="meta-value">${esc(customerAddress || inspection.asset_location)}</div></div>
    <div><div class="meta-label">Equipment Location</div><div class="meta-value">${esc(inspection.asset_location)}</div></div>
    <div><div class="meta-label">Inspector</div><div class="meta-value">${esc(inspection.inspector_name)}</div></div>
    <div><div class="meta-label">Inspection Date</div><div class="meta-value">${esc(fmtDate(inspection.completed_date || inspection.scheduled_date))}</div></div>
    ${asset?.serial_number ? `<div><div class="meta-label">Serial Number</div><div class="meta-value">${esc(asset.serial_number)}</div></div>` : ''}
    ${asset?.manufacturer ? `<div><div class="meta-label">Manufacturer</div><div class="meta-value">${esc(asset.manufacturer)}</div></div>` : ''}
  </div>

  <div class="compliance">
    This inspection was performed in accordance with${nfpa ? ` <strong>${esc(nfpa)}</strong> and` : ''} applicable National Fire Protection Association (NFPA) standards and local Authority Having Jurisdiction (AHJ) requirements. This certificate documents the condition of the equipment at the time of inspection.
  </div>

  ${summary ? `
  <div class="summary">
    <div class="summary-stat"><div class="num">${summary.applicable}</div><div class="lbl">Inspected</div></div>
    <div class="summary-stat"><div class="num" style="color:#065f46">${summary.pass}</div><div class="lbl">Passed</div></div>
    <div class="summary-stat"><div class="num" style="color:#991b1b">${summary.fail}</div><div class="lbl">Failed</div></div>
    <div class="summary-stat"><div class="num" style="color:#92400e">${summary.needsAttention}</div><div class="lbl">Need Attn</div></div>
    <div class="summary-stat"><div class="num">${summary.passRate}%</div><div class="lbl">Pass Rate</div></div>
  </div>` : ''}

  <div class="section">
    <h2>Findings &amp; Summary</h2>
    <div class="finding">${esc(inspection.findings || 'No detailed findings recorded. Equipment inspected per standard checklist.')}</div>
  </div>

  ${deficienciesHtml}
  ${checklistHtml}
  ${gpsHtml}

  <div class="signatures">
    ${sigBlock('Inspector Signature', inspection.inspector_name, inspection.signature_tech)}
    ${sigBlock('Customer Acknowledgement', inspection.customer?.contact_name || inspection.customer?.name || '', inspection.signature_customer)}
  </div>

  <div class="footer">
    <span>Generated ${esc(now)}</span>
    <span>DouseFire Inspection Management System · Report #${esc(reportNo)}</span>
  </div>
</div>
</body></html>`;
}

/** Open the report in a new window for printing / saving as PDF. */
export function openInspectionReportPrint(inspection: ReportInspection, asset?: ReportAsset | null): boolean {
  const html = buildInspectionReportHtml(inspection, asset);
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1000');
  if (!win) return false; // popup blocked
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}

/** Download the report as a standalone .html file. */
export function downloadInspectionReportHtml(inspection: ReportInspection, asset?: ReportAsset | null): void {
  const html = buildInspectionReportHtml(inspection, asset);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DouseFire-Inspection-${inspection.id.slice(0, 8)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

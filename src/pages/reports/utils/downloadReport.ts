import { supabase } from '@/lib/supabase';

interface ReportInfo {
  id: string;
  name: string;
  reportType: string;
  format: string;
  generatedBy: string;
  generatedAt: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

async function fetchInspectionsData() {
  const { data } = await supabase
    .from('inspections')
    .select('id, asset_name:assets(name), customer_name:customers(name, company), status, scheduled_date, inspector_name:profiles(full_name), rating, checklist_data, findings')
    .order('scheduled_date', { ascending: false })
    .limit(50);
  return (data || []).map((i: any) => ({
    id: i.id,
    asset_name: i.asset_name?.name || 'Unknown',
    customer_name: i.customer_name?.name || 'N/A',
    customer_company: i.customer_name?.company || '',
    status: i.status,
    scheduled_date: i.scheduled_date,
    inspector_name: i.inspector_name?.full_name || 'Unassigned',
    rating: i.rating,
    checklist_data: i.checklist_data,
    findings: i.findings,
  }));
}

async function fetchComplianceData() {
  const { data } = await supabase
    .from('compliance_standards')
    .select('id, name, category, status, description')
    .order('name');
  return data || [];
}

async function fetchAssetsData() {
  const { data } = await supabase
    .from('assets')
    .select('id, name, type, status, condition, location, last_inspected')
    .order('name');
  return (data || []).map((a: any) => ({
    ...a,
    asset_type: a.type,
  }));
}

function checklistToHTMLTable(checklistData: any[] | null): string {
  if (!checklistData || !Array.isArray(checklistData) || checklistData.length === 0) return '';

  const total = checklistData.length;
  const applicable = checklistData.filter((i: any) => i.result?.status !== 'not_applicable');
  const pass = applicable.filter((i: any) => i.result?.status === 'pass').length;
  const fail = applicable.filter((i: any) => i.result?.status === 'fail').length;
  const attn = applicable.filter((i: any) => i.result?.status === 'needs_attention').length;

  const failReasonLabels: Record<string, string> = {
    corroded: 'Corroded', damaged: 'Damaged', missing: 'Missing', leaking: 'Leaking',
    obstructed: 'Obstructed', expired: 'Expired', painted: 'Painted', dirty: 'Dirty / Dust',
    blocked: 'Blocked', low_pressure: 'Low Pressure', high_pressure: 'High Pressure',
    not_functioning: 'Not Functioning', not_accessible: 'Not Accessible', tampered: 'Tampered',
    wrong_type: 'Wrong Type', not_synchronized: 'Not Synchronized', low_volume: 'Low Volume',
    low_battery: 'Low Battery', no_signal: 'No Signal', worn: 'Worn', loose: 'Loose',
    incorrect_mounting: 'Incorrect Mounting',
  };

  return `
<div class="section">
  <h2>Inspection Checklist Results</h2>
  <div class="summary-box">
    <div class="summary-stat">
      <div class="number">${total}</div>
      <div class="label">Total Items</div>
    </div>
    <div class="summary-stat">
      <div class="number">${pass}</div>
      <div class="label">Passed</div>
    </div>
    <div class="summary-stat">
      <div class="number">${fail}</div>
      <div class="label">Failed</div>
    </div>
    <div class="summary-stat">
      <div class="number">${attn}</div>
      <div class="label">Needs Attention</div>
    </div>
    <div class="summary-stat">
      <div class="number">${applicable.length > 0 ? Math.round((pass / applicable.length) * 100) : 0}%</div>
      <div class="label">Pass Rate</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Category</th>
        <th>Check Item</th>
        <th>Result</th>
        <th>Deficiency</th>
        <th>Value</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      ${checklistData.map((item: any) => `
      <tr>
        <td>${item.id || ''}</td>
        <td>${item.category || ''}</td>
        <td>${item.description || ''}</td>
        <td><span class="badge ${
          item.result?.status === 'pass' ? 'badge-pass' :
          item.result?.status === 'fail' ? 'badge-fail' :
          item.result?.status === 'needs_attention' ? 'badge-pending' :
          ''
        }">${(item.result?.status || 'n/a').replace(/_/g, ' ')}</span></td>
        <td>${item.result?.fail_reason ? (failReasonLabels[item.result.fail_reason] || item.result.fail_reason) : '—'}</td>
        <td>${item.result?.value !== undefined ? `${item.result.value} ${item.unit || ''}` : '—'}</td>
        <td>${item.result?.notes || ''}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;
}

function checklistToCSVRows(checklistData: any[] | null): string {
  if (!checklistData || !Array.isArray(checklistData) || checklistData.length === 0) return '';

  const failReasonLabels: Record<string, string> = {
    corroded: 'Corroded', damaged: 'Damaged', missing: 'Missing', leaking: 'Leaking',
    obstructed: 'Obstructed', expired: 'Expired', painted: 'Painted', dirty: 'Dirty / Dust',
    blocked: 'Blocked', low_pressure: 'Low Pressure', high_pressure: 'High Pressure',
    not_functioning: 'Not Functioning', not_accessible: 'Not Accessible', tampered: 'Tampered',
    wrong_type: 'Wrong Type', not_synchronized: 'Not Synchronized', low_volume: 'Low Volume',
    low_battery: 'Low Battery', no_signal: 'No Signal', worn: 'Worn', loose: 'Loose',
    incorrect_mounting: 'Incorrect Mounting',
  };

  return checklistData.map((item: any) => [
    escapeCSV(item.id || ''),
    escapeCSV(item.category || ''),
    escapeCSV(item.description || ''),
    item.result?.status || 'n/a',
    item.result?.fail_reason ? (failReasonLabels[item.result.fail_reason] || item.result.fail_reason) : '',
    item.result?.value !== undefined ? String(item.result.value) : '',
    item.unit || '',
    escapeCSV(item.result?.notes || ''),
  ].join(',')).join('\n');
}

function generateHTMLReport(report: ReportInfo, data: any[]): string {
  const now = new Date().toLocaleString('en-US');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${report.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1a1a2e; line-height: 1.6; padding: 48px; max-width: 900px; margin: 0 auto; }
  .header { border-bottom: 3px solid #c9a227; padding-bottom: 24px; margin-bottom: 32px; }
  .header h1 { font-size: 28px; color: #1a1a2e; margin-bottom: 4px; }
  .header .subtitle { font-size: 14px; color: #6b7280; }
  .meta { display: flex; gap: 40px; flex-wrap: wrap; margin-bottom: 32px; padding: 20px; background: #f9fafb; border-radius: 8px; }
  .meta-item { display: flex; flex-direction: column; gap: 2px; }
  .meta-label { font-size: 11px; text-transform: uppercase; color: #9ca3af; font-weight: 600; letter-spacing: 0.5px; }
  .meta-value { font-size: 14px; color: #1a1a2e; font-weight: 500; }
  .section { margin-bottom: 28px; page-break-inside: avoid; }
  .section h2 { font-size: 18px; color: #1a1a2e; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
  .section p { font-size: 14px; color: #4b5563; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 10px 12px; background: #f3f4f6; color: #374151; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #d1d5db; }
  td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563; }
  tr:last-child td { border-bottom: none; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
  .badge-pass { background: #d1fae5; color: #065f46; }
  .badge-fail { background: #fee2e2; color: #991b1b; }
  .badge-pending { background: #fef3c7; color: #92400e; }
  .badge-compliant { background: #d1fae5; color: #065f46; }
  .badge-non-compliant { background: #fee2e2; color: #991b1b; }
  .badge-good { background: #d1fae5; color: #065f46; }
  .badge-fair { background: #fef3c7; color: #92400e; }
  .badge-poor { background: #fee2e2; color: #991b1b; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
  .summary-box { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .summary-stat { text-align: center; padding: 16px; background: #f9fafb; border-radius: 8px; }
  .summary-stat .number { font-size: 28px; font-weight: 700; color: #1a1a2e; }
  .summary-stat .label { font-size: 11px; color: #6b7280; text-transform: uppercase; margin-top: 2px; }
  @media print {
    body { padding: 0; }
    .footer { position: fixed; bottom: 0; left: 0; right: 0; }
  }
</style>
</head>
<body>
<div class="header">
  <h1>${report.name}</h1>
  <div class="subtitle">DouseFire Inspection Management System</div>
</div>

<div class="meta">
  <div class="meta-item">
    <span class="meta-label">Report ID</span>
    <span class="meta-value">${report.id.slice(0, 8)}</span>
  </div>
  <div class="meta-item">
    <span class="meta-label">Generated</span>
    <span class="meta-value">${formatDate(report.generatedAt)}</span>
  </div>
  <div class="meta-item">
    <span class="meta-label">Generated By</span>
    <span class="meta-value">${report.generatedBy}</span>
  </div>
  <div class="meta-item">
    <span class="meta-label">Format</span>
    <span class="meta-value">${report.format}</span>
  </div>
  <div class="meta-item">
    <span class="meta-label">Report Type</span>
    <span class="meta-value">${report.reportType.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</span>
  </div>
</div>

${generateHTMLContent(report, data)}

<div class="footer">
  <p>This report was automatically generated by DouseFire Inspection Management System on ${now}.</p>
  <p>DouseFire &mdash; Fire Safety Inspection &amp; Compliance Management</p>
</div>
</body>
</html>`;
}

function generateHTMLContent(report: ReportInfo, data: any[]): string {
  const type = report.reportType;

  if (type === 'inspection' || type === 'monthly-summary') {
    const inspections = data as any[];
    const passed = inspections.filter((i: any) => i.rating === 'pass').length;
    const failed = inspections.filter((i: any) => i.rating === 'fail').length;
    const scheduled = inspections.filter((i: any) => i.status === 'scheduled' || i.status === 'overdue' || i.status === 'in_progress').length;
    const completed = inspections.filter((i: any) => i.status === 'completed').length;

    let checklistSections = '';
    inspections.filter((i: any) => i.checklist_data).forEach((i: any) => {
      checklistSections += `
<div class="section">
  <h2>${i.asset_name} — Checklist Results</h2>
  ${checklistToHTMLTable(i.checklist_data)}
</div>`;
    });

    return `
<div class="section">
  <h2>Executive Summary</h2>
  <p>This report provides an overview of ${inspections.length} fire safety inspections conducted across all monitored assets. The data reflects inspection activities, outcomes, and compliance status.</p>
  <div class="summary-box">
    <div class="summary-stat">
      <div class="number">${inspections.length}</div>
      <div class="label">Total Inspections</div>
    </div>
    <div class="summary-stat">
      <div class="number">${completed}</div>
      <div class="label">Completed</div>
    </div>
    <div class="summary-stat">
      <div class="number">${passed}</div>
      <div class="label">Passed</div>
    </div>
    <div class="summary-stat">
      <div class="number">${failed}</div>
      <div class="label">Failed</div>
    </div>
    <div class="summary-stat">
      <div class="number">${completed > 0 ? Math.round((passed / completed) * 100) : 0}%</div>
      <div class="label">Pass Rate</div>
    </div>
  </div>
</div>

<div class="section">
  <h2>Inspection Details</h2>
  <table>
    <thead>
      <tr>
        <th>Customer</th>
        <th>Asset</th>
        <th>Inspector</th>
        <th>Scheduled Date</th>
        <th>Rating</th>
        <th>Status</th>
        <th>Findings</th>
      </tr>
    </thead>
    <tbody>
      ${inspections.map((i: any) => `
      <tr>
        <td>${i.customer_name || 'N/A'}${i.customer_company ? `<br><span style="font-size:11px;color:#9ca3af">${i.customer_company}</span>` : ''}</td>
        <td>${i.asset_name || 'Unknown'}</td>
        <td>${i.inspector_name || 'Unassigned'}</td>
        <td>${i.scheduled_date ? formatDateShort(i.scheduled_date) : 'N/A'}</td>
        <td><span class="badge ${
          i.rating === 'pass' ? 'badge-pass' :
          i.rating === 'fail' ? 'badge-fail' :
          i.rating === 'needs_attention' ? 'badge-pending' :
          ''
        }">${i.rating || '—'}</span></td>
        <td><span class="badge ${
          i.status === 'completed' ? 'badge-pass' :
          i.status === 'in_progress' ? 'badge-pending' :
          ''
        }">${(i.status || '').replace(/_/g, ' ')}</span></td>
        <td>${i.findings ? escapeCSV(i.findings).substring(0, 100) + (i.findings.length > 100 ? '...' : '') : '—'}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>

${checklistSections}`;
  }

  if (type === 'compliance') {
    const standards = data as any[];
    const compliant = standards.filter((s: any) => s.status === 'compliant').length;
    const nonCompliant = standards.filter((s: any) => s.status === 'non-compliant' || s.status === 'non_compliant').length;

    return `
<div class="section">
  <h2>Compliance Overview</h2>
  <p>This audit report evaluates compliance status across ${standards.length} fire safety standards and regulatory requirements. Each standard is assessed against current operational conditions and inspection results.</p>
  <div class="summary-box">
    <div class="summary-stat">
      <div class="number">${standards.length}</div>
      <div class="label">Total Standards</div>
    </div>
    <div class="summary-stat">
      <div class="number">${compliant}</div>
      <div class="label">Compliant</div>
    </div>
    <div class="summary-stat">
      <div class="number">${nonCompliant}</div>
      <div class="label">Non-Compliant</div>
    </div>
    <div class="summary-stat">
      <div class="number">${standards.length > 0 ? Math.round((compliant / standards.length) * 100) : 0}%</div>
      <div class="label">Compliance Rate</div>
    </div>
  </div>
</div>

<div class="section">
  <h2>Standard-by-Standard Assessment</h2>
  <table>
    <thead>
      <tr>
        <th>Standard</th>
        <th>Category</th>
        <th>Status</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      ${standards.map((s: any) => `
      <tr>
        <td>${s.name || 'Unknown'}</td>
        <td>${s.category || 'General'}</td>
        <td><span class="badge ${s.status === 'compliant' ? 'badge-compliant' : 'badge-non-compliant'}">${s.status || 'Unknown'}</span></td>
        <td>${s.description || 'No description available'}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;
  }

  if (type === 'summary' || type === 'asset-condition') {
    const assets = data as any[];
    const good = assets.filter((a: any) => a.condition === 'good' || a.condition === 'excellent').length;
    const fair = assets.filter((a: any) => a.condition === 'fair').length;
    const poor = assets.filter((a: any) => a.condition === 'poor' || a.condition === 'critical').length;

    return `
<div class="section">
  <h2>Asset Condition Summary</h2>
  <p>This report assesses the current condition of ${assets.length} monitored fire safety assets across all locations. Condition ratings are based on the most recent inspection data and maintenance records.</p>
  <div class="summary-box">
    <div class="summary-stat">
      <div class="number">${assets.length}</div>
      <div class="label">Total Assets</div>
    </div>
    <div class="summary-stat">
      <div class="number">${good}</div>
      <div class="label">Good Condition</div>
    </div>
    <div class="summary-stat">
      <div class="number">${fair}</div>
      <div class="label">Fair Condition</div>
    </div>
    <div class="summary-stat">
      <div class="number">${poor}</div>
      <div class="label">Needs Attention</div>
    </div>
  </div>
</div>

<div class="section">
  <h2>Asset Inventory</h2>
  <table>
    <thead>
      <tr>
        <th>Asset Name</th>
        <th>Type</th>
        <th>Location</th>
        <th>Condition</th>
        <th>Last Inspected</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${assets.map((a: any) => `
      <tr>
        <td>${a.name || 'Unknown'}</td>
        <td>${a.asset_type || 'General'}</td>
        <td>${a.location || 'N/A'}</td>
        <td><span class="badge ${a.condition === 'good' || a.condition === 'excellent' ? 'badge-good' : a.condition === 'fair' ? 'badge-fair' : 'badge-poor'}">${a.condition || 'Unknown'}</span></td>
        <td>${a.last_inspected ? formatDateShort(a.last_inspected) : 'Never'}</td>
        <td>${a.status || 'Unknown'}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;
  }

  return `
<div class="section">
  <h2>Report Content</h2>
  <p>This report was generated from the DouseFire Inspection Management System. It contains a summary of fire safety data relevant to the "${report.name}" report type.</p>
  <p>For detailed information, please refer to the individual inspection records, asset profiles, and compliance documentation available in the system dashboard.</p>
</div>`;
}

function generateCSVReport(report: ReportInfo, data: any[]): string {
  const type = report.reportType;

  if (type === 'inspection' || type === 'monthly-summary') {
    const inspections = data as any[];
    const headers = ['Customer', 'Company', 'Asset Name', 'Inspector', 'Scheduled Date', 'Rating', 'Status', 'Findings'];
    const rows = inspections.map((i: any) => [
      escapeCSV(i.customer_name || 'N/A'),
      escapeCSV(i.customer_company || ''),
      escapeCSV(i.asset_name || 'Unknown'),
      escapeCSV(i.inspector_name || 'Unassigned'),
      i.scheduled_date || '',
      i.rating || '',
      (i.status || '').replace(/_/g, ' '),
      escapeCSV(i.findings || ''),
    ]);

    // Append checklist details
    let checklistCSV = '';
    inspections.filter((i: any) => i.checklist_data).forEach((i: any) => {
      checklistCSV += `\n\n${escapeCSV(i.asset_name)} Checklist Results\n`;
      checklistCSV += 'Item ID,Category,Description,Status,Deficiency,Value,Unit,Notes\n';
      checklistCSV += checklistToCSVRows(i.checklist_data);
    });

    return [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n') + checklistCSV;
  }

  if (type === 'compliance') {
    const headers = ['Standard Name', 'Category', 'Status', 'Description'];
    const rows = (data as any[]).map((s: any) => [
      escapeCSV(s.name || 'Unknown'),
      escapeCSV(s.category || 'General'),
      s.status || 'Unknown',
      escapeCSV(s.description || ''),
    ]);
    return [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
  }

  if (type === 'summary' || type === 'asset-condition') {
    const headers = ['Asset Name', 'Type', 'Location', 'Condition', 'Last Inspected', 'Status'];
    const rows = (data as any[]).map((a: any) => [
      escapeCSV(a.name || 'Unknown'),
      escapeCSV(a.asset_type || 'General'),
      escapeCSV(a.location || ''),
      a.condition || 'Unknown',
      a.last_inspected || '',
      a.status || 'Unknown',
    ]);
    return [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
  }

  return 'No data available for this report type.';
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function triggerDownload(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadReport(report: ReportInfo): Promise<void> {
  let data: any[] = [];

  const type = report.reportType;
  if (type === 'inspection' || type === 'monthly-summary') {
    data = await fetchInspectionsData();
  } else if (type === 'compliance') {
    data = await fetchComplianceData();
  } else if (type === 'summary' || type === 'asset-condition') {
    data = await fetchAssetsData();
  } else {
    data = await fetchInspectionsData();
    if (data.length === 0) data = await fetchAssetsData();
    if (data.length === 0) data = await fetchComplianceData();
  }

  const safeName = report.name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
  const dateStr = formatDateShort(report.generatedAt).replace(/,?\s/g, '-').replace(/-$/, '');
  const fileBaseName = `${safeName}-${dateStr}`;

  if (report.format === 'CSV') {
    const csvContent = generateCSVReport(report, data);
    triggerDownload(csvContent, `${fileBaseName}.csv`, 'text/csv;charset=utf-8');
  } else {
    const htmlContent = generateHTMLReport(report, data);
    triggerDownload(htmlContent, `${fileBaseName}.html`, 'text/html;charset=utf-8');
  }
}
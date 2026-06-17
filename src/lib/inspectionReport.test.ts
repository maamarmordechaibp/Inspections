import { describe, it, expect } from 'vitest';
import { buildInspectionReportHtml, __nfpaStandardFor, type ReportInspection } from '@/lib/inspectionReport';

function baseInspection(overrides: Partial<ReportInspection> = {}): ReportInspection {
  return {
    id: 'abcd1234-0000-0000-0000-000000000000',
    asset_name: 'Lobby Extinguisher #1',
    asset_location: 'Main Lobby',
    inspection_type: 'Fire Extinguisher',
    scheduled_date: '2026-01-10T10:00:00Z',
    completed_date: '2026-01-10T11:00:00Z',
    status: 'completed',
    inspector_name: 'Jane Tech',
    rating: 'pass',
    findings: 'All good.',
    checklist_data: null,
    customer: {
      name: 'Acme Corp',
      company: 'Acme Corporation',
      address: '1 Main St',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
      contact_name: 'John Buyer',
    },
    ...overrides,
  };
}

describe('__nfpaStandardFor', () => {
  it('maps extinguishers to NFPA 10', () => {
    expect(__nfpaStandardFor('Fire Extinguisher')).toBe('NFPA 10');
  });
  it('maps sprinkler/standpipe to NFPA 25', () => {
    expect(__nfpaStandardFor('Sprinkler System')).toBe('NFPA 25');
    expect(__nfpaStandardFor('Standpipe & Hydrant')).toBe('NFPA 25');
  });
  it('maps fire alarm to NFPA 72', () => {
    expect(__nfpaStandardFor('Fire Alarm System')).toBe('NFPA 72');
  });
  it('returns null for an unknown type', () => {
    expect(__nfpaStandardFor('Misc Equipment')).toBeNull();
  });
});

describe('buildInspectionReportHtml', () => {
  it('includes core inspection + customer details', () => {
    const html = buildInspectionReportHtml(baseInspection());
    expect(html).toContain('Lobby Extinguisher #1');
    expect(html).toContain('Acme Corporation');
    expect(html).toContain('Jane Tech');
    expect(html).toContain('ABCD1234'); // report number from id prefix, upper-cased
  });

  it('escapes HTML in user-supplied fields to prevent injection', () => {
    const html = buildInspectionReportHtml(
      baseInspection({ findings: '<script>alert(1)</script>' }),
    );
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('shows a PASSED stamp when checklist has only passes', () => {
    const html = buildInspectionReportHtml(
      baseInspection({
        checklist_data: [
          { id: '1', category: 'c', description: 'd', type: 'pass-fail', result: { status: 'pass' } } as any,
        ],
      }),
    );
    expect(html).toContain('PASSED');
  });

  it('shows DEFICIENCIES FOUND when any item fails', () => {
    const html = buildInspectionReportHtml(
      baseInspection({
        rating: 'fail',
        checklist_data: [
          { id: '1', category: 'c', description: 'd', type: 'pass-fail', result: { status: 'fail' } } as any,
        ],
      }),
    );
    expect(html).toContain('DEFICIENCIES FOUND');
  });

  it('embeds signature images when provided', () => {
    const html = buildInspectionReportHtml(
      baseInspection({ signature_tech: 'data:image/png;base64,AAA' }),
    );
    expect(html).toContain('data:image/png;base64,AAA');
  });

  it('falls back to a default findings line when none recorded', () => {
    const html = buildInspectionReportHtml(baseInspection({ findings: null }));
    expect(html).toContain('No detailed findings recorded');
  });
});

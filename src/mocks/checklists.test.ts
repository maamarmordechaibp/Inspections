import { describe, it, expect } from 'vitest';
import { computeChecklistSummary, type ChecklistItem } from '@/mocks/checklists';

function item(id: string, status: ChecklistItem['result']['status']): ChecklistItem {
  return {
    id,
    category: 'Test',
    description: `Item ${id}`,
    type: 'pass-fail',
    result: { status },
  } as ChecklistItem;
}

describe('computeChecklistSummary', () => {
  it('returns zeros for an empty checklist', () => {
    const s = computeChecklistSummary([]);
    expect(s.total).toBe(0);
    expect(s.applicable).toBe(0);
    expect(s.passRate).toBe(0);
  });

  it('excludes not_applicable items from the applicable count', () => {
    const s = computeChecklistSummary([
      item('1', 'pass'),
      item('2', 'not_applicable'),
      item('3', 'fail'),
    ]);
    expect(s.total).toBe(3);
    expect(s.applicable).toBe(2);
    expect(s.notApplicable).toBe(1);
  });

  it('counts pass / fail / needs_attention correctly', () => {
    const s = computeChecklistSummary([
      item('1', 'pass'),
      item('2', 'pass'),
      item('3', 'fail'),
      item('4', 'needs_attention'),
    ]);
    expect(s.pass).toBe(2);
    expect(s.fail).toBe(1);
    expect(s.needsAttention).toBe(1);
  });

  it('computes pass rate as a rounded percentage of applicable items', () => {
    const s = computeChecklistSummary([
      item('1', 'pass'),
      item('2', 'pass'),
      item('3', 'fail'),
    ]);
    // 2 of 3 applicable = 67%
    expect(s.passRate).toBe(67);
  });

  it('reports 100% when every applicable item passes', () => {
    const s = computeChecklistSummary([
      item('1', 'pass'),
      item('2', 'not_applicable'),
    ]);
    expect(s.passRate).toBe(100);
  });
});

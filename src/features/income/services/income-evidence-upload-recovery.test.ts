import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearPendingIncomeEvidenceUpload,
  getOrCreatePendingIncomeEvidenceUpload,
  listPendingIncomeOperations,
  shouldRetainPendingIncomeEvidenceUpload,
} from './income-operation-recovery';

describe('income evidence upload recovery', () => {
  beforeEach(() => sessionStorage.clear());

  it('reuses the same UUID upload command after an uncertain response', () => {
    const first = getOrCreatePendingIncomeEvidenceUpload('user-1', 'income-1');
    const recovered = getOrCreatePendingIncomeEvidenceUpload('user-1', 'income-1');

    expect(first.idempotencyKey).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(recovered).toEqual(first);
  });

  it('isolates upload commands by user and income, then clears only the resolved upload', () => {
    const operation = getOrCreatePendingIncomeEvidenceUpload('user-1', 'income-1');
    getOrCreatePendingIncomeEvidenceUpload('user-2', 'income-1');
    getOrCreatePendingIncomeEvidenceUpload('user-1', 'income-2');

    clearPendingIncomeEvidenceUpload('user-1', 'income-1');

    expect(listPendingIncomeOperations('user-1', 'income-1')).toEqual([]);
    expect(listPendingIncomeOperations('user-2', 'income-1')).toHaveLength(1);
    expect(listPendingIncomeOperations('user-1', 'income-2')).toHaveLength(1);
    expect(operation.kind).toBe('income.evidence-upload');
  });

  it('retains the same key when a recovery retry is already being processed', () => {
    expect(shouldRetainPendingIncomeEvidenceUpload({
      response: { status: 409, data: { code: 'PAYMENT_EVIDENCE_UPLOAD_IN_PROGRESS' } },
    })).toBe(true);
  });
});

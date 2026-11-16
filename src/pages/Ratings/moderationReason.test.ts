import { describe, expect, it } from 'vitest';
import { MODERATION_REASON_MAX, moderationReasonError } from './moderationReason';

describe('motivo de moderación', () => {
  it('llega hasta 500 caracteres, como el back', () => {
    expect(moderationReasonError('a'.repeat(MODERATION_REASON_MAX))).toBeUndefined();
    expect(moderationReasonError('a'.repeat(MODERATION_REASON_MAX + 1))).toMatch(/500/);
  });
});

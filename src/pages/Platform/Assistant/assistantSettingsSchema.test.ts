import { describe, expect, it } from 'vitest';
import { supportAssistantSchema } from './assistantSettingsSchema';

describe('supportAssistantSchema (las reglas del back)', () => {
  const valid = {
    assistantAiEnabled: false,
    assistantRepliesPerConversation: 10,
    assistantMonthlyTokenLimit: 2_000_000,
  };
  const fails = (over: Record<string, unknown>) => !supportAssistantSchema.safeParse({ ...valid, ...over }).success;

  it('acepta los bordes', () => {
    expect(fails({ assistantRepliesPerConversation: 1 })).toBe(false);
    expect(fails({ assistantRepliesPerConversation: 50 })).toBe(false);
    expect(fails({ assistantMonthlyTokenLimit: 10_000 })).toBe(false);
    expect(fails({ assistantMonthlyTokenLimit: 1_000_000_000 })).toBe(false);
  });

  it('rechaza fuera de rango, decimales y vacío', () => {
    expect(fails({ assistantRepliesPerConversation: 0 })).toBe(true);
    expect(fails({ assistantRepliesPerConversation: 51 })).toBe(true);
    expect(fails({ assistantRepliesPerConversation: 2.5 })).toBe(true);
    expect(fails({ assistantRepliesPerConversation: Number.NaN })).toBe(true);
    expect(fails({ assistantMonthlyTokenLimit: 9_999 })).toBe(true);
    expect(fails({ assistantMonthlyTokenLimit: 1_000_000_001 })).toBe(true);
  });
});

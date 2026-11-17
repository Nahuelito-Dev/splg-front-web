import { describe, expect, it } from 'vitest';
import {
  faqFromUnansweredSchema,
  faqSourceHref,
  parseMentions,
  previewSchema,
  regressionCaseSchema,
  runProgress,
  toRegressionCaseBody,
} from './labRules';

const messages = (result: { success: boolean; error?: { issues: Array<{ message: string }> } }) =>
  result.success ? [] : (result.error?.issues.map((issue) => issue.message) ?? []);

describe('probador', () => {
  it('pide la pregunta y respeta el tope del back (2000)', () => {
    expect(previewSchema.safeParse({ question: '   ' }).success).toBe(false);
    expect(previewSchema.safeParse({ question: 'a'.repeat(2000) }).success).toBe(true);
    expect(previewSchema.safeParse({ question: 'a'.repeat(2001) }).success).toBe(false);
  });
});

describe('pregunta frecuente desde una sin respuesta', () => {
  const valid = { question: '¿Llegan a Garupá?', answer: '', reviewed: true };

  it('sin respuesta vale (queda como borrador)', () => {
    expect(faqFromUnansweredSchema.safeParse(valid).success).toBe(true);
  });

  it('obliga a confirmar que se revisó la pregunta', () => {
    expect(messages(faqFromUnansweredSchema.safeParse({ ...valid, reviewed: false }))).toEqual([
      'Confirmá que revisaste la pregunta',
    ]);
  });

  it('la pregunta con las reglas de la base (5 a 200, sin HTML) y la respuesta sin HTML ni más de 1500', () => {
    expect(faqFromUnansweredSchema.safeParse({ ...valid, question: '¿Ok' }).success).toBe(false);
    expect(faqFromUnansweredSchema.safeParse({ ...valid, question: '<b>¿Llegan?</b>' }).success).toBe(false);
    expect(faqFromUnansweredSchema.safeParse({ ...valid, answer: '<p>Sí</p>' }).success).toBe(false);
    expect(faqFromUnansweredSchema.safeParse({ ...valid, answer: 'a'.repeat(1501) }).success).toBe(false);
    expect(faqFromUnansweredSchema.safeParse({ ...valid, answer: 'a'.repeat(1500) }).success).toBe(true);
  });
});

describe('casos del lote', () => {
  it('las menciones van de a una por renglón, sin vacías ni repetidas', () => {
    expect(parseMentions(' 20 hs \n\nSábado\nsábado\n')).toEqual(['20 hs', 'Sábado']);
  });

  it('la pregunta entre 2 y 500', () => {
    const base = { expected: 'answer' as const, mentions: '' };
    expect(regressionCaseSchema.safeParse({ ...base, question: 'a' }).success).toBe(false);
    expect(regressionCaseSchema.safeParse({ ...base, question: 'ab' }).success).toBe(true);
    expect(regressionCaseSchema.safeParse({ ...base, question: 'a'.repeat(501) }).success).toBe(false);
  });

  it('hasta 10 menciones de hasta 100 caracteres', () => {
    const base = { question: '¿Hasta qué hora?', expected: 'answer' as const };
    const eleven = Array.from({ length: 11 }, (_, i) => `m${i}`).join('\n');
    expect(messages(regressionCaseSchema.safeParse({ ...base, mentions: eleven }))).toEqual(['Hasta 10 menciones']);
    expect(regressionCaseSchema.safeParse({ ...base, mentions: 'a'.repeat(101) }).success).toBe(false);
    expect(regressionCaseSchema.safeParse({ ...base, mentions: 'a'.repeat(100) }).success).toBe(true);
  });

  it('con «que pase a una persona» las menciones no se validan ni se mandan', () => {
    const values = { question: 'Quiero hablar con alguien', expected: 'handoff' as const, mentions: 'x'.repeat(200) };
    expect(regressionCaseSchema.safeParse(values).success).toBe(true);
    expect(toRegressionCaseBody(values)).toEqual({
      question: 'Quiero hablar con alguien',
      expected: 'handoff',
      mustMention: [],
    });
  });

  it('el cuerpo recorta la pregunta y manda las menciones limpias', () => {
    expect(toRegressionCaseBody({ question: ' ¿Hasta qué hora? ', expected: 'answer', mentions: '20\n\n20' })).toEqual({
      question: '¿Hasta qué hora?',
      expected: 'answer',
      mustMention: ['20'],
    });
  });
});

describe('fuentes y avance', () => {
  it('el link de una pregunta frecuente lleva a su base buscada por la pregunta', () => {
    expect(faqSourceHref('company', '¿Hasta qué hora?')).toBe(
      '/settings/assistant?tab=faqs&q=%C2%BFHasta+qu%C3%A9+hora%3F',
    );
    expect(faqSourceHref('platform', 'Choferes')).toBe('/platform/assistant?tab=orixtech&q=Choferes');
  });

  it('el avance cuenta los casos ya juzgados', () => {
    expect(runProgress({ total: 4, results: [{}, {}, {}] as never })).toEqual({ done: 3, percent: 75 });
    expect(runProgress({ total: 0, results: [] })).toEqual({ done: 0, percent: 0 });
  });
});

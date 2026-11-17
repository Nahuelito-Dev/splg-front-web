import { z } from 'zod';
import type { RegressionCase, RegressionRun } from '../../../services/api/types';
import { ANSWER_MAX, faqSchema, hasHtml, textLength } from '../faqRules';

/** Largos del back (`assistant-lab.dto.ts`). */
export const PREVIEW_MAX = 2000;
export const CASE_QUESTION_MIN = 2;
export const CASE_QUESTION_MAX = 500;
export const MENTIONS_MAX = 10;
export const MENTION_MAX = 100;

const lengthBetween = (min: number, max: number) => (value: string) => {
  const length = textLength(value);
  return length >= min && length <= max;
};

export const previewSchema = z.object({
  question: z
    .string()
    .refine((value) => textLength(value) > 0, 'Escribí la pregunta')
    .refine((value) => textLength(value) <= PREVIEW_MAX, `Tiene que tener hasta ${PREVIEW_MAX} caracteres`),
});
export type PreviewValues = z.infer<typeof previewSchema>;

/**
 * La pregunta frecuente que sale de una pregunta sin respuesta: la pregunta con las reglas de la base, la respuesta
 * opcional (sin ella queda como borrador) y la confirmación de que se revisó el texto del cliente.
 */
export const faqFromUnansweredSchema = z.object({
  question: faqSchema.shape.question,
  answer: z
    .string()
    .refine((value) => textLength(value) <= ANSWER_MAX, `Tiene que tener hasta ${ANSWER_MAX} caracteres`)
    .refine((value) => !hasHtml(value), 'No puede llevar HTML: escribí texto plano'),
  reviewed: z.boolean().refine(Boolean, 'Confirmá que revisaste la pregunta'),
});
export type FaqFromUnansweredValues = z.infer<typeof faqFromUnansweredSchema>;

/** Las menciones como se escriben: una por renglón. Se descartan los renglones vacíos y las repetidas. */
export const parseMentions = (text: string): string[] => {
  const seen = new Set<string>();
  const mentions: string[] = [];
  for (const line of text.split('\n')) {
    const mention = line.trim();
    const folded = mention.toLowerCase();
    if (!mention || seen.has(folded)) continue;
    seen.add(folded);
    mentions.push(mention);
  }
  return mentions;
};

export const regressionCaseSchema = z
  .object({
    question: z
      .string()
      .refine((value) => textLength(value) > 0, 'Escribí la pregunta')
      .refine(
        lengthBetween(CASE_QUESTION_MIN, CASE_QUESTION_MAX),
        `Tiene que tener entre ${CASE_QUESTION_MIN} y ${CASE_QUESTION_MAX} caracteres`,
      ),
    expected: z.enum(['answer', 'handoff']),
    mentions: z.string(),
  })
  // Con «que pase a una persona» las menciones no aplican: no se validan y no se mandan (`toRegressionCaseBody`).
  .superRefine(({ expected, mentions }, ctx) => {
    if (expected === 'handoff') return;
    const list = parseMentions(mentions);
    const issue = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['mentions'], message });
    if (list.length > MENTIONS_MAX) issue(`Hasta ${MENTIONS_MAX} menciones`);
    else if (list.some((mention) => textLength(mention) > MENTION_MAX))
      issue(`Cada mención tiene que tener hasta ${MENTION_MAX} caracteres`);
  });
export type RegressionCaseValues = z.infer<typeof regressionCaseSchema>;

export const toRegressionCaseBody = ({ question, expected, mentions }: RegressionCaseValues) => ({
  question: question.trim(),
  expected,
  mustMention: expected === 'answer' ? parseMentions(mentions) : [],
});

export const regressionCaseValues = (item: RegressionCase | null): RegressionCaseValues => ({
  question: item?.question ?? '',
  expected: item?.expected ?? 'answer',
  mentions: item?.mustMention.join('\n') ?? '',
});

/** Dónde se ve una pregunta frecuente usada como fuente: la lista de la base, buscada por su pregunta. */
export const faqSourceHref = (scope: 'company' | 'platform', title: string): string => {
  const params = new URLSearchParams({ tab: scope === 'company' ? 'faqs' : 'orixtech', q: title });
  return `${scope === 'company' ? '/settings/assistant' : '/platform/assistant'}?${params.toString()}`;
};

/** Cuántos casos ya se juzgaron de la corrida y el porcentaje (para la barra). */
export const runProgress = (run: Pick<RegressionRun, 'results' | 'total'>) => {
  const done = run.results.length;
  return { done, percent: run.total > 0 ? Math.round((done / run.total) * 100) : 0 };
};

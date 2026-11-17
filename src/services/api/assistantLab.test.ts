import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('./httpClient', () => ({ http }));

import { env } from '../../config/env';
import {
  createCompanyFaqFromUnanswered,
  createPlatformFaqFromUnanswered,
  createRegressionCase,
  deleteRegressionCase,
  dismissCompanyUnanswered,
  dismissPlatformUnanswered,
  getLastRegressionRun,
  listCompanyUnanswered,
  listPlatformUnanswered,
  listRegressionCases,
  previewCompanyAssistant,
  previewPlatformAssistant,
  runRegression,
  updateRegressionCase,
} from './assistantLab';

const V2 = { baseURL: env.apiUrlV2 };
const GROUP = '3f2a9c0d1b7e4a5f8c6d2e1f0a9b8c7d';

beforeEach(() => {
  Object.values(http).forEach((fn) => fn.mockReset().mockResolvedValue({ data: { ok: true } }));
});

describe('probador (v2)', () => {
  it('empresa con cliente y plataforma sin él', async () => {
    await expect(previewCompanyAssistant({ question: '¿Mi pedido?', customerId: 'c-1' })).resolves.toEqual({
      ok: true,
    });
    expect(http.post).toHaveBeenCalledWith(
      '/company/assistant/preview',
      { question: '¿Mi pedido?', customerId: 'c-1' },
      V2,
    );
    await previewPlatformAssistant({ question: '¿Cómo cargo un chofer?' });
    expect(http.post).toHaveBeenCalledWith('/platform/assistant/preview', { question: '¿Cómo cargo un chofer?' }, V2);
  });
});

describe('preguntas sin respuesta (v2)', () => {
  it('lista con el período sólo si viene, y sin fechas no manda parámetros', async () => {
    await listCompanyUnanswered({ from: '2026-11-01', to: '2026-11-16' });
    expect(http.get).toHaveBeenCalledWith('/company/assistant/unanswered', {
      ...V2,
      params: { from: '2026-11-01', to: '2026-11-16' },
    });
    await listPlatformUnanswered({});
    expect(http.get).toHaveBeenCalledWith('/platform/assistant/unanswered', { ...V2, params: {} });
  });

  it('crea el borrador con la pregunta revisada y descarta, en cada base', async () => {
    await createCompanyFaqFromUnanswered(GROUP, { question: '¿Llegan a Garupá?' });
    expect(http.post).toHaveBeenCalledWith(
      `/company/assistant/unanswered/${GROUP}/faq`,
      { question: '¿Llegan a Garupá?' },
      V2,
    );
    await createPlatformFaqFromUnanswered(GROUP, { question: '¿Cómo cargo un chofer?' });
    expect(http.post).toHaveBeenCalledWith(
      `/platform/assistant/unanswered/${GROUP}/faq`,
      { question: '¿Cómo cargo un chofer?' },
      V2,
    );
    await dismissCompanyUnanswered(GROUP);
    expect(http.post).toHaveBeenCalledWith(`/company/assistant/unanswered/${GROUP}/dismiss`, undefined, V2);
    await dismissPlatformUnanswered(GROUP);
    expect(http.post).toHaveBeenCalledWith(`/platform/assistant/unanswered/${GROUP}/dismiss`, undefined, V2);
  });
});

describe('lote de pruebas (v2)', () => {
  it('ABM de casos, corrida y última corrida', async () => {
    await listRegressionCases();
    expect(http.get).toHaveBeenCalledWith('/company/assistant/regression/cases', V2);
    await createRegressionCase({ question: '¿Hasta qué hora?', expected: 'answer', mustMention: ['20'] });
    expect(http.post).toHaveBeenCalledWith(
      '/company/assistant/regression/cases',
      { question: '¿Hasta qué hora?', expected: 'answer', mustMention: ['20'] },
      V2,
    );
    await updateRegressionCase('c/1', { expected: 'handoff' });
    expect(http.patch).toHaveBeenCalledWith('/company/assistant/regression/cases/c%2F1', { expected: 'handoff' }, V2);
    await deleteRegressionCase('c-1');
    expect(http.delete).toHaveBeenCalledWith('/company/assistant/regression/cases/c-1', V2);
    await runRegression();
    expect(http.post).toHaveBeenCalledWith('/company/assistant/regression/run', undefined, V2);
    await getLastRegressionRun();
    expect(http.get).toHaveBeenCalledWith('/company/assistant/regression/runs/last', V2);
  });
});

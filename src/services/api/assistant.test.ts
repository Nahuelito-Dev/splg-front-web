import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('./httpClient', () => ({ http }));

import { env } from '../../config/env';
import {
  copyCompanyFaqTemplates,
  createPlatformTemplate,
  deletePlatformTemplate,
  listCompanyTemplates,
  listPlatformTemplates,
  updatePlatformTemplate,
  createCompanyFaq,
  createPlatformFaq,
  deleteCompanyFaq,
  deletePlatformFaq,
  listCompanyFaqs,
  listPlatformFaqs,
  updateCompanyFaq,
  updatePlatformFaq,
} from './assistant';

const V2 = { baseURL: env.apiUrlV2 };

beforeEach(() => {
  Object.values(http).forEach((fn) => fn.mockReset().mockResolvedValue({ data: { ok: true } }));
});

describe('base de conocimiento de la empresa (v2)', () => {
  it('lista, crea, edita y da de baja en /v2/company/assistant/faqs', async () => {
    await expect(listCompanyFaqs()).resolves.toEqual({ ok: true });
    expect(http.get).toHaveBeenCalledWith('/company/assistant/faqs', V2);

    await createCompanyFaq({ question: '¿Hola?', answer: 'Sí' });
    expect(http.post).toHaveBeenCalledWith('/company/assistant/faqs', { question: '¿Hola?', answer: 'Sí' }, V2);

    await updateCompanyFaq('f-1', { answer: 'No' });
    expect(http.patch).toHaveBeenCalledWith('/company/assistant/faqs/f-1', { answer: 'No' }, V2);

    await deleteCompanyFaq('f-1');
    expect(http.delete).toHaveBeenCalledWith('/company/assistant/faqs/f-1', V2);
  });

  it('copia las plantillas sin cuerpo', async () => {
    await copyCompanyFaqTemplates();
    expect(http.post).toHaveBeenCalledWith('/company/assistant/faqs/from-templates', undefined, V2);
  });

  it('codifica el id en la URL', async () => {
    await deleteCompanyFaq('a/b');
    expect(http.delete).toHaveBeenCalledWith('/company/assistant/faqs/a%2Fb', V2);
  });
});

describe('base de conocimiento de la plataforma (v2)', () => {
  it('lista, crea, edita y da de baja en /v2/platform/assistant/faqs', async () => {
    await listPlatformFaqs();
    expect(http.get).toHaveBeenCalledWith('/platform/assistant/faqs', V2);

    const body = { question: '¿Hola?', answer: 'Sí', key: 'hola' };
    await createPlatformFaq(body);
    expect(http.post).toHaveBeenCalledWith('/platform/assistant/faqs', body, V2);

    await updatePlatformFaq('p-1', { answer: 'No' });
    expect(http.patch).toHaveBeenCalledWith('/platform/assistant/faqs/p-1', { answer: 'No' }, V2);

    await deletePlatformFaq('p-1');
    expect(http.delete).toHaveBeenCalledWith('/platform/assistant/faqs/p-1', V2);
  });
});

describe('preguntas de ejemplo (v2)', () => {
  it('la empresa ve el catálogo con lo que ya tiene', async () => {
    await listCompanyTemplates();
    expect(http.get).toHaveBeenCalledWith('/company/assistant/templates', V2);
  });

  it('la plataforma lista, crea, edita y da de baja en /v2/platform/assistant/templates', async () => {
    await listPlatformTemplates();
    expect(http.get).toHaveBeenCalledWith('/platform/assistant/templates', V2);

    const body = { question: '¿Hola?', answer: 'Sí', key: 'hola' };
    await createPlatformTemplate(body);
    expect(http.post).toHaveBeenCalledWith('/platform/assistant/templates', body, V2);

    await updatePlatformTemplate('t-1', { answer: 'No' });
    expect(http.patch).toHaveBeenCalledWith('/platform/assistant/templates/t-1', { answer: 'No' }, V2);

    await deletePlatformTemplate('t-1');
    expect(http.delete).toHaveBeenCalledWith('/platform/assistant/templates/t-1', V2);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { createAndPublish, RUN_POLL_MS, runPollInterval } from './assistantLab';

const draft = { id: 'f-9', question: '¿Llegan?', isDraft: true };

describe('crear la pregunta frecuente de un grupo sin respuesta', () => {
  it('sin respuesta queda como borrador y no se hace el PATCH', async () => {
    const create = vi.fn().mockResolvedValue(draft);
    const publish = vi.fn();
    const result = await createAndPublish(create, publish)({ id: 'g-1', question: draft.question, answer: '' });
    expect(create).toHaveBeenCalledWith('g-1', { question: draft.question });
    expect(publish).not.toHaveBeenCalled();
    expect(result).toEqual({ faqId: 'f-9', published: false, existing: false, answerError: null });
  });

  it('con respuesta la guarda con el PATCH de la pregunta creada, y eso la publica', async () => {
    const create = vi.fn().mockResolvedValue(draft);
    const publish = vi.fn().mockResolvedValue({ isDraft: false });
    const result = await createAndPublish(create, publish)({ id: 'g-1', question: draft.question, answer: 'Sí.' });
    expect(publish).toHaveBeenCalledWith('f-9', { answer: 'Sí.' });
    expect(result).toEqual({ faqId: 'f-9', published: true, existing: false, answerError: null });
  });

  it('si la respuesta falla, el borrador ya quedó: se devuelve el error sin tirar', async () => {
    const error = new Error('409');
    const create = vi.fn().mockResolvedValue(draft);
    const publish = vi.fn().mockRejectedValue(error);
    const result = await createAndPublish(create, publish)({ id: 'g-1', question: draft.question, answer: 'Sí.' });
    expect(result).toEqual({ faqId: 'f-9', published: false, existing: false, answerError: error });
  });

  it('si falla la creación, el error sube (no hay nada creado)', async () => {
    const create = vi.fn().mockRejectedValue(new Error('404'));
    const publish = vi.fn();
    await expect(createAndPublish(create, publish)({ id: 'g-1', question: '¿Llegan?', answer: 'Sí.' })).rejects.toThrow(
      '404',
    );
    expect(publish).not.toHaveBeenCalled();
  });

  it('si el grupo ya tenía su pregunta publicada (200), no le pisa la respuesta', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'f-1', question: '¿Llegan?', isDraft: false });
    const publish = vi.fn();
    const result = await createAndPublish(create, publish)({ id: 'g-1', question: '¿Llegan a Garupá?', answer: 'No.' });
    expect(publish).not.toHaveBeenCalled();
    expect(result).toEqual({ faqId: 'f-1', published: true, existing: true, answerError: null });
  });

  it('reintento con el borrador ya creado: no vuelve a crear (daría 404) y lo completa', async () => {
    const create = vi.fn();
    const publish = vi.fn().mockResolvedValue({ isDraft: false });
    const result = await createAndPublish(
      create,
      publish,
    )({ id: 'g-1', question: '¿Llegan?', answer: 'Sí.', draftId: 'f-9' });
    expect(create).not.toHaveBeenCalled();
    expect(publish).toHaveBeenCalledWith('f-9', { question: '¿Llegan?', answer: 'Sí.' });
    expect(result).toEqual({ faqId: 'f-9', published: true, existing: false, answerError: null });
  });

  it('si devuelve un borrador anterior, le guarda la pregunta revisada (con o sin respuesta)', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'f-2', question: 'Mi nombre es Ana, ¿llegan?', isDraft: true });
    const publish = vi.fn().mockResolvedValue({ isDraft: true });
    const result = await createAndPublish(create, publish)({ id: 'g-1', question: '¿Llegan?', answer: '' });
    expect(publish).toHaveBeenCalledWith('f-2', { question: '¿Llegan?' });
    expect(result.published).toBe(false);
  });
});

describe('refresco de la última corrida', () => {
  it('sólo mientras está en curso', () => {
    expect(runPollInterval({ status: 'running' } as never)).toBe(RUN_POLL_MS);
    expect(runPollInterval({ status: 'finished' } as never)).toBe(false);
    expect(runPollInterval({ status: 'failed' } as never)).toBe(false);
    expect(runPollInterval(undefined)).toBe(false);
  });
});

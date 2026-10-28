import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.hoisted(() => vi.fn());
const post = vi.hoisted(() => vi.fn());
vi.mock('./httpClient', () => ({ http: { get, post } }));
vi.mock('./fileSource', () => ({
  resolveFileSource: (url: () => Promise<unknown>) => url(),
}));

import { getAttachmentFile, getAttachmentLink, uploadAttachment } from './attachments';

beforeEach(() => {
  get.mockReset().mockResolvedValue({ data: { url: 'https://firmada', expiresAt: null } });
});

describe('attachments API', () => {
  it('pide inline para ver un adjunto', async () => {
    await getAttachmentFile('att-1', 'inline');
    expect(get).toHaveBeenCalledWith('/attachments/att-1/download', {
      params: { modo: 'url', disposicion: 'inline' },
    });
  });

  it('por defecto pide attachment para descargar', async () => {
    await getAttachmentLink('att-2');
    expect(get).toHaveBeenCalledWith('/attachments/att-2/download', {
      params: { modo: 'url', disposicion: 'attachment' },
    });
  });

  it.each([
    ['acta.docx', '', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['Planilla.XLSX', '', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['cobros.csv', 'text/plain', 'text/csv'],
    ['remito.pdf', 'application/pdf', 'application/pdf'],
  ])('sube %s (tipo «%s») con el tipo que acepta el back: %s', async (name, type, esperado) => {
    post.mockResolvedValue({ data: {} });
    await uploadAttachment('cash_movement', 'm-1', new File(['x'], name, { type }));
    const form = (post.mock.calls[0] as [string, FormData])[1];
    const file = form.get('file') as File;
    expect(file.type).toBe(esperado);
    expect(file.name).toBe(name);
    post.mockReset();
  });
});

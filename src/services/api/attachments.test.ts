import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.hoisted(() => vi.fn());
vi.mock('./httpClient', () => ({ http: { get } }));
vi.mock('./fileSource', () => ({
  resolveFileSource: (url: () => Promise<unknown>) => url(),
}));

import { getAttachmentFile, getAttachmentLink } from './attachments';

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
});

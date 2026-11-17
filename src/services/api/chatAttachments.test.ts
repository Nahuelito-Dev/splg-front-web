import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('./httpClient', () => ({ http }));

import {
  getCompanyChatAttachmentLink,
  getCompanyTicketAttachmentLink,
  getConversationAttachmentLink,
  getPlatformChatAttachmentLink,
  getPlatformTicketAttachmentLink,
  uploadCompanyChatAttachment,
  uploadCompanyTicketAttachment,
  uploadConversationAttachment,
  uploadPlatformChatAttachment,
  uploadPlatformTicketAttachment,
  type ChatAttachmentInput,
} from './chatAttachments';

beforeEach(() => {
  http.get.mockReset().mockResolvedValue({ data: { url: 'https://firmada', expiresAt: null, requiresAuth: false } });
  http.post.mockReset().mockResolvedValue({ data: { id: 'm-1' } });
});

const input = (over: Partial<ChatAttachmentInput> = {}): ChatAttachmentInput => ({
  file: new File(['x'], 'remito.pdf', { type: 'application/pdf' }),
  clientMessageId: '6f1c2f43-3a5e-4b8e-9d55-0a0d7e1c2b11',
  ...over,
});

const sent = () => http.post.mock.calls[0] as [string, FormData, { baseURL: string; headers: object }];

describe('adjuntos del chat: subida', () => {
  it.each([
    ['la bandeja', uploadConversationAttachment, '/conversations/c%201/attachments'],
    ['el chat de la empresa', uploadCompanyChatAttachment, '/company/platform-chat/c%201/attachments'],
    ['un ticket de la empresa', uploadCompanyTicketAttachment, '/company/tickets/c%201/attachments'],
    ['un chat de la plataforma', uploadPlatformChatAttachment, '/platform/chats/c%201/attachments'],
    ['un ticket de la plataforma', uploadPlatformTicketAttachment, '/platform/tickets/c%201/attachments'],
  ])('%s: multipart con el archivo, el clientMessageId y el epígrafe recortado', async (_, upload, path) => {
    await upload('c 1', input({ caption: '  El de octubre ' }));
    const [url, form, config] = sent();
    expect(url).toBe(path);
    expect(config.baseURL).toMatch(/\/v2$/);
    expect(config.headers).toEqual({ 'Content-Type': 'multipart/form-data' });
    expect((form.get('file') as File).name).toBe('remito.pdf');
    expect(form.get('clientMessageId')).toBe('6f1c2f43-3a5e-4b8e-9d55-0a0d7e1c2b11');
    expect(form.get('caption')).toBe('El de octubre');
  });

  it('sin epígrafe (o en blanco) no manda el campo', async () => {
    await uploadConversationAttachment('c-1', input({ caption: '   ' }));
    expect(sent()[1].has('caption')).toBe(false);
  });

  it('un CSV sin tipo del navegador viaja como text/csv', async () => {
    await uploadCompanyChatAttachment('c-1', input({ file: new File(['a;b'], 'datos.csv', { type: '' }) }));
    expect((sent()[1].get('file') as File).type).toBe('text/csv');
  });

  it('informa el avance en porcentaje', async () => {
    const progress = vi.fn();
    await uploadConversationAttachment('c-1', input(), progress);
    const { onUploadProgress } = sent()[2] as unknown as {
      onUploadProgress: (e: { loaded: number; total?: number }) => void;
    };
    onUploadProgress({ loaded: 50, total: 200 });
    onUploadProgress({ loaded: 10 });
    expect(progress.mock.calls).toEqual([[25]]);
  });
});

describe('adjuntos del chat: enlace', () => {
  it.each([
    ['la bandeja', getConversationAttachmentLink, '/conversations/c-1/messages/m-1/attachment'],
    ['el chat de la empresa', getCompanyChatAttachmentLink, '/company/platform-chat/c-1/messages/m-1/attachment'],
    ['un ticket de la empresa', getCompanyTicketAttachmentLink, '/company/tickets/c-1/messages/m-1/attachment'],
    ['un chat de la plataforma', getPlatformChatAttachmentLink, '/platform/chats/c-1/messages/m-1/attachment'],
    ['un ticket de la plataforma', getPlatformTicketAttachmentLink, '/platform/tickets/c-1/messages/m-1/attachment'],
  ])('%s: GET …/messages/:messageId/attachment', async (_, getLink, path) => {
    await expect(getLink('c-1', 'm-1')).resolves.toEqual({
      url: 'https://firmada',
      expiresAt: null,
      requiresAuth: false,
    });
    expect(http.get).toHaveBeenCalledWith(
      path,
      expect.objectContaining({ baseURL: expect.stringMatching(/\/v2$/) as string }),
    );
  });
});

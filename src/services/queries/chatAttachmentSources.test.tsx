import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { msg, newQueryClient } from '../../test/chatFixtures';
import { inboxMsg } from '../../test/inboxFixtures';
import type { ThreadBinding } from './chatSources';

const api = vi.hoisted(() => ({
  uploadConversationAttachment: vi.fn(),
  getConversationAttachmentLink: vi.fn(),
  uploadCompanyChatAttachment: vi.fn(),
  getCompanyChatAttachmentLink: vi.fn(),
  uploadCompanyTicketAttachment: vi.fn(),
  getCompanyTicketAttachmentLink: vi.fn(),
  uploadPlatformChatAttachment: vi.fn(),
  getPlatformChatAttachmentLink: vi.fn(),
  uploadPlatformTicketAttachment: vi.fn(),
  getPlatformTicketAttachmentLink: vi.fn(),
}));
vi.mock('../api/chatAttachments', () => api);

import {
  useCompanyArchivedChatThread,
  useCompanyChatThread,
  useCompanyTicketThread,
  usePlatformChatThread,
  usePlatformTicketThread,
} from './chatSources';
import { useInboxThread } from './inbox';

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset().mockResolvedValue(msg(1)));
});

const bind = (hook: () => ThreadBinding) => {
  const client = newQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(hook, { wrapper }).result.current.source.attachments;
};

const file = new File(['x'], 'remito.pdf', { type: 'application/pdf' });
const input = { file, clientMessageId: 'id-1' };

describe('cada hilo sube y pide los adjuntos por su endpoint', () => {
  it.each([
    [
      'bandeja',
      () => useInboxThread('conv-1'),
      'inbox',
      api.uploadConversationAttachment,
      api.getConversationAttachmentLink,
      'conv-1',
    ],
    [
      'chat de la empresa',
      () => useCompanyChatThread('c-1', () => undefined),
      'support',
      api.uploadCompanyChatAttachment,
      api.getCompanyChatAttachmentLink,
      'c-1',
    ],
    [
      'ticket de la empresa',
      () => useCompanyTicketThread('t-1', 'c-t1'),
      'support',
      api.uploadCompanyTicketAttachment,
      api.getCompanyTicketAttachmentLink,
      't-1',
    ],
    [
      'chat de la plataforma',
      () => usePlatformChatThread('c-9'),
      'support',
      api.uploadPlatformChatAttachment,
      api.getPlatformChatAttachmentLink,
      'c-9',
    ],
    [
      'ticket de la plataforma',
      () => usePlatformTicketThread('t-9', 'c-t9'),
      'support',
      api.uploadPlatformTicketAttachment,
      api.getPlatformTicketAttachmentLink,
      't-9',
    ],
  ] as const)('%s', async (_, hook, channel, upload, link, ownerId) => {
    const attachments = bind(hook);
    expect(attachments?.channel).toBe(channel);
    const progress = vi.fn();
    await attachments?.upload?.(input, progress);
    expect(upload).toHaveBeenCalledWith(ownerId, input, progress);
    await attachments?.link('m-7');
    expect(link).toHaveBeenCalledWith(ownerId, 'm-7');
  });

  it('la bandeja lleva el mensaje subido a la forma común del hilo', async () => {
    api.uploadConversationAttachment.mockResolvedValue(inboxMsg(4, { internal: false, kind: 'attachment' }));
    const message = await bind(() => useInboxThread('conv-1'))?.upload?.(input);
    expect(message?.visibility).toBe('all');
  });

  it('sin chat abierto no hay adjuntos (el primer mensaje es de texto); un chat cerrado sólo los muestra', async () => {
    expect(bind(() => useCompanyChatThread(null, () => undefined))).toBeUndefined();
    const archived = bind(() => useCompanyArchivedChatThread('c-old'));
    expect(archived?.upload).toBeUndefined();
    await archived?.link('m-1');
    expect(api.getCompanyChatAttachmentLink).toHaveBeenCalledWith('c-old', 'm-1');
  });
});

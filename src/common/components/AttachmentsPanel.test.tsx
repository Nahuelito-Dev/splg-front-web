import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  listAttachments: vi.fn(),
  uploadAttachment: vi.fn(),
  getAttachmentFile: vi.fn(),
  deleteAttachment: vi.fn(),
}));
vi.mock('../../services/api/attachments', () => api);
const notify = vi.hoisted(() => ({ error: vi.fn<[Error], void>(), success: vi.fn<[string], void>() }));
const confirm = vi.hoisted(() => vi.fn<[unknown], Promise<boolean>>());
vi.mock('../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notify,
  confirm,
}));
const openFileSource = vi.hoisted(() => vi.fn(() => true));
vi.mock('../../utils/fileSource', () => ({ openFileSource, saveFileSource: vi.fn() }));

import { AttachmentsPanel } from './AttachmentsPanel';

const SIGNED = 'https://s3/x?X-Amz-Signature=a';
const item = {
  attachmentId: 'a-1',
  ownerType: 'employee',
  ownerId: 'e-1',
  label: 'DNI frente',
  originalName: 'dni.png',
  mimeType: 'image/png',
  sizeBytes: 2048,
  uploadedByUserId: 'u-1',
  uploadedAt: '2026-10-11T12:00:00.000Z',
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderPanel = (canWrite = true) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AttachmentsPanel ownerType="employee" ownerId="e-1" canWrite={canWrite} />
    </QueryClientProvider>,
  );

describe('AttachmentsPanel', () => {
  it('lista los adjuntos del dueño y abre el archivo por su URL firmada', async () => {
    api.listAttachments.mockResolvedValue([item]);
    api.getAttachmentFile.mockResolvedValue({ kind: 'url', url: SIGNED, expiresAt: null });
    renderPanel();
    expect(await screen.findByText('DNI frente')).toBeInTheDocument();
    expect(api.listAttachments).toHaveBeenCalledWith('employee', 'e-1');
    fireEvent.click(screen.getByRole('button', { name: 'Ver DNI frente' }));
    await waitFor(() => expect(openFileSource).toHaveBeenCalledWith(expect.objectContaining({ url: SIGNED })));
    expect(api.getAttachmentFile).toHaveBeenCalledWith('a-1');
    // La URL firmada se usa para abrir el archivo, pero nunca se escribe en la pantalla ni en un enlace.
    expect(document.body.innerHTML).not.toContain('X-Amz-Signature');
  });

  it('sube con la etiqueta y rechaza un tipo no permitido sin llamar al back', async () => {
    api.listAttachments.mockResolvedValue([]);
    api.uploadAttachment.mockResolvedValue(item);
    renderPanel();
    await screen.findByText(/Sin adjuntos/);
    const input = screen.getByLabelText('Elegir el archivo a adjuntar');
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.txt', { type: 'text/plain' })] } });
    expect(api.uploadAttachment).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Etiqueta (opcional)'), { target: { value: 'Licencia' } });
    const pdf = new File(['x'], 'lic.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [pdf] } });
    await waitFor(() => expect(api.uploadAttachment).toHaveBeenCalledWith('employee', 'e-1', pdf, 'Licencia'));
  });

  it('borra sólo si se confirma', async () => {
    api.listAttachments.mockResolvedValue([item]);
    api.deleteAttachment.mockResolvedValue(undefined);
    confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderPanel();
    const button = await screen.findByRole('button', { name: 'Borrar DNI frente' });
    fireEvent.click(button);
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(api.deleteAttachment).not.toHaveBeenCalled();
    fireEvent.click(button);
    await waitFor(() => expect(api.deleteAttachment).toHaveBeenCalledWith('a-1'));
  });

  it('mientras se borra, el botón de borrar queda deshabilitado', async () => {
    api.listAttachments.mockResolvedValue([item]);
    api.deleteAttachment.mockReturnValue(new Promise(() => undefined));
    confirm.mockResolvedValue(true);
    renderPanel();
    const button = await screen.findByRole('button', { name: 'Borrar DNI frente' });
    fireEvent.click(button);
    await waitFor(() => expect(button).toBeDisabled());
    fireEvent.click(button);
    expect(api.deleteAttachment).toHaveBeenCalledTimes(1);
  });

  it('sin permiso de escritura no ofrece subir ni borrar', async () => {
    api.listAttachments.mockResolvedValue([item]);
    renderPanel(false);
    await screen.findByText('DNI frente');
    expect(screen.queryByText('Adjuntar archivo')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Borrar DNI frente' })).not.toBeInTheDocument();
  });
});

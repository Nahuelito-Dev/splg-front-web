import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api/errors';
import { PdfButton } from './PdfButton';

const api = vi.hoisted(() => ({ downloadPdf: vi.fn() }));
const files = vi.hoisted(() => ({ openFileSource: vi.fn(), saveFileSource: vi.fn() }));
const notifications = vi.hoisted(() => ({ notify: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('../../services/api/pdfs', () => ({ downloadPdf: api.downloadPdf }));
vi.mock('../../utils/fileSource', () => files);
vi.mock('../../utils/notifications', () => notifications);

afterEach(cleanup);
beforeEach(() => {
  api.downloadPdf.mockReset().mockResolvedValue({ blob: new Blob(['%PDF']), filename: 'rendicion-s1.pdf' });
  files.openFileSource.mockReset().mockReturnValue(true);
  files.saveFileSource.mockReset();
  notifications.notify.error.mockReset();
});

const renderButton = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PdfButton request={{ kind: 'settlement', settlementId: 's1' }} />
    </QueryClientProvider>,
  );

describe('PdfButton', () => {
  it('pide el PDF y lo abre en una pestaña', async () => {
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    await waitFor(() => expect(files.openFileSource).toHaveBeenCalledTimes(1));
    expect(api.downloadPdf).toHaveBeenCalledWith({ kind: 'settlement', settlementId: 's1' });
    expect(files.saveFileSource).not.toHaveBeenCalled();
  });

  it('si el navegador bloquea la pestaña, lo baja con su nombre', async () => {
    files.openFileSource.mockReturnValue(false);
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    await waitFor(() => expect(files.saveFileSource).toHaveBeenCalledWith(expect.anything(), 'rendicion-s1.pdf'));
  });

  it('avisa el error real del back y no abre nada', async () => {
    const error = new ApiError(409, ['El pedido no está pagado']);
    api.downloadPdf.mockRejectedValue(error);
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    await waitFor(() => expect(notifications.notify.error).toHaveBeenCalledWith(error));
    expect(files.openFileSource).not.toHaveBeenCalled();
  });

  it('mientras descarga queda ocupado y un segundo clic no pide otra vez', async () => {
    api.downloadPdf.mockReturnValue(new Promise(() => undefined));
    renderButton();
    const button = screen.getByRole('button', { name: 'PDF' });
    fireEvent.click(button);
    await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'));
    fireEvent.click(button);
    expect(api.downloadPdf).toHaveBeenCalledTimes(1);
  });
});

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Claim } from '../../../services/api/types';

const photo = vi.hoisted(() => vi.fn());
const mutate = vi.hoisted(() => vi.fn<[{ id: string; file: File }, { onError: (error: unknown) => void }], void>());
const notify = vi.hoisted(() => ({ error: vi.fn<[Error], void>(), success: vi.fn<[string], void>() }));
const lastError = () => notify.error.mock.calls.at(-1)?.[0].message;
vi.mock('../../../services/queries/claims', () => ({
  useClaimPhoto: () => photo() as unknown,
  useUploadClaimPhoto: () => ({ mutate, isPending: false }),
}));
vi.mock('../../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notify,
}));

import { ApiError } from '../../../services/api/errors';
import { ClaimPhoto } from './ClaimPhoto';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const claim = (status: string) => ({ claim_id: 'c-1', status }) as unknown as Claim;
const withPhoto = () =>
  photo.mockReturnValue({ data: { kind: 'url', url: 'https://s3.example/f.jpg', expiresAt: null }, isPending: false });
const noPhoto = () => photo.mockReturnValue({ data: null, isPending: false });
const pick = (file: File) =>
  fireEvent.change(screen.getByLabelText('Elegir la foto del reclamo'), { target: { files: [file] } });

describe('ClaimPhoto', () => {
  it('muestra la miniatura, la amplía y ofrece reemplazar', () => {
    withPhoto();
    render(<ClaimPhoto claim={claim('pending')} open canOperate />);
    expect(screen.getByAltText('Evidencia del reclamo')).toHaveAttribute('src', 'https://s3.example/f.jpg');
    expect(screen.getByRole('button', { name: 'Reemplazar foto' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar la foto del reclamo' }));
    expect(screen.getByAltText('Evidencia del reclamo, ampliada')).toBeInTheDocument();
  });

  it('si falla la carga muestra el error con reintento y no ofrece subir', () => {
    const refetch = vi.fn();
    photo.mockReturnValue({ data: undefined, isPending: false, error: new ApiError(404, ['No existe']), refetch });
    render(<ClaimPhoto claim={claim('pending')} open canOperate />);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar la foto');
    expect(screen.queryByText('Sin foto adjunta')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Subir foto' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('si la URL firmada venció (la imagen falla) vuelve a pedirla una vez y después muestra el error', () => {
    const refetch = vi.fn();
    photo.mockReturnValue({
      data: { kind: 'url', url: 'https://s3.example/f.jpg', expiresAt: null },
      isPending: false,
      refetch,
    });
    render(<ClaimPhoto claim={claim('pending')} open canOperate />);
    fireEvent.error(screen.getByAltText('Evidencia del reclamo'));
    expect(refetch).toHaveBeenCalledOnce();
    fireEvent.error(screen.getByAltText('Evidencia del reclamo'));
    expect(refetch).toHaveBeenCalledOnce();
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar la foto');
  });

  it('sin foto dice "Sin foto adjunta" y ofrece subir', () => {
    noPhoto();
    render(<ClaimPhoto claim={claim('pending')} open canOperate />);
    expect(screen.getByText('Sin foto adjunta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subir foto' })).toBeEnabled();
  });

  it('con el reclamo cerrado deshabilita la subida y explica por qué', () => {
    withPhoto();
    render(<ClaimPhoto claim={claim('resolved')} open canOperate />);
    expect(screen.getByRole('button', { name: 'Reemplazar foto' })).toBeDisabled();
    expect(screen.getByText('Reabrí el reclamo para subir o cambiar la foto.')).toBeInTheDocument();
  });

  it('valida tipo y tamaño en el cliente: un PDF no llega al back', () => {
    noPhoto();
    render(<ClaimPhoto claim={claim('pending')} open canOperate />);
    pick(new File(['x'], 'a.pdf', { type: 'application/pdf' }));
    expect(mutate).not.toHaveBeenCalled();
    expect(lastError()).toContain('JPG');
  });

  it('una foto válida se sube con el id del reclamo y un 409 se muestra legible', () => {
    noPhoto();
    render(<ClaimPhoto claim={claim('pending')} open canOperate />);
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    pick(file);
    expect(mutate).toHaveBeenCalledWith({ id: 'c-1', file }, expect.anything());
    mutate.mock.calls[0]?.[1].onError(new ApiError(409, ['Conflict']));
    expect(lastError()).toContain('cerrado');
  });
});

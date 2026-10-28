import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ getPhotoLink: vi.fn(), uploadPhoto: vi.fn(), removePhoto: vi.fn() }));
vi.mock('../../../services/api/photos', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...api,
}));
const notify = vi.hoisted(() => ({ error: vi.fn<[Error], void>(), success: vi.fn<[string], void>() }));
const confirm = vi.hoisted(() => vi.fn<[unknown], Promise<boolean>>());
vi.mock('../../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notify,
  confirm,
}));

import { ApiError } from '../../../services/api/errors';
import { EntityPhoto, LinkedEntityPhoto } from './EntityPhoto';

const SIGNED = 'https://splg.s3.amazonaws.com/cars/a.jpg?X-Amz-Signature=abc';
const lastError = () => notify.error.mock.calls.at(-1)?.[0].message;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderPhoto = (props: Partial<Parameters<typeof EntityPhoto>[0]> = {}) => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  render(
    <QueryClientProvider client={client}>
      <EntityPhoto kind="car" id="c-1" url={SIGNED} subject="del vehículo" canEdit {...props} />
    </QueryClientProvider>,
  );
  return { invalidate };
};
const pick = (file: File) =>
  fireEvent.change(screen.getByLabelText('Elegir la foto del vehículo'), { target: { files: [file] } });
const image = (type = 'image/png', size = 100) => new File([new Uint8Array(size)], 'f.png', { type });

describe('EntityPhoto', () => {
  it('muestra la URL firmada que manda el back y la amplía', () => {
    renderPhoto();
    expect(screen.getByAltText('Foto del vehículo')).toHaveAttribute('src', SIGNED);
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar la foto del vehículo' }));
    expect(screen.getByAltText('Foto del vehículo, ampliada')).toHaveAttribute('src', SIGNED);
  });

  it('si la URL venció (la imagen falla) pide otra una vez y la muestra; nunca arma una URL propia', async () => {
    const renewed = 'https://splg.s3.amazonaws.com/cars/a.jpg?X-Amz-Signature=nueva';
    api.getPhotoLink.mockResolvedValue({ url: renewed, expiresAt: null, requiresAuth: false });
    renderPhoto();
    fireEvent.error(screen.getByAltText('Foto del vehículo'));
    await waitFor(() => expect(screen.getByAltText('Foto del vehículo')).toHaveAttribute('src', renewed));
    expect(api.getPhotoLink).toHaveBeenCalledWith('car', 'c-1');
  });

  it('si no se puede renovar, muestra el error con reintento', async () => {
    api.getPhotoLink.mockImplementation(() => Promise.reject(new Error('boom')));
    renderPhoto();
    fireEvent.error(screen.getByAltText('Foto del vehículo'));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la foto');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
  });

  it('sin foto invita a arrastrar o elegir, con formatos y tamaño máximo', () => {
    renderPhoto({ url: null });
    expect(screen.getByRole('button', { name: /Arrastrá una imagen o hacé clic para elegirla/ })).toBeEnabled();
    expect(screen.getByText('JPG, PNG o WEBP, hasta 5 MB')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quitar' })).not.toBeInTheDocument();
  });

  it('sin foto y sin permiso dice "Sin foto" y no ofrece nada', () => {
    renderPhoto({ url: null, canEdit: false });
    expect(screen.getByText('Sin foto')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('sin permiso la foto se ve pero no se ofrece ninguna acción', () => {
    renderPhoto({ canEdit: false });
    expect(screen.getByAltText('Foto del vehículo')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reemplazar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quitar' })).not.toBeInTheDocument();
  });

  it('bloqueada: los botones explican el motivo y no suben nada', () => {
    renderPhoto({ blockedReason: 'La incidencia ya no está abierta' });
    const replace = screen.getByRole('button', { name: 'Reemplazar' });
    expect(replace).toHaveAttribute('aria-disabled', 'true');
    expect(replace).toHaveAttribute('title', 'La incidencia ya no está abierta');
    fireEvent.click(replace);
    expect(api.uploadPhoto).not.toHaveBeenCalled();
  });

  it('el reclamo ofrece reemplazar y quitar la foto', () => {
    renderPhoto({ kind: 'claim', subject: 'del reclamo' });
    expect(screen.getByRole('button', { name: 'Reemplazar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quitar' })).toBeInTheDocument();
  });

  it('sube y refresca las listas que muestran la foto', async () => {
    api.uploadPhoto.mockResolvedValue(undefined);
    const { invalidate } = renderPhoto();
    const file = image();
    pick(file);
    await waitFor(() => expect(notify.success).toHaveBeenCalledWith('Foto reemplazada'));
    expect(api.uploadPhoto).toHaveBeenCalledWith('car', 'c-1', file);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['cars'] });
  });

  it('valida tipo y tamaño antes de subir y deja el error visible junto a la foto', () => {
    renderPhoto();
    pick(image('application/pdf'));
    expect(lastError()).toBe('La foto tiene que ser JPG, PNG o WEBP.');
    expect(screen.getByRole('alert')).toHaveTextContent('La foto tiene que ser JPG, PNG o WEBP.');
    pick(image('image/png', 6 * 1024 * 1024));
    expect(lastError()).toBe('La foto no puede superar los 5 MB.');
    expect(screen.getByRole('alert')).toHaveTextContent('La foto no puede superar los 5 MB.');
    expect(api.uploadPhoto).not.toHaveBeenCalled();
  });

  it('una imagen soltada sobre la foto la reemplaza; varias juntas se rechazan', async () => {
    api.uploadPhoto.mockResolvedValue(undefined);
    renderPhoto();
    const target = screen.getByAltText('Foto del vehículo').closest('[data-dragging], .group') as HTMLElement;
    fireEvent.dragOver(target);
    expect(target).toHaveAttribute('data-dragging');
    fireEvent.drop(target, { dataTransfer: { files: [image(), image()] } });
    expect(screen.getByRole('alert')).toHaveTextContent('Soltá un solo archivo por vez.');
    expect(api.uploadPhoto).not.toHaveBeenCalled();
    const file = image();
    fireEvent.drop(target, { dataTransfer: { files: [file] } });
    await waitFor(() => expect(api.uploadPhoto).toHaveBeenCalledWith('car', 'c-1', file));
  });

  it('un error del back queda visible junto a la foto', async () => {
    api.uploadPhoto.mockImplementation(() => Promise.reject(new ApiError(413, ['Archivo demasiado grande'])));
    renderPhoto();
    pick(image());
    expect(await screen.findByRole('alert')).toHaveTextContent('Archivo demasiado grande');
  });

  it.each([
    [409, 'La incidencia no está abierta'],
    [413, 'Archivo demasiado grande'],
    [415, 'Tipo de archivo no permitido'],
  ])('un %s del back se muestra con el mensaje del back', async (status, message) => {
    api.uploadPhoto.mockImplementation(() => Promise.reject(new ApiError(status, [message])));
    renderPhoto();
    pick(image());
    await waitFor(() => expect(lastError()).toBe(message));
  });

  it('quitar pide confirmación y, si se cancela, no borra nada', async () => {
    confirm.mockResolvedValue(false);
    renderPhoto();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(confirm.mock.calls[0][0]).toMatchObject({ danger: true });
    expect(api.removePhoto).not.toHaveBeenCalled();
  });

  it('quitar confirmado borra la foto y refresca', async () => {
    confirm.mockResolvedValue(true);
    api.removePhoto.mockResolvedValue(undefined);
    const { invalidate } = renderPhoto();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }));
    await waitFor(() => expect(notify.success).toHaveBeenCalledWith('Foto quitada'));
    expect(api.removePhoto).toHaveBeenCalledWith('car', 'c-1');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['cars'] });
  });

  it('con una URL externa vieja la muestra pero sólo ofrece reemplazar (el back no borra la externa)', () => {
    renderPhoto({ url: 'https://cdn.example/logo.png' });
    expect(screen.getByAltText('Foto del vehículo')).toHaveAttribute('src', 'https://cdn.example/logo.png');
    expect(screen.getByRole('button', { name: 'Reemplazar' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Quitar' })).not.toBeInTheDocument();
  });

  it('si la renovación dice que no hay foto muestra "Sin foto" y oculta Reemplazar y Quitar', async () => {
    api.getPhotoLink.mockResolvedValue({ url: null, expiresAt: null, requiresAuth: false });
    renderPhoto();
    fireEvent.error(screen.getByAltText('Foto del vehículo'));
    expect(await screen.findByRole('button', { name: /Arrastrá una imagen/ })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reemplazar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quitar' })).not.toBeInTheDocument();
  });

  it('si la renovación devuelve la misma URL (externa muerta) marca error en vez de dejar la imagen rota', async () => {
    const dead = 'https://cdn.example/muerta.png';
    api.getPhotoLink.mockResolvedValue({ url: dead, expiresAt: null, requiresAuth: false });
    renderPhoto({ url: dead });
    fireEvent.error(screen.getByAltText('Foto del vehículo'));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la foto');
    expect(screen.queryByRole('button', { name: 'Ampliar la foto del vehículo' })).not.toBeInTheDocument();
  });

  it('mientras sube se deshabilitan subir y quitar', async () => {
    api.uploadPhoto.mockImplementation(() => new Promise(() => undefined));
    renderPhoto();
    pick(image());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Quitar' })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Reemplazar' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Subiendo…');
  });

  it('mientras quita se deshabilitan subir y quitar', async () => {
    confirm.mockResolvedValue(true);
    api.removePhoto.mockImplementation(() => new Promise(() => undefined));
    renderPhoto();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reemplazar' })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Quitar' })).toBeDisabled();
  });

  it('la miniatura y la ampliada que fallan juntas no duplican la renovación', async () => {
    const renewed = 'https://splg.s3.amazonaws.com/cars/a.jpg?X-Amz-Signature=nueva';
    api.getPhotoLink.mockResolvedValue({ url: renewed, expiresAt: null, requiresAuth: false });
    renderPhoto();
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar la foto del vehículo' }));
    fireEvent.error(screen.getByAltText('Foto del vehículo'));
    fireEvent.error(screen.getByAltText('Foto del vehículo, ampliada'));
    await waitFor(() => expect(screen.getByAltText('Foto del vehículo')).toHaveAttribute('src', renewed));
    expect(api.getPhotoLink).toHaveBeenCalledTimes(1);
  });
});

describe('LinkedEntityPhoto (la ficha no trae la foto)', () => {
  const renderLinked = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    render(
      <QueryClientProvider client={client}>
        <LinkedEntityPhoto kind="supplier" id="s-1" subject="del proveedor" canEdit />
      </QueryClientProvider>,
    );
    return invalidate;
  };

  it('pide el enlace de la foto y la muestra', async () => {
    api.getPhotoLink.mockResolvedValue({ url: SIGNED, expiresAt: null, requiresAuth: false });
    renderLinked();
    expect(await screen.findByAltText('Foto del proveedor')).toHaveAttribute('src', SIGNED);
    expect(api.getPhotoLink).toHaveBeenCalledWith('supplier', 's-1');
  });

  it('sin foto ofrece subirla, y al subir vuelve a pedir el enlace', async () => {
    api.getPhotoLink.mockResolvedValue({ url: null, expiresAt: null, requiresAuth: false });
    api.uploadPhoto.mockResolvedValue(undefined);
    const invalidate = renderLinked();
    await waitFor(() => expect(api.getPhotoLink).toHaveBeenCalled());
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'f.jpg', { type: 'image/jpeg' })] } });
    await waitFor(() => expect(api.uploadPhoto).toHaveBeenCalledWith('supplier', 's-1', expect.any(File)));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['photoLink', 'supplier'] }));
  });
});

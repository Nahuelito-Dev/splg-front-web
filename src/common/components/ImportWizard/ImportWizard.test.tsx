import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../services/api/errors';
import type { ImportConfirm, ImportPreview } from '../../../services/api/types';

const api = vi.hoisted(() => ({ downloadImportTemplate: vi.fn(), previewImport: vi.fn(), confirmImport: vi.fn() }));
const files = vi.hoisted(() => ({ saveFileSource: vi.fn() }));
vi.mock('../../../services/api/imports', () => api);
vi.mock('../../../utils/fileSource', () => files);
vi.mock('../../../utils/notifications', () => ({ notify: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { ImportWizard } from './ImportWizard';

const PENDING: ImportPreview = {
  importId: 'i-1',
  recurso: 'precios',
  estado: 'pending',
  total: 2,
  validas: 2,
  errores: [],
  vistaPrevia: [
    { fila: 2, datos: { type: '10 kg', previousPrice: 12000, price: 13000 } },
    { fila: 3, datos: { type: '15 kg', previousPrice: 18000, price: 19500 } },
  ],
  venceEn: '2026-10-29T12:00:00.000Z',
};
const WITH_ERRORS: ImportPreview = {
  ...PENDING,
  estado: 'with_errors',
  validas: 1,
  errores: [{ fila: 3, columna: 'Tipo', mensaje: 'No existe una garrafa con ese tipo en tu distribuidora' }],
  vistaPrevia: [PENDING.vistaPrevia[0]],
};
const CONFIRMED: ImportConfirm = {
  importId: 'i-1',
  recurso: 'precios',
  estado: 'confirmed',
  total: 2,
  resumen: { actualizadas: 2, sinCambio: 0 },
  confirmadaEn: '2026-10-28T15:00:00.000Z',
  yaConfirmada: false,
};

const onClose = vi.fn();
const renderWizard = (resource: 'precios' | 'proveedores' = 'precios') =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <ImportWizard open resource={resource} onClose={onClose} />
    </QueryClientProvider>,
  );
const pickFile = () =>
  fireEvent.change(screen.getByLabelText('Archivo a importar'), {
    target: { files: [new File(['Tipo;Precio nuevo'], 'precios.csv', { type: 'text/csv' })] },
  });
const confirmButton = () => screen.getByRole('button', { name: 'Confirmar importación' });

beforeEach(() => {
  api.previewImport.mockReset().mockResolvedValue(PENDING);
  api.confirmImport.mockReset().mockResolvedValue(CONFIRMED);
  api.downloadImportTemplate
    .mockReset()
    .mockResolvedValue({ blob: new Blob(['x']), filename: 'plantilla-precios.csv' });
  files.saveFileSource.mockReset();
  onClose.mockReset();
});
afterEach(cleanup);

describe('ImportWizard', () => {
  it('paso 1: baja la plantilla en el formato elegido', async () => {
    renderWizard();
    fireEvent.click(screen.getByRole('button', { name: 'Plantilla Excel' }));
    await waitFor(() => expect(files.saveFileSource).toHaveBeenCalled());
    expect(api.downloadImportTemplate).toHaveBeenCalledWith('precios', 'xlsx');
    expect(files.saveFileSource).toHaveBeenCalledWith(
      { kind: 'blob', blob: expect.any(Blob) as Blob },
      'plantilla-precios.csv',
    );
  });

  it('paso 2: muestra contadores y, para precios, el anterior y el nuevo', async () => {
    renderWizard();
    pickFile();
    expect(await screen.findByText('Filas válidas')).toBeInTheDocument();
    expect(api.previewImport).toHaveBeenCalledWith('precios', expect.any(File));
    const table = screen.getByRole('region', { name: 'Tabla de filas válidas' });
    expect(within(table).getByText('Precio anterior')).toBeInTheDocument();
    expect(within(table).getByText('Precio nuevo')).toBeInTheDocument();
    expect(within(table).getByText(/12\.000/)).toBeInTheDocument();
    expect(within(table).getByText(/13\.000/)).toBeInTheDocument();
    expect(screen.queryByText('Errores del archivo')).not.toBeInTheDocument();
    expect(confirmButton()).not.toHaveAttribute('aria-disabled');
  });

  it('con errores muestra fila, columna y mensaje del back, y no deja confirmar', async () => {
    api.previewImport.mockResolvedValue(WITH_ERRORS);
    renderWizard();
    pickFile();
    const errors = await screen.findByRole('region', { name: 'Tabla de errores' });
    expect(within(errors).getByText('3')).toBeInTheDocument();
    expect(within(errors).getByText('Tipo')).toBeInTheDocument();
    expect(within(errors).getByText('No existe una garrafa con ese tipo en tu distribuidora')).toBeInTheDocument();
    expect(screen.getByText(/Corregí el archivo y volvé a subirlo/)).toBeInTheDocument();
    expect(confirmButton()).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(confirmButton());
    expect(api.confirmImport).not.toHaveBeenCalled();
  });

  it('«Elegir otro archivo» vuelve al paso 1', async () => {
    api.previewImport.mockResolvedValue(WITH_ERRORS);
    renderWizard();
    pickFile();
    await screen.findByText('Errores del archivo');
    fireEvent.click(screen.getByRole('button', { name: 'Elegir otro archivo' }));
    expect(screen.getByLabelText('Archivo a importar')).toBeInTheDocument();
  });

  it('un rechazo del back en la subida se muestra tal cual', async () => {
    api.previewImport.mockRejectedValue(new ApiError(400, ['El encabezado no coincide con la plantilla']));
    renderWizard();
    pickFile();
    expect(await screen.findByRole('alert')).toHaveTextContent('El encabezado no coincide con la plantilla');
    expect(screen.getByLabelText('Archivo a importar')).toBeInTheDocument();
  });

  it('paso 3: confirma y muestra el resumen', async () => {
    renderWizard();
    pickFile();
    await screen.findByText('Filas válidas');
    fireEvent.click(confirmButton());
    expect(await screen.findByText('Importación confirmada')).toBeInTheDocument();
    expect(api.confirmImport).toHaveBeenCalledWith('i-1');
    expect(screen.getByText('Precios actualizados')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Listo' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('si ya estaba confirmada lo dice', async () => {
    api.confirmImport.mockResolvedValue({ ...CONFIRMED, yaConfirmada: true });
    renderWizard();
    pickFile();
    await screen.findByText('Filas válidas');
    fireEvent.click(confirmButton());
    expect(await screen.findByText('Esta importación ya estaba confirmada')).toBeInTheDocument();
  });

  it('410: la vista previa venció y se explica sin mostrar éxito', async () => {
    api.confirmImport.mockRejectedValue(new ApiError(410, ['La vista previa venció: volvé a subir el archivo']));
    renderWizard();
    pickFile();
    await screen.findByText('Filas válidas');
    fireEvent.click(confirmButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('La vista previa venció: volvé a subir el archivo');
    expect(screen.queryByText('Importación confirmada')).not.toBeInTheDocument();
    // Reintentar con la misma vista previa daría otro 410: queda bloqueado hasta subir de nuevo.
    expect(confirmButton()).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Elegir otro archivo' }));
    expect(screen.getByLabelText('Archivo a importar')).toBeInTheDocument();
  });

  it.each([
    ['de otro tipo', new File(['x'], 'datos.zip'), 'El archivo tiene que ser CSV o Excel (.xlsx)'],
    ['de más de 5 MB', new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'precios.csv'), 'El archivo supera los 5 MB'],
  ])('un archivo %s no se sube', async (_caso, archivo, mensaje) => {
    renderWizard();
    fireEvent.change(screen.getByLabelText('Archivo a importar'), { target: { files: [archivo] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(mensaje);
    expect(api.previewImport).not.toHaveBeenCalled();
  });
});

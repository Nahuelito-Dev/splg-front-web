import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  listCarDocuments: vi.fn(),
  uploadCarDocument: vi.fn(),
  uploadPatentPhoto: vi.fn(),
  getCarDocumentFile: vi.fn(),
  deleteCarDocument: vi.fn(),
}));
vi.mock('../../../services/api/carDocuments', () => api);
const notify = vi.hoisted(() => ({
  error: vi.fn<[unknown], void>(),
  success: vi.fn<[string], void>(),
  warn: vi.fn<[string], void>(),
}));
// `confirm` y `saveFileSource` quedan reales: la baja pasa por el diálogo del panel y la descarga por el enlace temporal.
vi.mock('../../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notify,
}));

import { ConfirmDialogHost } from '../../../common/components/ui';
import { formatDay } from '../../../utils/format';
import { CarScannedDocuments } from './CarScannedDocuments';

const attachment = {
  attachmentId: 'att-1',
  ownerType: 'car_document',
  ownerId: 'car-1',
  label: 'Documento de seguro del vehículo',
  originalName: 'poliza.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  uploadedByUserId: 'u-1',
  uploadedAt: '2026-11-13T12:00:00.000Z',
};
const patentAttachment = {
  ...attachment,
  attachmentId: 'att-2',
  label: 'Foto de patente',
  originalName: 'patente.jpg',
  mimeType: 'image/jpeg',
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

const renderCard = (canWrite = true) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CarScannedDocuments carId="car-1" canWrite={canWrite} />
      <ConfirmDialogHost />
    </QueryClientProvider>,
  );

const chooseFile = (file: File) =>
  fireEvent.change(screen.getByLabelText('Elegir el documento del vehículo'), { target: { files: [file] } });
const submit = () => fireEvent.click(screen.getByRole('button', { name: /Subir y escanear/ }));
const pdf = () => new File(['%PDF-1.4'], 'poliza.pdf', { type: 'application/pdf' });
const jpg = () => new File(['jpg'], 'patente.jpg', { type: 'image/jpeg' });

describe('CarScannedDocuments', () => {
  it('sube un documento con su tipo y muestra lo leído por el lector', async () => {
    api.listCarDocuments.mockResolvedValue([]);
    api.uploadCarDocument.mockResolvedValue({
      attachment,
      scan: {
        available: true,
        data: {
          detectedType: 'poliza',
          expirationDate: '2027-03-31',
          issueDate: '2026-03-31',
          insurer: 'La Segunda',
          policyNumber: 'POL-998',
          patent: 'AB123CD',
          warnings: ['La fecha de emisión se ve borrosa'],
        },
      },
    });
    renderCard();
    await screen.findByText(/Todavía no se subió ningún documento/);
    fireEvent.change(screen.getByLabelText('Qué vas a subir'), { target: { value: 'vtv' } });
    chooseFile(pdf());
    submit();
    expect(await screen.findByText('La Segunda')).toBeInTheDocument();
    expect(api.uploadCarDocument).toHaveBeenCalledWith('car-1', 'vtv', expect.any(File), expect.any(String));
    expect(screen.getByText(formatDay('2027-03-31'))).toBeInTheDocument();
    expect(screen.getByText('POL-998')).toBeInTheDocument();
    expect(screen.getByText('La fecha de emisión se ve borrosa')).toBeInTheDocument();
    expect(api.listCarDocuments).toHaveBeenCalledTimes(2);
  });

  it('avisa que no hay lector cuando el back no escanea', async () => {
    api.listCarDocuments.mockResolvedValue([]);
    api.uploadCarDocument.mockResolvedValue({ attachment, scan: { available: false, data: null } });
    renderCard();
    await screen.findByText(/Todavía no se subió/);
    chooseFile(pdf());
    submit();
    expect(await screen.findByText(/No hay lector de documentos configurado/)).toBeInTheDocument();
  });

  it('la foto de la patente va a su endpoint y muestra la advertencia si no coincide', async () => {
    api.listCarDocuments.mockResolvedValue([]);
    api.uploadPatentPhoto.mockResolvedValue({
      attachment: patentAttachment,
      scan: { available: true, data: null },
      mismatch: true,
      expectedPatent: 'AB123CD',
      readPatent: 'AC456EF',
      warning: 'La patente de la foto (AC456EF) no coincide con la del vehículo (AB123CD)',
    });
    renderCard();
    await screen.findByText(/Todavía no se subió/);
    fireEvent.change(screen.getByLabelText('Qué vas a subir'), { target: { value: 'patente' } });
    chooseFile(jpg());
    submit();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('La patente no coincide');
    expect(alert).toHaveTextContent('Leída: AC456EF · Del vehículo: AB123CD');
    expect(api.uploadPatentPhoto).toHaveBeenCalledWith('car-1', expect.any(File), expect.any(String));
    expect(api.uploadCarDocument).not.toHaveBeenCalled();
    expect(notify.warn).toHaveBeenCalled();
  });

  it('con la patente que coincide no muestra advertencia', async () => {
    api.listCarDocuments.mockResolvedValue([]);
    api.uploadPatentPhoto.mockResolvedValue({
      attachment: patentAttachment,
      scan: { available: true, data: null },
      mismatch: false,
      expectedPatent: 'AB123CD',
      readPatent: 'AB123CD',
      warning: null,
    });
    renderCard();
    await screen.findByText(/Todavía no se subió/);
    fireEvent.change(screen.getByLabelText('Qué vas a subir'), { target: { value: 'patente' } });
    chooseFile(jpg());
    submit();
    expect(await screen.findByText(/La patente leída coincide/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('valida tipo y tamaño antes de subir: no llama al back', async () => {
    api.listCarDocuments.mockResolvedValue([]);
    renderCard();
    await screen.findByText(/Todavía no se subió/);
    submit();
    expect(await screen.findByText('Elegí el archivo a subir.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Qué vas a subir'), { target: { value: 'patente' } });
    chooseFile(pdf());
    expect(await screen.findByText('La foto de la patente tiene que ser JPG, PNG o WEBP.')).toBeInTheDocument();
    const big = new File(['x'], 'grande.pdf', { type: 'application/pdf' });
    Object.defineProperty(big, 'size', { value: 10 * 1024 * 1024 + 1 });
    fireEvent.change(screen.getByLabelText('Qué vas a subir'), { target: { value: 'seguro' } });
    chooseFile(big);
    expect(await screen.findByText('El archivo no puede superar los 10 MB.')).toBeInTheDocument();
    submit();
    await waitFor(() => expect(screen.getByText('El archivo no puede superar los 10 MB.')).toBeInTheDocument());
    expect(api.uploadCarDocument).not.toHaveBeenCalled();
    expect(api.uploadPatentPhoto).not.toHaveBeenCalled();
  });

  it('muestra el mensaje del back cuando rechaza la subida', async () => {
    api.listCarDocuments.mockResolvedValue([]);
    const headers = new AxiosHeaders();
    api.uploadCarDocument.mockRejectedValue(
      new AxiosError('415', 'ERR_BAD_REQUEST', { headers }, undefined, {
        status: 415,
        statusText: 'Unsupported Media Type',
        headers: {},
        config: { headers },
        data: { statusCode: 415, message: 'El contenido del archivo no coincide con el tipo declarado' },
      }),
    );
    renderCard();
    await screen.findByText(/Todavía no se subió/);
    chooseFile(pdf());
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El contenido del archivo no coincide con el tipo declarado',
    );
    expect(screen.queryByLabelText('Resultado del escaneo')).not.toBeInTheDocument();
  });

  it('descarga por la URL firmada con un enlace temporal que se saca del documento', async () => {
    const SIGNED = 'https://s3/x?X-Amz-Signature=a';
    api.listCarDocuments.mockResolvedValue([attachment]);
    api.getCarDocumentFile.mockResolvedValue({ kind: 'url', url: SIGNED, expiresAt: null });
    const clicked: { href: string; download: string; connected: boolean }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({ href: this.href, download: this.download, connected: this.isConnected });
    });
    renderCard();
    const name = 'Documento de seguro del vehículo';
    await screen.findByText(name);
    fireEvent.click(screen.getByRole('button', { name: `Descargar ${name}` }));
    await waitFor(() => expect(clicked).toHaveLength(1));
    expect(api.getCarDocumentFile).toHaveBeenCalledWith('car-1', 'att-1');
    expect(clicked[0]).toEqual({ href: SIGNED, download: 'poliza.pdf', connected: true });
    // El enlace sólo vive mientras se hace el clic: después la URL firmada no queda en la página.
    expect(document.querySelector(`a[href="${SIGNED}"]`)).toBeNull();
    expect(document.body.innerHTML).not.toContain('X-Amz-Signature');
  });

  it('da de baja sólo tras confirmar en el diálogo del panel', async () => {
    api.listCarDocuments.mockResolvedValue([attachment]);
    api.deleteCarDocument.mockResolvedValue(undefined);
    renderCard();
    const name = 'Documento de seguro del vehículo';
    await screen.findByText(name);

    fireEvent.click(screen.getByRole('button', { name: `Dar de baja ${name}` }));
    const dialog = await screen.findByRole('dialog', { name: '¿Dar de baja el documento?' });
    expect(api.deleteCarDocument).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.deleteCarDocument).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: `Dar de baja ${name}` }));
    const again = await screen.findByRole('dialog', { name: '¿Dar de baja el documento?' });
    expect(api.deleteCarDocument).not.toHaveBeenCalled();
    fireEvent.click(within(again).getByRole('button', { name: 'Dar de baja' }));
    await waitFor(() => expect(api.deleteCarDocument).toHaveBeenCalledWith('car-1', 'att-1'));
    expect(notify.success).toHaveBeenCalledWith('Documento dado de baja');
  });

  it('el error de una subida anterior se limpia al elegir otro archivo o cambiar el tipo', async () => {
    api.listCarDocuments.mockResolvedValue([]);
    api.uploadCarDocument.mockRejectedValue(new Error('El contenido del archivo no coincide con el tipo declarado'));
    renderCard();
    await screen.findByText(/Todavía no se subió/);
    chooseFile(pdf());
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('no coincide con el tipo declarado');
    chooseFile(new File(['%PDF-1.4'], 'otra.pdf', { type: 'application/pdf' }));
    await waitFor(() => expect(screen.queryByText(/no coincide con el tipo declarado/)).not.toBeInTheDocument());

    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('no coincide con el tipo declarado');
    fireEvent.change(screen.getByLabelText('Qué vas a subir'), { target: { value: 'vtv' } });
    await waitFor(() => expect(screen.queryByText(/no coincide con el tipo declarado/)).not.toBeInTheDocument());
  });

  it('sin permiso de escritura sólo lista y descarga', async () => {
    api.listCarDocuments.mockResolvedValue([attachment]);
    renderCard(false);
    await screen.findByText('Documento de seguro del vehículo');
    expect(screen.queryByRole('button', { name: /Subir y escanear/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Dar de baja/ })).not.toBeInTheDocument();
  });

  it('si el listado falla, muestra el error con reintento', async () => {
    api.listCarDocuments.mockRejectedValue(new Error('Vehículo no encontrado'));
    renderCard();
    expect(await screen.findByText('No se pudieron cargar los documentos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});

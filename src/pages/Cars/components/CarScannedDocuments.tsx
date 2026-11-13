import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, CheckCircle2, Download, Info, ScanLine, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  DetailList,
  DropZone,
  EmptyState,
  Form,
  FormError,
  FormSelect,
  IconButton,
  LoadingState,
} from '../../../common/components/ui';
import type { UploadedCarDocument, UploadedPatentPhoto } from '../../../services/api/carDocuments';
import { errorMessage } from '../../../services/api/errors';
import {
  useCarDocumentFile,
  useDeleteCarDocument,
  useScannedCarDocuments,
  useUploadCarDocument,
  useUploadPatentPhoto,
} from '../../../services/queries/carDocuments';
import { saveFileSource } from '../../../utils/fileSource';
import { formatDateTime, formatDay } from '../../../utils/format';
import { confirm, notify } from '../../../utils/notifications';
import { fleetAttachmentIcon, formatAttachmentSize } from '../../Fleet/components/fleetAttachmentIcon';
import {
  CAR_DOCUMENT_KIND_OPTIONS,
  acceptedTypesFor,
  carDocumentSchema,
  limitsTextFor,
  type CarDocumentForm,
} from '../carDocumentSchema';

interface Props {
  carId: string;
  canWrite: boolean;
  /** Por qué no se puede subir ni dar de baja ahora (el título de los controles apagados). */
  writeHint?: string;
}

type LastUpload = { kind: 'document'; result: UploadedCarDocument } | { kind: 'patent'; result: UploadedPatentPhoto };

const Notice = ({ tone, children }: { tone: 'danger' | 'warn' | 'info' | 'success'; children: ReactNode }) => {
  const styles = {
    danger: 'bg-danger-soft text-danger',
    warn: 'bg-warn-soft text-warn',
    info: 'bg-info-soft text-info',
    success: 'bg-success-soft text-success',
  }[tone];
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'info' ? Info : AlertTriangle;
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm ${styles}`}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
};

/** Lo que devolvió el back al subir: lo leído por el lector y, en la foto de la patente, si coincide. */
const ScanResult = ({ upload }: { upload: LastUpload }) => {
  const { scan } = upload.result;
  const patent = upload.kind === 'patent' ? upload.result : null;
  return (
    <div className="space-y-2 rounded-xl border border-outline p-3" aria-label="Resultado del escaneo">
      <p className="text-sm font-semibold text-ink">
        {upload.result.attachment.label || upload.result.attachment.originalName}: subido
      </p>
      {patent?.mismatch && (
        <Notice tone="danger">
          <p className="font-semibold">La patente no coincide</p>
          <p>{patent.warning ?? 'La patente leída en la foto no coincide con la del vehículo.'}</p>
          <p className="mt-1 font-mono">
            Leída: {patent.readPatent ?? '—'} · Del vehículo: {patent.expectedPatent ?? '—'}
          </p>
        </Notice>
      )}
      {patent && !patent.mismatch && patent.readPatent && (
        <Notice tone="success">
          La patente leída coincide con la del vehículo (<span className="font-mono">{patent.readPatent}</span>).
        </Notice>
      )}
      {!scan.available && <Notice tone="info">No hay lector de documentos configurado: cargá los datos a mano.</Notice>}
      {scan.warning && <Notice tone="warn">{scan.warning}</Notice>}
      {scan.data && !patent && (
        <DetailList
          items={[
            { label: 'Vencimiento', value: formatDay(scan.data.expirationDate) },
            { label: 'Emisión', value: formatDay(scan.data.issueDate) },
            { label: 'Aseguradora', value: scan.data.insurer ?? '—' },
            { label: 'Póliza', value: scan.data.policyNumber ?? '—', mono: true },
            { label: 'Patente leída', value: scan.data.patent ?? '—', mono: true },
          ]}
        />
      )}
      {scan.data && scan.data.warnings.length > 0 && (
        <Notice tone="warn">
          <ul className="list-inside list-disc">
            {scan.data.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Notice>
      )}
    </div>
  );
};

/**
 * Documentos del vehículo que se escanean al subirlos (seguro, VTV, cédula, otro) y la foto de la patente. Lo leído
 * se muestra tal cual lo devuelve el back; la lista baja cada archivo por URL firmada y da de baja con confirmación.
 */
export const CarScannedDocuments = ({ carId, canWrite, writeHint }: Props) => {
  const methods = useForm<CarDocumentForm>({
    resolver: zodResolver(carDocumentSchema),
    defaultValues: { kind: 'seguro', file: null },
  });
  const kind = methods.watch('kind');
  const file = methods.watch('file');
  const [lastUpload, setLastUpload] = useState<LastUpload | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data: documents = [], isPending, error, refetch } = useScannedCarDocuments(carId);
  const uploadDocument = useUploadCarDocument(carId);
  const uploadPatent = useUploadPatentPhoto(carId);
  const remove = useDeleteCarDocument(carId);
  const fileSource = useCarDocumentFile(carId);
  const uploading = uploadDocument.isPending || uploadPatent.isPending;
  const uploadError = uploadDocument.error ?? uploadPatent.error;

  /** El error de la subida anterior ya no corresponde cuando cambia el archivo o el tipo elegido. */
  const clearUploadError = () => {
    uploadDocument.reset();
    uploadPatent.reset();
  };

  const onSubmit = (values: CarDocumentForm) => {
    if (!values.file) return;
    clearUploadError();
    setLastUpload(null);
    const done = () => methods.setValue('file', null);
    if (values.kind === 'patente') {
      uploadPatent.mutate(values.file, {
        onSuccess: (result) => {
          setLastUpload({ kind: 'patent', result });
          done();
          if (result.mismatch) notify.warn('La patente leída no coincide con la del vehículo');
          else notify.success('Foto de la patente subida');
        },
      });
      return;
    }
    uploadDocument.mutate(
      { documentType: values.kind, file: values.file },
      {
        onSuccess: (result) => {
          setLastUpload({ kind: 'document', result });
          done();
          notify.success('Documento subido');
        },
      },
    );
  };

  const handleDownload = (attachmentId: string, filename: string) => {
    setPendingId(attachmentId);
    fileSource.mutate(attachmentId, {
      onSuccess: (source) => saveFileSource(source, filename),
      onError: notify.error,
      onSettled: () => setPendingId(null),
    });
  };

  const handleDelete = async (attachmentId: string, name: string) => {
    const confirmed = await confirm({
      title: '¿Dar de baja el documento?',
      text: `Baja lógica: «${name}» deja de listarse en la ficha del vehículo. No se borra.`,
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (!confirmed) return;
    remove.mutate(attachmentId, {
      onSuccess: () => {
        notify.success('Documento dado de baja');
        if (lastUpload?.result.attachment.attachmentId === attachmentId) setLastUpload(null);
      },
      onError: notify.error,
    });
  };

  return (
    <Card className="p-4 sm:p-6">
      <CardHeader
        title="Documentos escaneados"
        subtitle="Seguro, VTV, cédula y foto de la patente. Al subirlos se leen solos."
        icon={<ScanLine />}
      />

      {canWrite && (
        <Form methods={methods} onSubmit={onSubmit} className="space-y-3">
          <FormSelect
            name="kind"
            label="Qué vas a subir"
            options={CAR_DOCUMENT_KIND_OPTIONS}
            onChange={() => {
              clearUploadError();
              if (methods.getValues('file')) void methods.trigger('file');
            }}
            className="sm:max-w-xs"
          />
          <DropZone
            inputLabel="Elegir el documento del vehículo"
            accept={acceptedTypesFor(kind)}
            onFile={(chosen) => {
              clearUploadError();
              methods.setValue('file', chosen, { shouldValidate: true });
            }}
            onReject={(message) => notify.error(new Error(message))}
            hint={limitsTextFor(kind)}
            loading={uploading}
            blockedReason={writeHint}
            title={file ? `Elegido: ${file.name}` : undefined}
          />
          <FormError name="file" />
          {uploadError && <Notice tone="danger">{errorMessage(uploadError)}</Notice>}
          <div className="flex justify-end">
            <Button type="submit" size="sm" icon={<ScanLine />} loading={uploading} disabled={Boolean(writeHint)}>
              Subir y escanear
            </Button>
          </div>
        </Form>
      )}

      {lastUpload && (
        <div className="mt-4">
          <ScanResult upload={lastUpload} />
        </div>
      )}

      <div className="mt-5 border-t border-outline pt-4">
        <h3 className="mb-2 text-sm font-semibold text-ink">Subidos</h3>
        {isPending ? (
          <LoadingState label="Cargando documentos…" />
        ) : error ? (
          <EmptyState
            title="No se pudieron cargar los documentos"
            description={errorMessage(error)}
            action={
              <Button variant="secondary" size="sm" onClick={() => void refetch()}>
                Reintentar
              </Button>
            }
          />
        ) : documents.length === 0 ? (
          <p className="rounded-xl border border-dashed border-outline p-4 text-center text-sm text-muted">
            Todavía no se subió ningún documento.
          </p>
        ) : (
          <ul className="space-y-2">
            {documents.map((document) => {
              const Icon = fleetAttachmentIcon(document.mimeType);
              const name = document.label || document.originalName;
              return (
                <li
                  key={document.attachmentId}
                  className="flex items-center justify-between gap-2 rounded-xl border border-outline p-3"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="hidden h-9 w-9 shrink-0 place-items-center rounded-lg border border-outline-soft bg-bg text-ink-2 sm:grid"
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-sm font-semibold text-ink">{name}</p>
                      <p className="truncate text-[11.5px] text-muted">
                        {document.label ? `${document.originalName} · ` : ''}
                        {formatAttachmentSize(document.sizeBytes)} · {formatDateTime(document.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <IconButton
                      label={`Descargar ${name}`}
                      icon={<Download />}
                      disabled={pendingId === document.attachmentId}
                      onClick={() => handleDownload(document.attachmentId, document.originalName)}
                    />
                    {canWrite && (
                      <IconButton
                        label={`Dar de baja ${name}`}
                        tone="danger"
                        icon={<Trash2 />}
                        disabled={remove.isPending || Boolean(writeHint)}
                        onClick={() => void handleDelete(document.attachmentId, name)}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
};

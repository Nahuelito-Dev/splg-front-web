import { useState } from 'react';
import { ApiError, errorMessage } from '../../../services/api/errors';
import type { ImportResource } from '../../../services/api/imports';
import type { ImportConfirm, ImportPreview } from '../../../services/api/types';
import { useConfirmImport, usePreviewImport } from '../../../services/queries/imports';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ImportDoneStep } from './ImportDoneStep';
import { ImportFileStep } from './ImportFileStep';
import { ImportPreviewStep } from './ImportPreviewStep';
import { IMPORT_CONFIG } from './importConfig';

interface Props {
  open: boolean;
  resource: ImportResource;
  onClose: () => void;
}

const STEP_TITLES = ['Archivo', 'Vista previa', 'Resultado'];

/** Asistente de importación masiva: archivo → vista previa → confirmación. Sólo se aplica en el último paso. */
/** Igual que el back: más grande responde 413. */
const MAX_BYTES = 5 * 1024 * 1024;

export const ImportWizard = ({ open, resource, onClose }: Props) => {
  const config = IMPORT_CONFIG[resource];
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportConfirm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewMutation = usePreviewImport();
  const confirmMutation = useConfirmImport();

  const [stale, setStale] = useState(false);
  const step = result ? 3 : preview ? 2 : 1;
  const busy = previewMutation.isPending || confirmMutation.isPending;

  const startOver = () => {
    setPreview(null);
    setError(null);
    setStale(false);
  };
  const close = () => {
    setPreview(null);
    setResult(null);
    setError(null);
    onClose();
  };

  const upload = (file: File) => {
    setError(null);
    // Lo mismo que controla el back, antes de subir: un archivo arrastrado no pasa por el `accept`.
    if (!/\.(csv|xlsx)$/i.test(file.name)) {
      setError('El archivo tiene que ser CSV o Excel (.xlsx)');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('El archivo supera los 5 MB');
      return;
    }
    previewMutation.mutate({ resource, file }, { onSuccess: setPreview, onError: (e) => setError(errorMessage(e)) });
  };
  const confirm = () => {
    if (!preview) return;
    setError(null);
    confirmMutation.mutate(preview.importId, {
      onSuccess: setResult,
      onError: (e) => {
        setError(errorMessage(e));
        // Vencida, inexistente o con errores: reintentar con la misma vista previa da lo mismo.
        if (e instanceof ApiError && e.status !== null && [400, 404, 410].includes(e.status)) setStale(true);
      },
    });
  };

  const hasErrors = preview ? preview.estado === 'with_errors' || preview.errores.length > 0 : false;

  const footer =
    step === 1 ? (
      <Button variant="secondary" onClick={close} disabled={busy}>
        Cancelar
      </Button>
    ) : step === 2 ? (
      <>
        <Button variant="secondary" onClick={startOver} disabled={busy}>
          Elegir otro archivo
        </Button>
        <Button
          onClick={confirm}
          loading={confirmMutation.isPending}
          blockedReason={
            hasErrors
              ? 'Corregí los errores del archivo y volvé a subirlo'
              : stale
                ? 'Elegí otro archivo y volvé a subirlo'
                : undefined
          }
        >
          Confirmar importación
        </Button>
      </>
    ) : (
      <Button onClick={close}>Listo</Button>
    );

  return (
    <Modal
      open={open}
      onClose={close}
      closeBlocked={busy}
      size="lg"
      title={config.title}
      description={`Paso ${step} de 3 · ${STEP_TITLES[step - 1]}. ${config.description}`}
      footer={footer}
    >
      {step === 1 && (
        <ImportFileStep
          resource={resource}
          uploading={previewMutation.isPending}
          error={error}
          onFile={upload}
          onReject={setError}
        />
      )}
      {step === 2 && preview && (
        <div className="space-y-4">
          <ImportPreviewStep preview={preview} />
          {error && (
            <p role="alert" className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      )}
      {step === 3 && result && <ImportDoneStep result={result} />}
    </Modal>
  );
};

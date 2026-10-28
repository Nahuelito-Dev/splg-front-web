import { Download, Sheet } from 'lucide-react';
import type { ImportFormat, ImportResource } from '../../../services/api/imports';
import { useDownloadImportTemplate } from '../../../services/queries/imports';
import { saveFileSource } from '../../../utils/fileSource';
import { notify } from '../../../utils/notifications';
import { Button } from '../ui/Button';
import { DropZone } from '../ui/DropZone';

interface Props {
  resource: ImportResource;
  uploading: boolean;
  /** Mensaje del back cuando rechazó el archivo (encabezado, tamaño, formato). */
  error: string | null;
  onFile: (file: File) => void;
  onReject: (message: string) => void;
}

const ACCEPT = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.csv', '.xlsx'];

/** Paso 1: bajar la plantilla y elegir el archivo completo. */
export const ImportFileStep = ({ resource, uploading, error, onFile, onReject }: Props) => {
  const template = useDownloadImportTemplate();
  const download = (format: ImportFormat) =>
    template.mutate(
      { resource, format },
      {
        onSuccess: ({ blob, filename }) => saveFileSource({ kind: 'blob', blob }, filename),
        onError: (e) => notify.error(e),
      },
    );

  return (
    <div className="space-y-5">
      <section aria-labelledby="import-template">
        <h3 id="import-template" className="text-sm font-semibold text-ink">
          1. Bajá la plantilla
        </h3>
        <p className="mt-0.5 text-sm text-muted">
          Tiene el encabezado que el sistema espera y una fila de ejemplo. Completala sin cambiar las columnas. Los
          números van en formato argentino (12.500,50).
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" icon={<Download />} loading={template.isPending} onClick={() => download('csv')}>
            Plantilla CSV
          </Button>
          <Button variant="secondary" icon={<Sheet />} loading={template.isPending} onClick={() => download('xlsx')}>
            Plantilla Excel
          </Button>
        </div>
      </section>
      <section aria-labelledby="import-file">
        <h3 id="import-file" className="text-sm font-semibold text-ink">
          2. Subí el archivo
        </h3>
        <DropZone
          className="mt-3"
          inputLabel="Archivo a importar"
          accept={ACCEPT}
          hint="CSV o Excel (.xlsx), hasta 5 MB. Todavía no se guarda nada: primero ves una vista previa."
          loading={uploading}
          onFile={onFile}
          onReject={onReject}
        />
        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
      </section>
    </div>
  );
};

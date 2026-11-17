import type { ReactNode } from 'react';
import type { ImportPreview } from '../../../services/api/types';
import { formatDateTime } from '../../../utils/format';
import { cx } from '../ui/cx';
import { cellText, IMPORT_CONFIG } from './importConfig';

interface Props {
  preview: ImportPreview;
}

const Counter = ({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'danger' }) => (
  <div className="rounded-xl border border-outline bg-surface px-3 py-2">
    <dt className="text-xs text-muted">{label}</dt>
    <dd
      className={cx(
        'text-xl font-semibold',
        tone === 'danger' ? 'text-danger' : tone === 'success' ? 'text-success' : 'text-ink',
      )}
    >
      {value}
    </dd>
  </div>
);

const Scroll = ({ label, children }: { label: string; children: ReactNode }) => (
  // Tabla angosta en el celular: se desplaza a un costado y se puede enfocar con el teclado.
  <div
    role="region"
    aria-label={label}
    tabIndex={0}
    className="max-h-64 overflow-auto rounded-xl border border-outline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
  >
    <table className="w-full min-w-max text-left text-sm">{children}</table>
  </div>
);

const Th = ({ children }: { children: ReactNode }) => (
  <th scope="col" className="sticky top-0 bg-surface-hover px-3 py-2 text-xs font-semibold text-muted">
    {children}
  </th>
);

/** Paso 2: lo que el back entendió del archivo. Con errores no se puede seguir. */
export const ImportPreviewStep = ({ preview }: Props) => {
  const config = IMPORT_CONFIG[preview.recurso];
  const withErrors = preview.estado === 'with_errors' || preview.errores.length > 0;
  const withErrorRows = new Set(preview.errores.map((e) => e.fila)).size;

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-3 gap-2">
        <Counter label="Filas" value={preview.total} />
        <Counter label="Válidas" value={preview.validas} tone="success" />
        <Counter label="Con error" value={withErrorRows} tone={withErrorRows > 0 ? 'danger' : undefined} />
      </dl>
      <p className="text-xs text-muted">
        Esta vista previa se puede confirmar hasta el {formatDateTime(preview.venceEn)}; después hay que volver a subir
        el archivo.
      </p>

      {withErrors && (
        <section aria-labelledby="import-errors" className="space-y-2">
          <h3 id="import-errors" className="text-sm font-semibold text-danger">
            Errores del archivo
          </h3>
          <p role="alert" className="text-sm text-ink-2">
            No se puede confirmar mientras haya errores. Corregí el archivo y volvé a subirlo: no se guardó nada.
          </p>
          <Scroll label="Tabla de errores">
            <thead>
              <tr>
                <Th>Fila</Th>
                <Th>Columna</Th>
                <Th>Mensaje</Th>
              </tr>
            </thead>
            <tbody>
              {preview.errores.map((error) => (
                <tr key={`${error.fila}-${error.columna}-${error.mensaje}`} className="border-t border-outline">
                  <td className="px-3 py-2 tabular-nums">{error.fila}</td>
                  <td className="px-3 py-2">{error.columna}</td>
                  <td className="px-3 py-2">{error.mensaje}</td>
                </tr>
              ))}
            </tbody>
          </Scroll>
        </section>
      )}

      {preview.vistaPrevia.length > 0 && (
        <section aria-labelledby="import-valid" className="space-y-2">
          <h3 id="import-valid" className="text-sm font-semibold text-ink">
            Filas válidas
          </h3>
          <p className="text-xs text-muted">
            {preview.validas > preview.vistaPrevia.length
              ? `Las primeras ${preview.vistaPrevia.length} de ${preview.validas}.`
              : preview.validas === 1
                ? 'Una fila.'
                : `Las ${preview.validas} filas.`}
          </p>
          <Scroll label="Tabla de filas válidas">
            <thead>
              <tr>
                <Th>Fila</Th>
                {config.columns.map((column) => (
                  <Th key={column.key}>{column.label}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.vistaPrevia.map((row) => (
                <tr key={row.fila} className="border-t border-outline">
                  <td className="px-3 py-2 tabular-nums">{row.fila}</td>
                  {config.columns.map((column) => (
                    <td key={column.key} className="px-3 py-2">
                      {(column.render ?? cellText)(row.datos[column.key], row.datos)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Scroll>
        </section>
      )}
    </div>
  );
};

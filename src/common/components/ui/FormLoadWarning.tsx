import { Button } from './Button';

/** Lo que el cargador de una página de formulario le pasa al formulario cuando una recarga falló. */
export interface LoadWarning {
  text: string;
  retry: () => void;
}

interface Props {
  text: string;
  onRetry: () => void;
}

/** Aviso en línea de un formulario: falló una recarga de datos pero hay datos en caché, así que no se pierde lo cargado. */
export const FormLoadWarning = ({ text, onRetry }: Props) => (
  <div
    role="alert"
    className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warn bg-warn-soft px-4 py-3 text-sm text-warn"
  >
    <span>{text}</span>
    <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
      Reintentar
    </Button>
  </div>
);

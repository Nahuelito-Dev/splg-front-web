import { toApiError } from '../../../services/api/errors';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

interface LoadingStateProps {
  label?: string;
  /** Carga de una pantalla entera: el spinner va al medio del área de contenido. */
  fullPage?: boolean;
}

export const LoadingState = ({ label = 'Cargando…', fullPage = false }: LoadingStateProps) => (
  <div
    role="status"
    className={`flex items-center justify-center gap-3 text-sm text-muted ${fullPage ? 'min-h-[60vh]' : 'py-16'}`}
  >
    <span
      aria-hidden="true"
      className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"
    />
    {label}
  </div>
);

interface ErrorStateProps {
  error: unknown;
  /** Qué no se encontró, para el 404 ("El cliente"). */
  resource?: string;
  onRetry?: () => void;
}

/** Error de una consulta: 404 como "no existe", el resto con el mensaje de la API. */
export const ErrorState = ({ error, resource = 'El recurso', onRetry }: ErrorStateProps) => {
  const apiError = toApiError(error);
  if (apiError.notFound || apiError.invalidId) {
    return (
      <EmptyState
        title={`${resource} no existe`}
        description="Puede haberse dado de baja o ser de otra distribuidora."
      />
    );
  }
  return (
    <EmptyState
      title="No se pudo cargar"
      description={apiError.messages.join('. ')}
      action={
        onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Reintentar
          </Button>
        )
      }
    />
  );
};

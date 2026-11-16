import { Lock } from 'lucide-react';
import { Card, EmptyState, ErrorState } from '../../../common/components/ui';
import { toApiError } from '../../../services/api/errors';

interface Props {
  error: unknown;
  /** Título del 403: qué no puede ver. */
  forbiddenTitle: string;
  /** Qué no existe, para el 404. */
  resource?: string;
  notFoundDescription?: string;
  onRetry: () => void;
}

/**
 * El error de las métricas: un 403 de permiso es un aviso sin «Reintentar» (volver a pedir no lo cambia), con el
 * mensaje de la API; el resto (función no disponible, 404, caída), el `ErrorState` del kit.
 */
export const MetricsError = ({ error, forbiddenTitle, resource, notFoundDescription, onRetry }: Props) => {
  const apiError = toApiError(error);
  return (
    <Card>
      {apiError.forbidden && !apiError.moduleDisabled ? (
        <EmptyState icon={Lock} title={forbiddenTitle} description={apiError.messages.join('. ')} />
      ) : (
        <ErrorState error={error} resource={resource} notFoundDescription={notFoundDescription} onRetry={onRetry} />
      )}
    </Card>
  );
};

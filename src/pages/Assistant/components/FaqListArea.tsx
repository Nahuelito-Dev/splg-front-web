import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button, Card, ErrorState } from '../../../common/components/ui';
import { FaqBoardSkeleton } from './FaqBoard';

interface Props {
  isPending: boolean;
  error: unknown;
  /** Hay una lista ya cargada (aunque la última recarga haya fallado). */
  hasData: boolean;
  onRetry: () => void;
  children: ReactNode;
}

/**
 * Los estados de una lista de preguntas: esqueleto la primera vez; si nunca cargó, el error con «Reintentar»; si ya
 * había una lista y falla una recarga de fondo, un aviso arriba y la lista que se tenía (no se reemplaza entera).
 */
export const FaqListArea = ({ isPending, error, hasData, onRetry, children }: Props) => {
  if (isPending) return <FaqBoardSkeleton />;
  if (!hasData) {
    return (
      <Card>
        <ErrorState error={error} resource="La lista de preguntas" onRetry={onRetry} />
      </Card>
    );
  }
  return (
    <>
      {Boolean(error) && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-xl border border-warn/30 bg-warn-soft p-3 text-sm text-ink sm:flex-row sm:items-center sm:justify-between"
        >
          <p>No se pudo actualizar la lista: se muestra la última que se cargó.</p>
          <Button size="sm" variant="secondary" icon={<RefreshCw aria-hidden="true" />} onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      )}
      {children}
    </>
  );
};

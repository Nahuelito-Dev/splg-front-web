import { CheckCircle2, Star } from 'lucide-react';
import { useState } from 'react';
import { Button, Card, CardHeader, cx } from '../../common/components/ui';
import { errorMessage } from '../../services/api/errors';
import type { Ticket } from '../../services/api/types';
import { useConfirmCompanyTicket } from '../../services/queries/supportChat';
import { notify } from '../../utils/notifications';

const RATINGS = [1, 2, 3, 4, 5] as const;

/**
 * Un ticket resuelto: la empresa confirma (y lo cierra) con una calificación opcional de 1 a 5. Si el problema
 * sigue, responde en el hilo y el ticket vuelve a «En curso».
 */
export const ConfirmTicketCard = ({ ticket, canManage }: { ticket: Ticket; canManage: boolean }) => {
  const confirm = useConfirmCompanyTicket();
  const [rating, setRating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    confirm.mutate(
      { id: ticket.id, satisfaction: rating ?? undefined },
      {
        onSuccess: () => notify.success(`Ticket ${ticket.number} cerrado. ¡Gracias!`),
        onError: (e) => setError(errorMessage(e)),
      },
    );
  };

  return (
    <Card className="border-success/40">
      <CardHeader
        title="¿Quedó resuelto?"
        subtitle="Si sí, confirmalo y se cierra. Si no, respondé en el ticket y vuelve a quedar en curso."
        icon={<CheckCircle2 className="h-5 w-5 text-success" />}
        as="h2"
      />
      {canManage ? (
        <div className="grid gap-3">
          <fieldset>
            <legend className="mb-1 text-sm text-ink-2">Calificá la atención (opcional)</legend>
            <div className="flex gap-1" role="radiogroup" aria-label="Calificación">
              {RATINGS.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} de 5`}
                  onClick={() => setRating(rating === value ? null : value)}
                  className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <Star
                    aria-hidden="true"
                    className={cx(
                      'h-6 w-6',
                      rating !== null && value <= rating ? 'fill-accent text-accent' : 'text-faint',
                    )}
                  />
                </button>
              ))}
            </div>
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button onClick={submit} loading={confirm.isPending}>
            Confirmar y cerrar
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted">Quien gestiona el soporte de la empresa lo puede confirmar.</p>
      )}
    </Card>
  );
};

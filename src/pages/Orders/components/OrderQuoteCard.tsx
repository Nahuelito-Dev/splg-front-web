import { Card } from '../../../common/components/ui';
import { errorMessage } from '../../../services/api/errors';
import type { QuoteOrderBody } from '../../../services/api/types';
import { useOrderQuote } from '../../../services/queries/orders';
import { formatCurrency } from '../../../utils/format';

interface Props {
  /** Lo cargado hasta ahora; `null` si todavía no alcanza para cotizar. */
  body: QuoteOrderBody | null;
  /** Qué falta para cotizar (o por qué no se puede); se muestra mientras no haya cuerpo. */
  hint: string;
}

interface LineProps {
  label: string;
  amount: number;
  strong?: boolean;
}

const Line = ({ label, amount, strong }: LineProps) => (
  <div className={`flex justify-between gap-4 ${strong ? 'text-base font-semibold text-ink' : 'text-sm text-muted'}`}>
    <dt>{label}</dt>
    <dd className="font-mono tabular-nums">{formatCurrency(amount)}</dd>
  </div>
);

/** La cotización del back antes de confirmar: es exactamente el total que va a tener el pedido. */
export const OrderQuoteCard = ({ body, hint }: Props) => {
  const { data, error, isFetching, stale } = useOrderQuote(body);
  const quote = body ? data : undefined;

  return (
    <Card className="space-y-3 p-4" aria-live="polite">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Cotización</h3>
        {body && (isFetching || stale) && <span className="text-xs text-muted">Actualizando…</span>}
      </div>
      {!body ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : error && !stale ? (
        <p role="alert" className="text-sm text-danger">
          No se pudo cotizar: {errorMessage(error)}
        </p>
      ) : quote ? (
        <dl className="space-y-1.5">
          {quote.items.map((item, index) => (
            <Line
              key={`${item.gasCylinderId}-${index}`}
              label={`${item.quantity} × ${item.title} (${formatCurrency(item.unitPrice)} c/u)`}
              amount={item.subtotal}
            />
          ))}
          <div className="border-t border-outline pt-1.5">
            <Line label="Subtotal" amount={quote.subtotal} />
          </div>
          {quote.zoneSurcharge > 0 && (
            <Line label={`Recargo de zona${quote.zone ? ` (${quote.zone.name})` : ''}`} amount={quote.zoneSurcharge} />
          )}
          {quote.paymentSurcharge > 0 && <Line label="Recargo por medio de pago" amount={quote.paymentSurcharge} />}
          {quote.expressSurcharge > 0 && <Line label="Recargo express" amount={quote.expressSurcharge} />}
          <div className="border-t border-outline pt-1.5">
            <Line label="Total" amount={quote.total} strong />
          </div>
        </dl>
      ) : (
        <p className="text-sm text-muted">Calculando…</p>
      )}
    </Card>
  );
};

import { Link } from 'react-router-dom';
import { Card, CardHeader } from '../../../common/components/ui';
import { errorMessage } from '../../../services/api/errors';
import type { QuoteOrderBody } from '../../../services/api/types';
import { useOrderQuote } from '../../../services/queries/orders';
import { formatCurrency } from '../../../utils/format';
import {
  containerChargeLabel,
  containerItemNote,
  containersChargedCount,
  isMissingContainerPrice,
  quoteSurchargeLabel,
} from './details/orderPricing';

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
  /** Aclaración debajo del renglón (p. ej. los envases que se cobran aparte). */
  note?: string | null;
}

const Line = ({ label, amount, strong, note }: LineProps) => (
  <div>
    <div className={`flex justify-between gap-4 ${strong ? 'text-base font-semibold text-ink' : 'text-sm text-muted'}`}>
      <dt className="min-w-0 break-words">{label}</dt>
      <dd className="shrink-0 tabular-nums">{formatCurrency(amount)}</dd>
    </div>
    {note && <p className="text-xs text-muted">{note}</p>}
  </div>
);

/** La cotización del back antes de confirmar: es exactamente el total que va a tener el pedido. */
export const OrderQuoteCard = ({ body, hint }: Props) => {
  const { data, error, isFetching, stale } = useOrderQuote(body);
  const quote = body ? data : undefined;

  return (
    <Card className="space-y-3 p-4" aria-live="polite">
      <div className="flex items-center justify-between">
        <CardHeader title="Cotización" as="h3" className="" />
        {body && (isFetching || stale) && <span className="text-xs text-muted">Actualizando…</span>}
      </div>
      {!body ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : error && !stale ? (
        <p role="alert" className="text-sm text-danger">
          No se pudo cotizar: {errorMessage(error)}
          {isMissingContainerPrice(error) && (
            <>
              {' '}
              <Link to="/cylinders" className="font-semibold text-primary-strong underline">
                Cargar el precio del envase en el catálogo
              </Link>
            </>
          )}
        </p>
      ) : quote ? (
        <dl className="space-y-1.5">
          {quote.items.map((item, index) => (
            <Line
              key={`${item.gasCylinderId}-${index}`}
              label={`${item.quantity} × ${item.title} (${formatCurrency(item.unitPrice)} c/u)`}
              amount={item.subtotal}
              note={containerItemNote(item)}
            />
          ))}
          <div className="border-t border-outline pt-1.5">
            <Line label="Subtotal" amount={quote.subtotal} />
          </div>
          {quote.containerChargeAmount > 0 && (
            <Line
              label={containerChargeLabel(containersChargedCount(quote.items))}
              amount={quote.containerChargeAmount}
            />
          )}
          {quote.zoneSurcharge > 0 && (
            <Line label={`Recargo de zona${quote.zone ? ` (${quote.zone.name})` : ''}`} amount={quote.zoneSurcharge} />
          )}
          {quote.paymentSurcharge > 0 && <Line label={quoteSurchargeLabel(quote)} amount={quote.paymentSurcharge} />}
          {quote.expressSurcharge > 0 && <Line label="Recargo express" amount={quote.expressSurcharge} />}
          <div className="border-t border-outline pt-1.5">
            <Line label="Total" amount={quote.total} strong />
          </div>
          {body?.isReservation && (
            <div className="space-y-1.5 border-t border-outline pt-1.5">
              <Line label="Seña" amount={quote.deposit} />
              <Line label="Saldo a cobrar" amount={quote.balance} />
            </div>
          )}
        </dl>
      ) : (
        <p className="text-sm text-muted">Calculando…</p>
      )}
    </Card>
  );
};

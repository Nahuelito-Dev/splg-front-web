import type { Order } from '../../../../services/api/types';
import type { Distributor } from '../../../../services/api/types';
import { formatCurrency, formatDateTime, formatDay, formatShortId } from '../../../../utils/format';
import { labelOf, ORDER_STATUS, PAYMENT_METHOD } from '../../../../utils/statusLabels';
import { onlinePaymentSurcharge } from './orderPricing';

interface Props {
  order: Order;
  /** La empresa que emite el remito; sin ella (administrador general sin «Ver como») se omite el membrete. */
  distributor?: Distributor | null;
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <dt className="text-[11px] font-semibold uppercase tracking-wide text-tinta-500">{label}</dt>
    <dd className="mt-0.5 break-words text-sm text-tinta-900">{children}</dd>
  </div>
);

/**
 * El remito de un pedido, en blanco y negro sobre papel (no cambia con el
 * tema): distribuidora, cliente, ítems, totales, código del pedido y firma de
 * recepción. Se imprime en A4 desde el navegador (ver `remito.css`).
 */
export const OrderRemito = ({ order, distributor }: Props) => {
  const onlineSurcharge = onlinePaymentSurcharge(order);
  const zone = order.zone_surcharge;
  const address = order.delivery_address;
  const cancelled = order.status === 'cancelled';

  return (
    <article className="remito-sheet mx-auto w-full max-w-[210mm] rounded-card border border-tinta-200 bg-white p-6 text-tinta-900 shadow-card sm:p-10">
      <header className="flex flex-col gap-4 border-b border-tinta-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {cancelled && (
            <p
              role="status"
              className="mb-3 inline-block -rotate-2 rounded border-4 border-tinta-900 px-4 py-1 text-2xl font-black uppercase tracking-[0.3em] text-tinta-900"
            >
              Anulado
            </p>
          )}
          <p className="text-xs font-semibold uppercase tracking-widest text-tinta-500">Remito</p>
          <h1 className="font-mono text-3xl font-bold tracking-tight">{formatShortId(order.order_id)}</h1>
          <p className="mt-1 text-sm text-tinta-700">Emitido sobre el pedido del {formatDateTime(order.created_at)}</p>
          <p className="text-xs text-tinta-500">Estado del pedido: {labelOf(ORDER_STATUS, order.status).text}</p>
        </div>
        {distributor && (
          <div className="text-sm sm:text-right">
            <p className="text-lg font-bold">{distributor.legal_name ?? distributor.name}</p>
            {distributor.legal_name && distributor.legal_name !== distributor.name && (
              <p className="text-tinta-700">{distributor.name}</p>
            )}
            {distributor.tax_id && <p className="text-tinta-700">CUIT {distributor.tax_id}</p>}
            {distributor.phone && <p className="text-tinta-700">Tel. {distributor.phone}</p>}
            {distributor.email && <p className="break-all text-tinta-700">{distributor.email}</p>}
          </div>
        )}
      </header>

      <dl className="grid gap-5 border-b border-tinta-200 py-6 sm:grid-cols-2">
        <Field label="Cliente">
          {order.customer?.full_name ?? 'Sin nombre'}
          {order.customer?.phone_number && <span className="block text-tinta-700">{order.customer.phone_number}</span>}
          {order.customer?.email && <span className="block break-all text-tinta-700">{order.customer.email}</span>}
        </Field>
        <Field label="Entrega">
          {address?.street ?? 'Sin dirección'}
          <span className="block text-tinta-700">{address?.formatted_address ?? address?.city ?? ''}</span>
          {order.scheduledDate && (
            <span className="block text-tinta-700">Agendado: {formatDay(order.scheduledDate)}</span>
          )}
          {order.delivery_window_start && order.delivery_window_end && (
            <span className="block text-tinta-700">
              Franja: {order.delivery_window_start.slice(0, 5)}–{order.delivery_window_end.slice(0, 5)}
            </span>
          )}
        </Field>
        <Field label="Forma de pago">{labelOf(PAYMENT_METHOD, order.paymentMethodDetail).text}</Field>
        <Field label="Chofer">{order.delivery_name ?? 'Sin asignar'}</Field>
      </dl>

      <div className="overflow-x-auto py-6">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr className="border-b border-tinta-200 text-xs uppercase text-tinta-500">
              <th className="py-2 pr-2 font-semibold">Producto</th>
              <th className="px-2 py-2 text-center font-semibold">Cant.</th>
              <th className="px-2 py-2 text-right font-semibold">Precio</th>
              <th className="py-2 pl-2 text-right font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items.map((item, index) => (
              <tr
                key={`${item.gas_cylinder?.gas_cylinder_id ?? 'item'}-${index}`}
                className="border-b border-tinta-100"
              >
                <td className="py-2.5 pr-2 font-medium">{item.gas_cylinder?.type ?? 'Producto sin datos'}</td>
                <td className="px-2 py-2.5 text-center">{item.quantity}</td>
                <td className="px-2 py-2.5 text-right">{formatCurrency(item.unit_price)}</td>
                <td className="py-2.5 pl-2 text-right font-semibold">{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-4 w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-tinta-700">Subtotal garrafas</dt>
            <dd>{formatCurrency(order.subtotal_items)}</dd>
          </div>
          {zone && zone.amount > 0 && (
            <div className="flex justify-between gap-4">
              <dt className="text-tinta-700">Recargo zona «{zone.name}»</dt>
              <dd>{formatCurrency(zone.amount)}</dd>
            </div>
          )}
          {onlineSurcharge > 0 && (
            <div className="flex justify-between gap-4">
              <dt className="text-tinta-700">Recargo pago online</dt>
              <dd>{formatCurrency(onlineSurcharge)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4 border-t border-tinta-900 pt-2 text-base font-bold">
            <dt>Total</dt>
            <dd>{formatCurrency(order.total_amount)}</dd>
          </div>
        </dl>
      </div>

      <footer className="grid gap-8 border-t border-tinta-200 pt-8 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-tinta-500">Código del pedido</p>
          <p className="mt-1 font-mono text-sm font-semibold">{formatShortId(order.order_id)}</p>
          <p className="break-all font-mono text-[11px] text-tinta-500">{order.order_id}</p>
        </div>
        <div className="pt-10">
          <div className="border-t border-tinta-900" />
          <p className="mt-1 text-xs text-tinta-700">Firma y aclaración de quien recibe</p>
        </div>
      </footer>
    </article>
  );
};

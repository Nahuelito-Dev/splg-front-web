import type { ReactNode } from 'react';
import { CircleUser, Copy, ExternalLink, MapPin, Truck, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Button, Card } from '../../../../common/components/ui';
import type { Order } from '../../../../services/api/types';
import { useFindCustomerByUserId } from '../../../../services/queries/customers';
import { formatCurrency, formatDay } from '../../../../utils/format';
import { notify } from '../../../../utils/notifications';
import { labelOf, PAYMENT_TYPE } from '../../../../utils/statusLabels';
import { isClosed } from '../orderStatus';
import { OrderMiniMap } from './OrderMiniMap';
import { orderCoordinates } from './orderLocation';

const Section = ({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) => (
  <section className="p-5">
    <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
      {icon} {title}
    </h3>
    {children}
  </section>
);

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3 text-[13px]">
    <dt className="text-muted">{label}</dt>
    <dd className="min-w-0 break-words text-right font-medium text-ink">{children}</dd>
  </div>
);

const iconProps = { 'aria-hidden': true, className: 'h-4 w-4', strokeWidth: 1.8 } as const;

const CustomerSection = ({ order }: { order: Order }) => {
  const navigate = useNavigate();
  const findCustomer = useFindCustomerByUserId();
  const customer = order.customer;

  return (
    <Section icon={<CircleUser {...iconProps} />} title="Cliente">
      {customer ? (
        <>
          <div className="flex items-center gap-3">
            <Avatar name={customer.full_name ?? 'Cliente'} size="lg" />
            <div className="min-w-0">
              <p className="break-words font-semibold text-ink">{customer.full_name ?? 'Sin nombre'}</p>
              {customer.email && <p className="truncate text-xs text-muted">{customer.email}</p>}
              {customer.phone_number && <p className="text-xs text-muted">{customer.phone_number}</p>}
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            loading={findCustomer.isPending}
            onClick={() =>
              findCustomer.mutate(customer.user_id, {
                onSuccess: (found) => navigate(`/customers/details/${found.customer_id}`),
                onError: notify.error,
              })
            }
          >
            Ver ficha del cliente
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted">Sin datos del cliente</p>
      )}
    </Section>
  );
};

const DeliverySection = ({ order }: { order: Order }) => {
  const address = order.delivery_address;
  const coordinates = orderCoordinates(order);
  const zone = order.zone_surcharge;
  const { delivery_window_start: windowStart, delivery_window_end: windowEnd } = order;
  const windowText = windowStart && windowEnd ? `${windowStart.slice(0, 5)}–${windowEnd.slice(0, 5)}` : null;

  return (
    <Section icon={<MapPin {...iconProps} />} title="Entrega">
      <p className="break-words font-medium text-ink">{address?.street ?? 'Sin dirección'}</p>
      <p className="text-sm text-muted">{address?.formatted_address ?? address?.city ?? '—'}</p>
      {coordinates && (
        <div className="mt-3">
          <OrderMiniMap position={coordinates} label={`Mapa del punto de entrega: ${address?.street ?? ''}`} />
        </div>
      )}
      <dl className="mt-3 space-y-1.5">
        {order.scheduledDate && <Row label="Agendado">{formatDay(order.scheduledDate)}</Row>}
        {windowText && <Row label="Franja">{windowText}</Row>}
        {zone && <Row label="Zona">{zone.name}</Row>}
        {zone && zone.amount > 0 && <Row label="Recargo">{formatCurrency(zone.amount)}</Row>}
      </dl>
      {address?.additional_instructions && (
        <p className="mt-3 rounded-lg bg-surface-hover p-2 text-xs text-muted">{address.additional_instructions}</p>
      )}
      {order.delivery_notes && (
        <p className="mt-2 rounded-lg bg-surface-hover p-2 text-xs text-muted">{order.delivery_notes}</p>
      )}
      {order.customer_notes && <p className="mt-2 text-xs text-muted">Nota del cliente: {order.customer_notes}</p>}
    </Section>
  );
};

const DriverSection = ({ order }: { order: Order }) => {
  const navigate = useNavigate();
  const vehicle = order.vehicle;

  return (
    <Section icon={<Truck {...iconProps} />} title="Chofer">
      {order.delivery_name ? (
        <>
          <div className="flex items-center gap-3">
            <Avatar name={order.delivery_name} size="lg" />
            <div className="min-w-0">
              <p className="break-words font-semibold text-ink">{order.delivery_name}</p>
              {vehicle ? (
                <p className="text-xs text-muted">
                  <span className="font-mono font-semibold uppercase tracking-wide">
                    {vehicle.patent ?? 's/patente'}
                  </span>
                  {' · '}
                  {[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Sin marca/modelo'}
                </p>
              ) : (
                <p className="text-xs text-muted">Sin vehículo registrado al aceptar el pedido</p>
              )}
            </div>
          </div>
          {order.delivery_id && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => navigate(`/deliveries/details/${order.delivery_id}`)}
            >
              Ver ficha del chofer
            </Button>
          )}
        </>
      ) : (
        <p className="text-sm text-muted">Todavía sin asignar</p>
      )}
    </Section>
  );
};

/** Enlace de pago online pendiente: el operador lo copia o lo abre para reenviárselo al cliente. */
const PaymentLink = ({ url }: { url: string }) => {
  const copy = () => {
    navigator.clipboard.writeText(url).then(
      () => notify.success('Enlace de pago copiado'),
      () => notify.error(new Error('No se pudo copiar el enlace')),
    );
  };

  return (
    <div className="mt-3 rounded-lg border border-outline bg-surface-hover p-3">
      <p className="text-xs font-medium text-muted">Enlace de pago (MercadoPago)</p>
      <p className="mt-1 break-all font-mono text-[11px] text-ink-2">{url}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon={<Copy />} onClick={copy}>
          Copiar enlace
        </Button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-outline bg-surface px-3 text-xs font-semibold text-ink shadow-control transition hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&_svg]:h-4 [&_svg]:w-4"
        >
          <ExternalLink aria-hidden="true" /> Abrir
        </a>
      </div>
    </div>
  );
};

const PaymentSection = ({ order }: { order: Order }) => (
  <Section icon={<Wallet {...iconProps} />} title="Pago">
    <dl className="space-y-1.5">
      <Row label="Método">{labelOf(PAYMENT_TYPE, order.payment_method).text}</Row>
      {(order.depositAmount ?? 0) > 0 && (
        <>
          <Row label="Seña">
            {formatCurrency(order.depositAmount)} · {order.depositPaid ? 'cobrada' : 'sin cobrar'}
          </Row>
          <Row label="Saldo">{formatCurrency(order.remainingBalance)}</Row>
        </>
      )}
      <Row label="Total">
        <span className="text-base font-bold">{formatCurrency(order.total_amount)}</span>
      </Row>
    </dl>
    {order.payment_method === 'online' && order.payment_url && !isClosed(order.status) && (
      <PaymentLink url={order.payment_url} />
    )}
  </Section>
);

/** Las tarjetas laterales de la ficha: cliente, entrega con mapa, chofer y pago. */
export const OrderSideCards = ({ order }: { order: Order }) => (
  <Card className="divide-y divide-dashed divide-outline">
    <CustomerSection order={order} />
    <DeliverySection order={order} />
    <DriverSection order={order} />
    <PaymentSection order={order} />
  </Card>
);

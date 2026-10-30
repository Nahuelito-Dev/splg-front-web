import type { ReactNode } from 'react';
import { CircleUser, MapPin, Truck, UserCheck, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge, PersonAvatar, Button, Card, CardHeader, UserRefLink } from '../../../../common/components/ui';
import type { Order } from '../../../../services/api/types';
import { useFindCustomerByUserId } from '../../../../services/queries/customers';
import { useUser } from '../../../../services/queries/users';
import { formatCurrency, formatDateTime, formatDay } from '../../../../utils/format';
import { notify } from '../../../../utils/notifications';
import { DELIVERY_MODE, labelOf, PAYMENT_METHOD, paymentStatusLabel } from '../../../../utils/statusLabels';
import { isClosed } from '../orderStatus';
import { PaymentLink } from '../PaymentLink';
import { OrderMiniMap } from './OrderMiniMap';
import { OrderRefunds } from './OrderRefunds';
import { orderCoordinates } from './orderLocation';

const Section = ({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) => (
  <section className="p-5">
    <CardHeader title={title} icon={icon} as="h3" className="mb-3" />
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
            <PersonAvatar name={customer.full_name ?? 'Cliente'} userId={customer.user_id} size="lg" />
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
        <Row label="Modalidad">
          <Badge label={labelOf(DELIVERY_MODE, order.deliveryMode)} />
        </Row>
        {order.expressSurchargeAmount > 0 && (
          <Row label="Recargo express">
            {order.deliveryMode === 'express'
              ? formatCurrency(order.expressSurchargeAmount)
              : `${formatCurrency(order.expressSurchargeAmount)} (descontado)`}
          </Row>
        )}
        {order.expressDegradedAt && <Row label="Pasó a reparto común">{formatDateTime(order.expressDegradedAt)}</Row>}
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

/** Quién va a recibir el pedido (CU-128); sólo se dibuja si el cliente lo indicó y el plazo de reclamo no venció. */
const ReceiverSection = ({ order }: { order: Order }) => {
  const receiver = order.receiver;
  if (!receiver) return null;
  return (
    <Section icon={<UserCheck {...iconProps} />} title="Quién recibe">
      <dl className="space-y-1.5">
        <Row label="Nombre">{receiver.name ?? '—'}</Row>
        <Row label="Documento">{receiver.document ?? '—'}</Row>
        <Row label="Relación">{receiver.relationship ?? '—'}</Row>
      </dl>
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
            <PersonAvatar name={order.delivery_name} deliveryId={order.delivery_id} size="lg" />
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

/** Quién confirmó o resolvió el cobro (es un usuario de la distribuidora: el chofer o el admin). */
const ConfirmedBy = ({ userId }: { userId: string }) => {
  const { data, isLoading } = useUser(userId);
  return <UserRefLink userId={userId} name={data?.full_name} loading={isLoading} />;
};

/** Qué fue lo que decidió el administrador, según el pago en que quedó el pedido. */
const PAYMENT_RESOLVED_LABEL: Partial<Record<NonNullable<Order['paymentStatus']>, string>> = {
  paid: 'Cobro registrado',
  failed: 'Marcada como no recibida',
  written_off: 'Dado por perdido',
};

const PaymentSection = ({ order }: { order: Order }) => (
  <Section icon={<Wallet {...iconProps} />} title="Pago">
    <dl className="space-y-1.5">
      <Row label="Método">{labelOf(PAYMENT_METHOD, order.paymentMethodDetail).text}</Row>
      {order.paymentStatus && (
        <Row label="Estado del cobro">
          <Badge label={paymentStatusLabel(order.paymentStatus, order.paymentMethodDetail)} />
        </Row>
      )}
      {order.paymentConfirmedAt && <Row label="Cobro confirmado">{formatDateTime(order.paymentConfirmedAt)}</Row>}
      {order.paymentConfirmedBy && (
        <Row label="Confirmado por">
          <ConfirmedBy userId={order.paymentConfirmedBy} />
        </Row>
      )}
      {order.paymentResolvedAt && (
        <Row label={PAYMENT_RESOLVED_LABEL[order.paymentStatus] ?? 'Resuelto'}>
          {formatDateTime(order.paymentResolvedAt)}
        </Row>
      )}
      {order.paymentResolvedBy && (
        <Row label="Resuelto por">
          <ConfirmedBy userId={order.paymentResolvedBy} />
        </Row>
      )}
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
    {order.paymentResolutionNote && (
      <p className="mt-3 rounded-lg bg-surface-hover p-2 text-xs text-muted">
        <span className="font-semibold text-ink-2">Nota de resolución: </span>
        {order.paymentResolutionNote}
      </p>
    )}
    {order.status === 'cancelled' && order.paymentStatus === 'paid' && order.paymentMethodDetail !== 'mercadopago' && (
      <p role="status" className="mt-3 rounded-lg border border-warn/30 bg-warn-soft p-2 text-xs text-warn">
        <span className="font-semibold">Reintegro pendiente: </span>
        el pedido se cobró y después se canceló. Este medio de pago no pasa por una pasarela: la devolución la hace la
        distribuidora por fuera.
      </p>
    )}
    <OrderRefunds order={order} />
    {order.payment_method === 'online' && order.payment_url && !isClosed(order.status) && (
      <PaymentLink url={order.payment_url} />
    )}
  </Section>
);

/** Las tarjetas laterales de la ficha: cliente, entrega con mapa, quién recibe, chofer y pago. */
export const OrderSideCards = ({ order }: { order: Order }) => (
  <Card className="divide-y divide-dashed divide-outline">
    <CustomerSection order={order} />
    <DeliverySection order={order} />
    <ReceiverSection order={order} />
    <DriverSection order={order} />
    <PaymentSection order={order} />
  </Card>
);

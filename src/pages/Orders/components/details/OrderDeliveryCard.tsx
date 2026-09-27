import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { Card } from '../../../../common/components/ui';
import type { Order } from '../../../../services/api/types';

export const OrderDeliveryCard = ({ order }: { order: Order }) => (
  <div className="grid gap-4 sm:grid-cols-3">
    <Card className="p-4">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <PersonOutlineIcon fontSize="small" /> Cliente
      </h3>
      {order.customer ? (
        <>
          <p className="font-medium text-ink">{order.customer.full_name ?? 'Sin nombre'}</p>
          {order.customer.phone_number && <p className="text-sm text-muted">{order.customer.phone_number}</p>}
          {order.customer.email && <p className="truncate text-sm text-muted">{order.customer.email}</p>}
        </>
      ) : (
        <p className="text-sm text-muted">Sin datos del cliente</p>
      )}
    </Card>
    <Card className="p-4">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <LocationOnIcon fontSize="small" /> Entrega
      </h3>
      <p className="font-medium text-ink">{order.delivery_address?.street ?? 'Sin dirección'}</p>
      <p className="text-sm text-muted">{order.delivery_address?.city ?? '—'}</p>
      {order.delivery_window_start && order.delivery_window_end && (
        <p className="mt-2 text-xs text-muted">
          Franja horaria: {order.delivery_window_start}–{order.delivery_window_end}
        </p>
      )}
      {order.delivery_notes && (
        <p className="mt-2 rounded-lg bg-tinta-50 p-2 text-xs text-muted">{order.delivery_notes}</p>
      )}
      {order.customer_notes && <p className="mt-2 text-xs text-muted">Nota del cliente: {order.customer_notes}</p>}
    </Card>
    <Card className="p-4">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <LocalShippingIcon fontSize="small" /> Chofer asignado
      </h3>
      {order.delivery_name ? (
        <p className="font-medium text-ink">{order.delivery_name}</p>
      ) : (
        <p className="text-sm text-muted">Todavía sin asignar</p>
      )}
    </Card>
  </div>
);

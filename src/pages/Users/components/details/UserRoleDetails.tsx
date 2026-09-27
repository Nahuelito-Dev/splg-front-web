import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import StarIcon from '@mui/icons-material/Star';
import TwoWheelerOutlinedIcon from '@mui/icons-material/TwoWheelerOutlined';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, DetailList, EmptyState } from '../../../../common/components/ui';
import type { User } from '../../../../services/api/types';
import { formatCurrency, formatDate } from '../../../../utils/format';

const Stat = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <p className="text-xs text-muted">{label}</p>
    <p className="text-lg font-semibold text-ink">{children}</p>
  </div>
);

const DeliveryDetails = ({ user }: { user: User }) => {
  const delivery = user.delivery;
  if (!delivery) return null;
  return (
    <div className="grid grid-cols-2 gap-4">
      <Stat label="Calificación">
        <span className="inline-flex items-center gap-1">
          {delivery.calification?.toFixed(1) ?? '—'} <StarIcon className="!h-4 !w-4 text-warn" />
        </span>
      </Stat>
      <Stat label="Saldo en cuenta">{formatCurrency(delivery.balance)}</Stat>
      <Stat label="Validado">{delivery.validated ? 'Sí' : 'Pendiente'}</Stat>
      <Stat label="Disponibilidad">
        <Badge
          label={delivery.isActive ? { text: 'Conectado', tone: 'success' } : { text: 'Desconectado', tone: 'neutral' }}
        />
      </Stat>
    </div>
  );
};

const CustomerDetails = ({ user }: { user: User }) => {
  const navigate = useNavigate();
  const customer = user.customer;
  if (!customer) return null;
  return (
    <div className="space-y-4">
      <DetailList
        items={[
          { label: 'ID de cliente', value: customer.customer_id, mono: true, wide: true },
          { label: 'Última ubicación conocida', value: customer.lat_lang ?? 'Sin datos' },
          { label: 'Cliente desde', value: formatDate(customer.createdAt) },
          { label: 'Baja del perfil de cliente', value: formatDate(customer.deletedAt) },
        ]}
      />
      <Button variant="secondary" size="sm" onClick={() => navigate(`/customers/details/${customer.customer_id}`)}>
        Ver ficha de cliente
      </Button>
    </div>
  );
};

/** Los datos propios del rol: chofer, cliente o administrador. */
export const UserRoleDetails = ({ user }: { user: User }) => {
  const title = user.delivery ? 'Datos de chofer' : user.customer ? 'Datos de cliente' : 'Cuenta administrativa';
  const icon = user.delivery ? (
    <TwoWheelerOutlinedIcon />
  ) : user.customer ? (
    <HomeOutlinedIcon />
  ) : (
    <SecurityOutlinedIcon />
  );

  return (
    <Card className="p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink [&_svg]:h-5 [&_svg]:w-5 [&_svg]:text-muted">
        {icon} {title}
      </h2>
      {user.delivery ? (
        <DeliveryDetails user={user} />
      ) : user.customer ? (
        <CustomerDetails user={user} />
      ) : (
        <EmptyState title="Sin datos adicionales" description="Este usuario tiene permisos administrativos." />
      )}
    </Card>
  );
};

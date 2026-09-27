import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import StarIcon from '@mui/icons-material/Star';
import type { ReactNode } from 'react';
import { Badge, Button, Card } from '../../../common/components/ui';
import type { Delivery } from '../../../services/api/types';
import { useSetDeliveryEnabled, useUpdateDeliveryStatus } from '../../../services/queries/deliveries';
import { driverStatus } from '../../../utils/statusLabels';
import { formatCurrency, formatDate } from '../../../utils/format';
import { confirm, notify } from '../../../utils/notifications';

const Row = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <li className="flex items-center gap-3 text-sm text-ink [&_svg]:h-5 [&_svg]:w-5 [&_svg]:text-muted">
    {icon}
    <span className="min-w-0 truncate">{children}</span>
  </li>
);

export const DeliveryProfileCard = ({ delivery }: { delivery: Delivery }) => {
  const user = delivery.user;
  const initial = user?.full_name?.trim().charAt(0).toUpperCase() ?? '?';
  const setEnabled = useSetDeliveryEnabled();
  const updateValidation = useUpdateDeliveryStatus();

  const handleToggleEnabled = async () => {
    const disabling = delivery.isEnabled;
    if (disabling) {
      const confirmed = await confirm({
        title: '¿Deshabilitar al chofer?',
        text: 'Se desconecta, sale del radar de despacho y no puede volver a ponerse en línea hasta que lo habilites.',
        confirmText: 'Deshabilitar',
        danger: true,
      });
      if (!confirmed) return;
    }
    setEnabled.mutate(
      { id: delivery.delivery_id, isEnabled: !disabling },
      {
        onSuccess: () => notify.success(disabling ? 'Chofer deshabilitado' : 'Chofer habilitado'),
        onError: notify.error,
      },
    );
  };

  const handleToggleValidated = () => {
    updateValidation.mutate(
      { id: delivery.delivery_id, changes: { validated: !delivery.validated } },
      {
        onSuccess: () => notify.success(delivery.validated ? 'Validación retirada' : 'Chofer validado'),
        onError: notify.error,
      },
    );
  };

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-xl font-bold text-primary-strong"
          >
            {initial}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-ink">{user?.full_name ?? 'Sin nombre'}</h2>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge label={driverStatus(delivery)} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" loading={updateValidation.isPending} onClick={handleToggleValidated}>
            {delivery.validated ? 'Quitar validación' : 'Validar'}
          </Button>
          <Button
            variant={delivery.isEnabled ? 'danger' : 'secondary'}
            size="sm"
            loading={setEnabled.isPending}
            onClick={() => void handleToggleEnabled()}
          >
            {delivery.isEnabled ? 'Deshabilitar' : 'Habilitar'}
          </Button>
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        <Row icon={<EmailOutlinedIcon />}>{user?.email ?? '—'}</Row>
        <Row icon={<PhoneOutlinedIcon />}>{user?.phone_number ?? '—'}</Row>
        <Row icon={<CalendarTodayOutlinedIcon />}>Chofer desde {formatDate(delivery.createdAt)}</Row>
      </ul>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-outline pt-5">
        <div className="rounded-xl bg-tinta-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Balance</p>
          <p className={`text-lg font-bold ${delivery.balance < 0 ? 'text-danger' : 'text-ink'}`}>
            {formatCurrency(delivery.balance)}
          </p>
        </div>
        <div className="rounded-xl bg-tinta-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Calificación</p>
          <p className="flex items-center gap-1 text-lg font-bold text-ink">
            <StarIcon aria-hidden="true" className="!h-5 !w-5 text-accent" />
            {delivery.calification === null ? '—' : delivery.calification.toFixed(1)}
          </p>
        </div>
      </div>
    </Card>
  );
};

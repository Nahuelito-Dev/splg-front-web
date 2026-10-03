import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import StarIcon from '@mui/icons-material/Star';
import type { ReactNode } from 'react';
import { Card, DetailList } from '../../../common/components/ui';
import type { Delivery } from '../../../services/api/types';
import { formatCurrency, formatDate } from '../../../utils/format';
import { DeliveryLocationCard } from './DeliveryLocationCard';

const Row = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <li className="flex items-center gap-3 text-sm text-ink [&_svg]:h-5 [&_svg]:w-5 [&_svg]:text-muted">
    {icon}
    <span className="min-w-0 truncate">{children}</span>
  </li>
);

/** Pestaña "Resumen": contacto, antigüedad y los dos números que más se consultan. */
export const DeliveryOverview = ({ delivery }: { delivery: Delivery }) => {
  const user = delivery.user;
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <ul className="space-y-3">
          <Row icon={<EmailOutlinedIcon />}>{user?.email ?? '—'}</Row>
          <Row icon={<PhoneOutlinedIcon />}>{user?.phone_number ?? '—'}</Row>
          <Row icon={<CalendarTodayOutlinedIcon />}>Chofer desde {formatDate(delivery.createdAt)}</Row>
        </ul>

        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-outline pt-5">
          <div className="rounded-xl bg-surface-hover p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Balance</p>
            <p className={`text-lg font-bold ${delivery.balance < 0 ? 'text-danger' : 'text-ink'}`}>
              {formatCurrency(delivery.balance)}
            </p>
          </div>
          <div className="rounded-xl bg-surface-hover p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Calificación</p>
            <p className="flex items-center gap-1 text-lg font-bold text-ink">
              <StarIcon aria-hidden="true" className="!h-5 !w-5 text-accent" />
              {delivery.calification === null ? '—' : delivery.calification.toFixed(1)}
            </p>
          </div>
        </div>

        <DetailList
          className="mt-5 border-t border-outline pt-5"
          items={[
            { label: 'ID de chofer', value: delivery.delivery_id, mono: true, wide: true },
            { label: 'ID de usuario', value: delivery.user_id, mono: true, wide: true },
          ]}
        />
      </Card>
      <DeliveryLocationCard delivery={delivery} />
    </div>
  );
};

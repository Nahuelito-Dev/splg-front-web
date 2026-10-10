import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import type { ReactNode } from 'react';
import { Card, DetailList, EntityPhoto } from '../../../common/components/ui';
import type { Delivery } from '../../../services/api/types';
import { formatDate } from '../../../utils/format';
import { DeliveryLocationCard } from './DeliveryLocationCard';

const Row = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <li className="flex items-center gap-3 text-sm text-ink [&_svg]:h-5 [&_svg]:w-5 [&_svg]:text-muted">
    {icon}
    <span className="min-w-0 truncate">{children}</span>
  </li>
);

/** Pestaña "Resumen": contacto, antigüedad e identificadores (saldo y calificación van en la portada). */
export const DeliveryOverview = ({ delivery }: { delivery: Delivery }) => {
  const user = delivery.user;
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <EntityPhoto
          kind="user"
          id={delivery.user_id}
          url={user?.photoUrl}
          subject="de perfil"
          canEdit
          className="mb-5 max-w-md border-b border-outline pb-5"
        />
        <ul className="space-y-3">
          <Row icon={<EmailOutlinedIcon />}>{user?.email ?? '—'}</Row>
          <Row icon={<PhoneOutlinedIcon />}>{user?.phone_number ?? '—'}</Row>
          <Row icon={<CalendarTodayOutlinedIcon />}>Chofer desde {formatDate(delivery.createdAt)}</Row>
        </ul>

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

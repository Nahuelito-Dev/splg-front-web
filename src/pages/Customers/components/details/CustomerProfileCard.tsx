import { Mail, Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge, Card, DetailList } from '../../../../common/components/ui';
import type { Customer } from '../../../../services/api/types';
import { formatDate } from '../../../../utils/format';
import { roleLabel } from '../../../Users/roleLabel';

const Row = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <li className="flex items-center gap-3 text-sm text-ink [&_svg]:h-5 [&_svg]:w-5 [&_svg]:text-muted">
    {icon}
    <span className="min-w-0 truncate">{children}</span>
  </li>
);

const yesNo = (value: boolean) => (value ? 'Sí' : 'No');

/**
 * Todo lo que devuelven `CustomerResponseDto` y, anidado, `UserResponseDto`.
 * `notification_token` queda afuera a propósito: ni siquiera lo devuelve la
 * API (es el token push del dispositivo, de uso interno) y `lat_lang` es la
 * última posición del dispositivo, no una dirección: se muestra, no se edita
 * desde acá (ver el informe de la tarea).
 */
export const CustomerProfileCard = ({ customer }: { customer: Customer }) => {
  const user = customer.user;
  const initial = user?.full_name?.trim().charAt(0).toUpperCase() ?? '?';

  return (
    <Card className="p-6">
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-xl font-bold text-primary-strong"
        >
          {initial}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-ink">{user?.full_name ?? 'Sin nombre'}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge label={roleLabel(user?.role?.type)} />
            {user?.blocked && <Badge label={{ text: 'Cuenta bloqueada', tone: 'danger' }} />}
          </div>
        </div>
      </div>
      <ul className="mt-5 space-y-3">
        <Row icon={<Mail />}>{user?.email ?? '—'}</Row>
        <Row icon={<Phone />}>{user?.phone_number ?? '—'}</Row>
      </ul>
      <DetailList
        className="mt-5 border-t border-outline pt-5"
        items={[
          { label: 'ID de cliente', value: customer.customer_id, mono: true, wide: true },
          { label: 'ID de usuario', value: customer.user_id, mono: true, wide: true },
          { label: 'Teléfono verificado', value: user ? yesNo(user.phone_verified) : '—' },
          { label: 'Email verificado', value: user ? yesNo(user.email_verified) : '—' },
          { label: 'Última ubicación conocida', value: customer.lat_lang ?? 'Sin datos' },
          { label: 'Cliente desde', value: formatDate(customer.createdAt) },
          { label: 'Cuenta desde', value: user ? formatDate(user.createdAt) : '—' },
          { label: 'Baja del perfil de cliente', value: formatDate(customer.deletedAt) },
          { label: 'Baja de la cuenta', value: user ? formatDate(user.deletedAt) : '—' },
        ]}
      />
    </Card>
  );
};

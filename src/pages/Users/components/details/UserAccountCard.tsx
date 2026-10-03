import { Mail, Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, DetailList } from '../../../../common/components/ui';
import type { User } from '../../../../services/api/types';
import { formatDate } from '../../../../utils/format';

const Row = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <li className="flex items-center gap-3 text-sm text-ink [&_svg]:h-5 [&_svg]:w-5 [&_svg]:text-muted">
    {icon}
    <span className="min-w-0 truncate">{children}</span>
  </li>
);

const yesNo = (value: boolean) => (value ? 'Sí' : 'No');

/** Pestaña "Cuenta": todo lo que devuelve `UserResponseDto`, salvo `firebase_uid` (la API no lo expone). */
export const UserAccountCard = ({ user }: { user: User }) => (
  <Card className="p-6">
    <ul className="space-y-3">
      <Row icon={<Mail />}>{user.email ?? '—'}</Row>
      <Row icon={<Phone />}>{user.phone_number ?? '—'}</Row>
    </ul>
    <DetailList
      className="mt-5 border-t border-outline pt-5"
      items={[
        { label: 'ID de usuario', value: user.user_id, mono: true, wide: true },
        { label: 'Teléfono verificado', value: yesNo(user.phone_verified) },
        { label: 'Email verificado', value: yesNo(user.email_verified) },
        { label: 'Usuario desde', value: formatDate(user.createdAt) },
        { label: 'Baja de la cuenta', value: formatDate(user.deletedAt) },
      ]}
    />
  </Card>
);

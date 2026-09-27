import { Mail, Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge, Card, DetailList } from '../../../../common/components/ui';
import type { User } from '../../../../services/api/types';
import { formatDate } from '../../../../utils/format';
import { roleLabel } from '../../roleLabel';

const Row = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <li className="flex items-center gap-3 text-sm text-ink [&_svg]:h-5 [&_svg]:w-5 [&_svg]:text-muted">
    {icon}
    <span className="min-w-0 truncate">{children}</span>
  </li>
);

const yesNo = (value: boolean) => (value ? 'Sí' : 'No');

/** Todo lo que devuelve `UserResponseDto`, salvo `firebase_uid` (la API no lo expone). */
export const UserProfileCard = ({ user }: { user: User }) => {
  const initial = user.full_name?.trim().charAt(0).toUpperCase() ?? '?';
  return (
    <Card className="p-6">
      <div className="flex items-center gap-4">
        {user.selfie ? (
          <img src={user.selfie} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-xl font-bold text-primary-strong"
          >
            {initial}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-ink">{user.full_name ?? 'Sin nombre'}</h2>
          <div className="mt-1 flex items-center gap-2">
            <Badge label={roleLabel(user.role?.type)} />
            {user.blocked && <Badge label={{ text: 'Bloqueado', tone: 'danger' }} />}
          </div>
        </div>
      </div>
      <ul className="mt-5 space-y-3">
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
};

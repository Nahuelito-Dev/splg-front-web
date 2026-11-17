import { Link } from 'react-router-dom';
import { Badge, Card, EmptyState, IdentityCell } from '../../../common/components/ui';
import type { CompanyAdmin } from '../../../services/api/types';
import { formatDateTime } from '../../../utils/format';

/** Los administradores de la empresa (cuentas del panel): rol de personal, si está bloqueado y su último ingreso. */
export const CompanyAdminsTab = ({ admins }: { admins: CompanyAdmin[] }) => (
  <Card className="p-2 sm:p-4">
    {admins.length === 0 ? (
      <EmptyState title="Sin administradores" description="Esta empresa todavía no tiene administradores." />
    ) : (
      <ul className="divide-y divide-outline">
        {admins.map((admin) => (
          <li key={admin.userId}>
            <Link
              to={`/users/details/${admin.userId}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg px-2 py-3 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <IdentityCell
                title={admin.name ?? 'Sin nombre'}
                subtitle={admin.email ?? undefined}
                avatarName={admin.name ?? admin.email ?? '?'}
              />
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                {admin.blocked && <Badge label={{ text: 'Bloqueado', tone: 'danger' }} />}
                <Badge label={{ text: admin.staffRole ?? 'Sin rol de personal', tone: 'neutral' }} />
                <span>
                  {admin.lastLoginAt ? `Último ingreso: ${formatDateTime(admin.lastLoginAt)}` : 'Nunca ingresó'}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    )}
  </Card>
);

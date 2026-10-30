import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  IdentityCell,
  LoadingState,
  CardHeader,
} from '../../../common/components/ui';
import { useAdmins } from '../../../services/queries/admins';
import { roleLabel } from '../../Users/roleLabel';

/** Los administradores de una empresa: `GET /admin?distributorId=` los trae aunque se esté «viendo como» otra. */
export const DistributorAdmins = ({ distributorId }: { distributorId: string }) => {
  const navigate = useNavigate();
  const { data, isPending, error, refetch } = useAdmins(distributorId);
  const admins = data ?? [];

  return (
    <Card className="p-6">
      <CardHeader title="Administradores" className="mb-4" />
      {isPending ? (
        <LoadingState label="Cargando administradores…" />
      ) : error ? (
        <ErrorState error={error} resource="Los administradores" onRetry={() => void refetch()} />
      ) : admins.length === 0 ? (
        <EmptyState title="Sin administradores" description="Esta empresa todavía no tiene administradores." />
      ) : (
        <ul className="divide-y divide-outline">
          {admins.map((admin) => (
            <li key={admin.admin_id}>
              <button
                type="button"
                onClick={() => navigate(`/users/details/${admin.user_id}`)}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-3 text-left hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <IdentityCell
                  title={admin.user?.full_name ?? 'Sin nombre'}
                  subtitle={admin.user?.email ?? undefined}
                  avatarName={admin.user?.full_name ?? '?'}
                  person={{ userId: admin.user_id }}
                />
                <Badge label={roleLabel(admin.user?.role?.type ?? admin.role?.type)} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

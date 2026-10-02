import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GridPaginationModel } from '@mui/x-data-grid';
import { SearchCheck } from 'lucide-react';
import { Button, Card, ErrorState, LoadingState, PageHeader, SearchInput } from '../../common/components/ui';
import { useDebounce, usePermissions } from '../../hooks';
import type { User } from '../../services/api/types';
import { useBlockUser, useDeleteUser, useUsers } from '../../services/queries/users';
import { confirm, notify } from '../../utils/notifications';
import { FindUserByPhoneModal } from './components/FindUserByPhoneModal';
import { UserEditModal } from './components/UserEditModal';
import { UsersTable } from './components/UsersTable';

export const Users = () => {
  const navigate = useNavigate();
  const { canManageCustomerAccounts } = usePermissions();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim());
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [editing, setEditing] = useState<User | null>(null);
  const [findingByPhone, setFindingByPhone] = useState(false);

  const { data, isLoading, isFetching, error, refetch } = useUsers(pagination, debouncedSearch);
  const blockUser = useBlockUser();
  const deleteUser = useDeleteUser();

  const handleSearch = (value: string) => {
    setSearch(value);
    setPagination((p) => ({ ...p, page: 0 }));
  };

  const handleToggleBlock = async (user: User) => {
    const block = !user.blocked;
    const confirmed = await confirm({
      title: block ? '¿Bloquear usuario?' : '¿Desbloquear usuario?',
      text: block
        ? `${user.full_name ?? 'El usuario'} no va a poder operar hasta desbloquearlo.`
        : `${user.full_name ?? 'El usuario'} vuelve a poder operar.`,
      confirmText: block ? 'Bloquear' : 'Desbloquear',
      danger: block,
    });
    if (!confirmed) return;
    blockUser.mutate(
      { userId: user.user_id, block },
      { onSuccess: () => notify.success(block ? 'Usuario bloqueado' : 'Usuario desbloqueado'), onError: notify.error },
    );
  };

  const handleDelete = async (user: User) => {
    const confirmed = await confirm({
      title: '¿Dar de baja al usuario?',
      text: `${user.full_name ?? 'El usuario'} no va a poder volver a entrar.`,
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (!confirmed) return;
    deleteUser.mutate(user.user_id, {
      onSuccess: () => notify.success('Usuario dado de baja'),
      onError: notify.error,
    });
  };

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Usuarios"
        description="Todos los usuarios de la plataforma: clientes, choferes y administradores."
        actions={
          <Button variant="secondary" icon={<SearchCheck />} onClick={() => setFindingByPhone(true)}>
            Buscar por teléfono
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-outline p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            label="Buscar usuarios"
            placeholder="Nombre, email o teléfono"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <p className="text-sm text-muted" aria-live="polite">
            {data ? `${data.total} ${data.total === 1 ? 'usuario' : 'usuarios'}` : ''}
          </p>
        </div>
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} resource="Los usuarios" onRetry={() => void refetch()} />
        ) : (
          <UsersTable
            rows={data?.rows ?? []}
            total={data?.total ?? 0}
            loading={isFetching}
            pagination={pagination}
            onPaginationChange={setPagination}
            canManageCustomerAccounts={canManageCustomerAccounts}
            onEdit={setEditing}
            onToggleBlock={(user) => void handleToggleBlock(user)}
            onDelete={(user) => void handleDelete(user)}
          />
        )}
      </Card>

      <UserEditModal open={editing !== null} onClose={() => setEditing(null)} user={editing} />
      <FindUserByPhoneModal
        open={findingByPhone}
        onClose={() => setFindingByPhone(false)}
        onFound={(user) => navigate(`/users/details/${user.user_id}`)}
      />
    </div>
  );
};

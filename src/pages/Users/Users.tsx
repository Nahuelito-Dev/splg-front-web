import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GridPaginationModel } from '@mui/x-data-grid';
import { SearchCheck } from 'lucide-react';
import {
  Button,
  Card,
  ErrorState,
  ListSkeleton,
  PageHeader,
  Tabs,
  tabPanelProps,
  type FilterChip,
  type TabItem,
  PageContainer,
  TableToolbar,
} from '../../common/components/ui';
import { useDebounce, usePermissions, useUrlParams } from '../../hooks';
import type { User } from '../../services/api/types';
import {
  useBlockUser,
  useDeleteUser,
  useUserRoleCounts,
  useUsersByRole,
  type UserRoleTab,
} from '../../services/queries/users';
import { confirm, notify } from '../../utils/notifications';
import { FindUserByPhoneModal } from './components/FindUserByPhoneModal';
import { UserEditModal } from './components/UserEditModal';
import { UsersTable } from './components/UsersTable';

const ROLE_TABS: { id: UserRoleTab; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'admin', label: 'Administradores' },
  { id: 'super_admin', label: 'Super administradores' },
  { id: 'delivery', label: 'Choferes' },
  { id: 'customer', label: 'Clientes' },
];

const TABS_ID = 'users';

export const Users = () => {
  const navigate = useNavigate();
  const { canManageCustomerAccounts, isSuperAdmin, needsDistributor, readOnly } = usePermissions();
  // El rol y la búsqueda viven en la URL: al volver de una ficha o recargar, la lista queda como estaba.
  const [{ role: roleParam, q: search, page: pageParam }, setFilters] = useUrlParams({ role: 'all', q: '', page: '1' });
  const visibleTabs = ROLE_TABS.filter((tab) => tab.id !== 'super_admin' || isSuperAdmin);
  const role: UserRoleTab = visibleTabs.find((tab) => tab.id === roleParam)?.id ?? 'all';
  const debouncedSearch = useDebounce(search.trim());
  const pagination: GridPaginationModel = { page: Math.max(0, Number(pageParam) - 1 || 0), pageSize: 10 };
  const setPagination = (model: GridPaginationModel) => setFilters({ page: String(model.page + 1) });
  const [editing, setEditing] = useState<User | null>(null);
  const [findingByPhone, setFindingByPhone] = useState(false);

  const { data, isLoading, isFetching, error, refetch } = useUsersByRole(role, pagination, debouncedSearch);
  const counts = useUserRoleCounts();
  // Una `?page=` fuera de rango vuelve a la primera.
  useEffect(() => {
    if (data && !isFetching && data.total > 0 && data.rows.length === 0 && pagination.page > 0)
      setFilters({ page: '1' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isFetching, pagination.page]);
  const blockUser = useBlockUser();
  const deleteUser = useDeleteUser();

  const handleSearch = (value: string) => {
    setFilters({ q: value, page: '1' });
  };

  const handleRole = (value: string) => {
    setFilters({ role: value, page: '1' });
  };

  const tabs: TabItem[] = visibleTabs.map((tab) => ({ id: tab.id, label: tab.label, count: counts[tab.id] }));
  const chips: FilterChip[] = [];
  if (role !== 'all') chips.push({ key: 'role', label: visibleTabs.find((tab) => tab.id === role)?.label ?? role });
  if (search.trim()) chips.push({ key: 'q', label: `"${search.trim()}"` });
  const removeChip = (key: string) => (key === 'role' ? handleRole('all') : handleSearch(''));

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
      text: `${user.full_name ?? 'El usuario'} no va a poder volver a entrar. Baja lógica: la cuenta y su historial no se borran.`,
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
    <PageContainer>
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
        {isLoading ? (
          <ListSkeleton />
        ) : error ? (
          <ErrorState error={error} resource="Los usuarios" onRetry={() => void refetch()} />
        ) : (
          <>
            <Tabs items={tabs} value={role} onChange={handleRole} label="Filtrar usuarios por rol" idPrefix={TABS_ID} />
            <div {...tabPanelProps(TABS_ID, role)}>
              <TableToolbar
                search={{
                  label: 'Buscar usuarios',
                  placeholder: 'Nombre, email o teléfono',
                  value: search,
                  onChange: (value) => handleSearch(value),
                }}
                chips={chips}
                onRemoveChip={removeChip}
                onClearChips={() => {
                  setFilters({ role: 'all', q: '', page: '1' });
                }}
                resultCount={data?.total}
                noun={['usuario', 'usuarios']}
              />
              <UsersTable
                rows={data?.rows ?? []}
                total={data?.total ?? 0}
                loading={isFetching}
                filtered={chips.length > 0}
                pagination={pagination}
                onPaginationChange={setPagination}
                canManageCustomerAccounts={canManageCustomerAccounts}
                needsDistributor={needsDistributor}
                readOnly={readOnly}
                onEdit={setEditing}
                onToggleBlock={(user) => void handleToggleBlock(user)}
                onDelete={(user) => void handleDelete(user)}
              />
            </div>
          </>
        )}
      </Card>

      <UserEditModal open={editing !== null} onClose={() => setEditing(null)} user={editing} />
      <FindUserByPhoneModal
        open={findingByPhone}
        onClose={() => setFindingByPhone(false)}
        onFound={(user) => navigate(`/users/details/${user.user_id}`)}
      />
    </PageContainer>
  );
};

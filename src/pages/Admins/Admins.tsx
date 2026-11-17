import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  IdentityCell,
  TableSkeleton,
  PageHeader,
  SearchInput,
  PageContainer,
} from '../../common/components/ui';
import { missingPermisoHint, useDebounce, usePermiso, usePermissions } from '../../hooks';
import { useAdmins, useFindAdminByTerm } from '../../services/queries/admins';
import type { Admin } from '../../services/api/types';
import { roleLabel } from '../Users/roleLabel';
import { AdminsTable } from './components/AdminsTable';
import { CreateAdminModal } from './components/CreateAdminModal';
import { EditAdminModal } from './components/EditAdminModal';
import { AssignStaffRoleModal } from './components/AssignStaffRoleModal';
import { useAdminManagement } from './useAdminManagement';
import { useStaffRoleChange } from './useStaffRoleChange';

/** CU-088: resultado puntual de `GET /admin/term/:term` (id o correo), distinto a la fila de la tabla. */
const SearchResult = ({ term }: { term: string }) => {
  const navigate = useNavigate();
  const { data, isFetching, isError } = useFindAdminByTerm(term);
  if (isFetching) return <TableSkeleton rows={2} columns={3} />;
  if (isError || !data) {
    return <EmptyState title="Sin resultados" description={`Ningún admin tiene id o correo "${term}".`} />;
  }
  return (
    <button
      type="button"
      onClick={() => navigate(`/admins/${data.admin_id}`)}
      className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-surface-hover"
    >
      <IdentityCell title={data.fullName ?? data.displayName ?? 'Sin nombre'} subtitle={data.email ?? undefined} />
      <span className="text-sm text-muted">{roleLabel(data.rol).text}</span>
    </button>
  );
};

export const Admins = () => {
  const { isSuperAdmin, readOnly, writeHint } = usePermissions();
  const staffRoleChange = useStaffRoleChange();
  // El alta pide `administradores.gestionar` en la API.
  const manageAdmins = usePermiso('administradores.gestionar');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Admin | null>(null);
  const [changingStaffRole, setChangingStaffRole] = useState<Admin | null>(null);
  const { stateOf, remove, blockedReason } = useAdminManagement();
  const handleDelete = useCallback((admin: Admin) => void remove(admin), [remove]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim());
  const { data: admins, isLoading, isFetching, error, refetch } = useAdmins();

  return (
    <PageContainer>
      <PageHeader
        title="Administradores"
        description="Gestión de admins por empresa (distribuidora)."
        actions={
          <Button
            icon={<PersonAddAlt1Icon />}
            onClick={() => setCreateOpen(true)}
            blockedReason={readOnly ? writeHint : missingPermisoHint(manageAdmins, 'Gestionar los administradores')}
          >
            Nuevo admin
          </Button>
        }
      />

      <Card>
        <div className="border-b border-outline p-4">
          <SearchInput
            label="Buscar un admin por id o correo"
            placeholder="ID de administrador o correo exacto"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {debouncedSearch.length >= 3 ? (
          <SearchResult term={debouncedSearch} />
        ) : isLoading ? (
          <TableSkeleton columns={3} />
        ) : error ? (
          <ErrorState error={error} resource="Los administradores" onRetry={() => void refetch()} />
        ) : (
          <AdminsTable
            rows={admins ?? []}
            loading={isFetching}
            stateOf={stateOf}
            blockedReason={blockedReason}
            onEdit={setEditing}
            onDelete={handleDelete}
            onChangeStaffRole={staffRoleChange.allowed ? setChangingStaffRole : undefined}
            changeStaffRoleBlockedReason={staffRoleChange.blockedReasonFor}
          />
        )}
      </Card>

      <EditAdminModal admin={editing} onClose={() => setEditing(null)} />
      <AssignStaffRoleModal admin={changingStaffRole} onClose={() => setChangingStaffRole(null)} />
      <CreateAdminModal open={createOpen} onClose={() => setCreateOpen(false)} isSuperAdmin={isSuperAdmin} />
    </PageContainer>
  );
};

import { useState } from 'react';
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
} from '../../common/components/ui';
import { useDebounce, usePermissions } from '../../hooks';
import { useAdmins, useFindAdminByTerm } from '../../services/queries/admins';
import { roleLabel } from '../Users/roleLabel';
import { AdminsTable } from './components/AdminsTable';
import { CreateAdminModal } from './components/CreateAdminModal';

/** CU-088: resultado puntual de `GET /admin/term/:term` (id o correo), distinto a la fila de la tabla. */
const SearchResult = ({ term }: { term: string }) => {
  const navigate = useNavigate();
  const { data, isFetching, isError } = useFindAdminByTerm(term);
  const { data: admins } = useAdmins();
  // La búsqueda devuelve `admin_id`; la ficha de usuario se abre con `user_id`, que sale de la lista.
  const userId = admins?.find((admin) => admin.admin_id === data?.admin_id)?.user_id;
  if (isFetching) return <TableSkeleton rows={2} columns={3} />;
  if (isError || !data) {
    return <EmptyState title="Sin resultados" description={`Ningún admin tiene id o correo "${term}".`} />;
  }
  return (
    <button
      type="button"
      disabled={!userId}
      title={userId ? undefined : 'No está entre los administradores de la empresa que estás viendo'}
      onClick={() => userId && navigate(`/users/details/${userId}`)}
      className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-surface-hover disabled:cursor-default disabled:hover:bg-transparent"
    >
      <IdentityCell title={data.fullName ?? data.displayName ?? 'Sin nombre'} subtitle={data.email ?? undefined} />
      <span className="text-sm text-muted">{roleLabel(data.rol).text}</span>
    </button>
  );
};

export const Admins = () => {
  const { isSuperAdmin } = usePermissions();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim());
  const { data: admins, isLoading, isFetching, error, refetch } = useAdmins();

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Administradores"
        description="Gestión de admins por empresa (distribuidora)."
        actions={
          <Button icon={<PersonAddAlt1Icon />} onClick={() => setCreateOpen(true)}>
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
          <AdminsTable rows={admins ?? []} loading={isFetching} />
        )}
      </Card>

      <CreateAdminModal open={createOpen} onClose={() => setCreateOpen(false)} isSuperAdmin={isSuperAdmin} />
    </div>
  );
};

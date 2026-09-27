import { useState } from 'react';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { Button, Card, ErrorState, LoadingState, PageHeader } from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import { useAdmins } from '../../services/queries/admins';
import { AdminsTable } from './components/AdminsTable';
import { CreateAdminModal } from './components/CreateAdminModal';

export const Admins = () => {
  const { isSuperAdmin } = usePermissions();
  const [createOpen, setCreateOpen] = useState(false);
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
        {isLoading ? (
          <LoadingState />
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

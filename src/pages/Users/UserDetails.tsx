import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BlockIcon from '@mui/icons-material/Block';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import { Button, ErrorState, IconButton, LoadingState } from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import { useBlockUser, useDeleteUser, useUser } from '../../services/queries/users';
import { confirm, notify } from '../../utils/notifications';
import { UserEditModal } from './components/UserEditModal';
import { UserProfileCard } from './components/details/UserProfileCard';
import { UserRoleDetails } from './components/details/UserRoleDetails';

export const UserDetails = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { canManageCustomerAccounts } = usePermissions();
  const { data: user, isPending, error, refetch } = useUser(leadId);
  const [editing, setEditing] = useState(false);
  const blockUser = useBlockUser();
  const deleteUser = useDeleteUser();

  const canManage = Boolean(user) && (canManageCustomerAccounts || !user?.customer);

  const handleToggleBlock = async () => {
    if (!user) return;
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

  const handleDelete = async () => {
    if (!user) return;
    const confirmed = await confirm({
      title: '¿Dar de baja al usuario?',
      text: `${user.full_name ?? 'El usuario'} no va a poder volver a entrar.`,
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (!confirmed) return;
    deleteUser.mutate(user.user_id, {
      onSuccess: () => {
        notify.success('Usuario dado de baja');
        navigate('/users');
      },
      onError: notify.error,
    });
  };

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconButton label="Volver a usuarios" icon={<ArrowBackIcon />} onClick={() => navigate('/users')} />
          <h1 className="text-2xl font-bold tracking-tight text-ink">Ficha del usuario</h1>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={<EditOutlinedIcon />} onClick={() => setEditing(true)}>
              Editar cuenta
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={user?.blocked ? <LockOpenOutlinedIcon /> : <BlockIcon />}
              onClick={() => void handleToggleBlock()}
            >
              {user?.blocked ? 'Desbloquear' : 'Bloquear'}
            </Button>
            <Button variant="danger" size="sm" icon={<DeleteOutlineIcon />} onClick={() => void handleDelete()}>
              Dar de baja
            </Button>
          </div>
        )}
      </div>

      {isPending ? (
        <LoadingState />
      ) : error || !user ? (
        <ErrorState error={error} resource="El usuario" onRetry={() => void refetch()} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <UserProfileCard user={user} />
          <div className="lg:col-span-2">
            <UserRoleDetails user={user} />
          </div>
        </div>
      )}

      <UserEditModal open={editing} onClose={() => setEditing(false)} user={user ?? null} />
    </div>
  );
};

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BlockIcon from '@mui/icons-material/Block';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import {
  AuditHistoryLink,
  Avatar,
  Badge,
  Button,
  Card,
  EntityPhoto,
  ErrorState,
  PageCover,
  PageHeader,
  PhotoThumb,
  ProfileSkeleton,
  ProfileTabPanel,
  ProfileTabs,
  type CoverStat,
  type ProfileTabItem,
} from '../../common/components/ui';
import { useBackToList, usePermissions, useProfileTab } from '../../hooks';
import { useCrumbLeaf } from '../../common/components';
import { useBlockUser, useDeleteUser, useUser } from '../../services/queries/users';
import { confirm, notify } from '../../utils/notifications';
import { UserEditModal } from './components/UserEditModal';
import { UserAccountCard } from './components/details/UserAccountCard';
import { UserRoleDetails } from './components/details/UserRoleDetails';
import { roleLabel } from './roleLabel';
import { formatDate } from '../../utils/format';

const TABS: ProfileTabItem[] = [
  { key: 'account', label: 'Cuenta' },
  { key: 'role', label: 'Rol' },
];

export const UserDetails = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const goBack = useBackToList('/users');
  const [tab, setTab] = useProfileTab(
    TABS.map((t) => t.key),
    'account',
  );
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
      text: `${user.full_name ?? 'El usuario'} no va a poder volver a entrar. Baja lógica: la cuenta y su historial no se borran.`,
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

  const name = user?.full_name ?? 'Sin nombre';
  useCrumbLeaf(user ? name : undefined, goBack);
  const yesNo = (value: boolean) => (value ? 'Verificado' : 'Sin verificar');
  const stats: CoverStat[] = user
    ? [
        { label: 'Usuario desde', value: formatDate(user.createdAt) },
        { label: 'Teléfono', value: yesNo(user.phone_verified), hint: user.phone_number ?? undefined },
        { label: 'Email', value: yesNo(user.email_verified), hint: user.email ?? undefined },
      ]
    : [];

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader
        title="Ficha del usuario"
        actions={
          user && (
            <>
              <AuditHistoryLink entity="User" recordId={user.user_id} />
              {canManage && (
                <>
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
                </>
              )}
            </>
          )
        }
      />

      {isPending ? (
        <ProfileSkeleton />
      ) : error || !user ? (
        <ErrorState error={error} resource="El usuario" onRetry={() => void refetch()} />
      ) : (
        <>
          <PageCover
            avatar={
              <PhotoThumb
                kind="user"
                id={user.user_id}
                url={user.photoUrl}
                size="lg"
                fallback={
                  user.selfie ? (
                    <img src={user.selfie} alt="" className="h-14 w-14 rounded-full object-cover" />
                  ) : (
                    <Avatar name={name} size="lg" />
                  )
                }
              />
            }
            title={name}
            subtitle={user.email ?? undefined}
            badges={
              <>
                <Badge label={roleLabel(user.role?.type)} />
                {user.blocked && <Badge label={{ text: 'Bloqueado', tone: 'danger' }} />}
              </>
            }
            stats={stats}
          >
            <ProfileTabs tabs={TABS} value={tab} onChange={setTab} />
          </PageCover>

          <ProfileTabPanel tabKey="account" value={tab}>
            <div className="space-y-6">
              <Card className="p-6">
                <EntityPhoto
                  kind="user"
                  id={user.user_id}
                  url={user.photoUrl}
                  subject="de perfil"
                  canEdit={canManage}
                  className="max-w-md"
                />
              </Card>
              <UserAccountCard user={user} />
            </div>
          </ProfileTabPanel>
          <ProfileTabPanel tabKey="role" value={tab}>
            <UserRoleDetails user={user} />
          </ProfileTabPanel>
        </>
      )}

      <UserEditModal open={editing} onClose={() => setEditing(false)} user={user ?? null} />
    </div>
  );
};

import {
  Avatar,
  Badge,
  Card,
  DetailSkeleton,
  EntityPhoto,
  ErrorState,
  PageHeader,
  PhotoThumb,
} from '../../common/components/ui';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { startLogOut } from '../../store/auth/thunks';
import { useMyAccount } from '../../services/queries/users';
import { roleLabel } from '../Users/roleLabel';
import { ChangeEmailForm } from './components/ChangeEmailForm';
import { PasswordResetCard } from './components/PasswordResetCard';
import { ProfileForm } from './components/ProfileForm';

/** "Mi cuenta": los datos del admin logueado, su correo y su contraseña. */
export const Account = () => {
  const dispatch = useAppDispatch();
  const { email } = useAppSelector((state) => state.auth);
  const { data: user, isPending, error, refetch } = useMyAccount(email);
  const currentEmail = user?.email ?? email ?? '';

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      <PageHeader title="Mi cuenta" description="Tus datos de acceso al panel." />
      {isPending ? (
        <DetailSkeleton />
      ) : error || !user ? (
        <ErrorState error={error} resource="Tu cuenta" onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-6">
          <Card className="flex items-center gap-4 p-6">
            <PhotoThumb
              kind="user"
              id="me"
              url={user.photoUrl}
              size="lg"
              fallback={<Avatar name={user.full_name ?? currentEmail} size="lg" />}
            />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-ink">{user.full_name ?? 'Sin nombre'}</h2>
              <p className="truncate text-sm text-muted">{currentEmail}</p>
              <div className="mt-1.5">
                <Badge label={roleLabel(user.role?.type)} />
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <EntityPhoto kind="user" id="me" url={user.photoUrl} subject="de perfil" canEdit className="max-w-md" />
          </Card>
          <ProfileForm user={user} />
          <ChangeEmailForm currentEmail={currentEmail} onChanged={() => void dispatch(startLogOut())} />
          <PasswordResetCard email={currentEmail} />
        </div>
      )}
    </div>
  );
};

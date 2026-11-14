import {
  Avatar,
  Badge,
  Card,
  DetailSkeleton,
  EntityPhoto,
  ErrorState,
  PageHeader,
  PhotoThumb,
  PageContainer,
} from '../../common/components/ui';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { useSupportSession } from '../../hooks/useSupportSession';
import { startLogOut } from '../../store/auth/thunks';
import { useMyAccount } from '../../services/queries/users';
import { roleLabel } from '../Users/roleLabel';
import { ChangeEmailForm } from './components/ChangeEmailForm';
import { PasswordResetCard } from './components/PasswordResetCard';
import { ProfileForm } from './components/ProfileForm';

/** Lo que se le dice al administrador general que quiere editar su cuenta en modo soporte. */
export const ACCOUNT_SUPPORT_HINT = 'Salí del modo soporte para editar tu cuenta';

/**
 * "Mi cuenta": los datos del admin logueado, su correo y su contraseña. En modo soporte todo pedido viaja con la sesión
 * y el back rechaza las escrituras: foto, perfil, correo y contraseña quedan apagados con el aviso.
 */
export const Account = () => {
  const dispatch = useAppDispatch();
  const { email } = useAppSelector((state) => state.auth);
  const { data: user, isPending, error, refetch } = useMyAccount(email);
  const currentEmail = user?.email ?? email ?? '';
  const inSupport = useSupportSession().active !== null;

  return (
    <PageContainer size="sm">
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
          {inSupport && (
            <p role="status" className="rounded-lg border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
              {ACCOUNT_SUPPORT_HINT}.
            </p>
          )}
          <Card className="p-6">
            <EntityPhoto
              kind="user"
              id="me"
              url={user.photoUrl}
              subject="de perfil"
              canEdit
              blockedReason={inSupport ? ACCOUNT_SUPPORT_HINT : undefined}
              className="max-w-md"
            />
          </Card>
          {/* Un `fieldset` deshabilitado apaga de una vez los campos y botones de los tres formularios. */}
          <fieldset disabled={inSupport} title={inSupport ? ACCOUNT_SUPPORT_HINT : undefined} className="space-y-6">
            <ProfileForm user={user} />
            <ChangeEmailForm currentEmail={currentEmail} onChanged={() => void dispatch(startLogOut())} />
            <PasswordResetCard email={currentEmail} />
          </fieldset>
        </div>
      )}
    </PageContainer>
  );
};

import { Badge, UserRefLink } from '../../../common/components/ui';
import { useUser } from '../../../services/queries/users';
import { formatDateTime } from '../../../utils/format';

interface Props {
  isDefault: boolean;
  updatedAt: string | null;
  updatedByUserId: string | null;
}

/** Si la distribuidora usa los valores por defecto, o quién y cuándo los modificó por última vez. */
export const SettingsMeta = ({ isDefault, updatedAt, updatedByUserId }: Props) => {
  const { data: user, isPending, isError } = useUser(updatedByUserId ?? undefined);
  // Lo cambió alguien de la plataforma (p. ej. las frecuencias de las tareas) o una cuenta que no se puede leer: se
  // dice eso, nunca un id suelto.
  const byPlatform = Boolean(updatedByUserId) && (isError || user?.role?.type === 'super_admin');
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
      {isDefault && <Badge label={{ text: 'Valores por defecto', tone: 'info' }} />}
      {updatedAt && (
        <p>
          Modificado
          {byPlatform ? (
            ' por la plataforma'
          ) : updatedByUserId ? (
            <>
              {' por '}
              <UserRefLink userId={updatedByUserId} name={user?.full_name} loading={isPending} />
            </>
          ) : null}
          {` el ${formatDateTime(updatedAt)}`}
        </p>
      )}
      {isDefault && !updatedAt && <p>Nadie la modificó todavía.</p>}
    </div>
  );
};

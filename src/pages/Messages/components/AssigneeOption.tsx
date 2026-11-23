import type { ReactNode } from 'react';
import { Avatar, cx, PhotoThumb } from '../../../common/components/ui';

interface Props {
  /** El nombre de la persona (las iniciales de la foto). */
  name: string;
  /** Lo que se lee en la fila, si no es el nombre («Yo»). */
  label?: string;
  /** Lo que va debajo del nombre («Vos», «Vuelve a la cola»). */
  detail?: string;
  /** La foto firmada que mandó la API; si venció, se pide otra con `userId`. */
  photoUrl?: string;
  /** Id de usuario de la persona, para renovar su foto. */
  userId?: string;
  /** En lugar de la foto (la cola no es una persona). */
  icon?: ReactNode;
  value: string;
  checked: boolean;
  onSelect: (value: string) => void;
  disabled?: boolean;
}

/** Una opción del modal de asignar: un radio con la foto y el nombre, toda la fila es el blanco del clic. */
export const AssigneeOption = ({
  name,
  label,
  detail,
  photoUrl,
  userId,
  icon,
  value,
  checked,
  onSelect,
  disabled,
}: Props) => (
  <label
    className={cx(
      'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40',
      checked ? 'border-primary-edge bg-primary-soft' : 'border-outline hover:bg-surface-hover',
      disabled && 'cursor-not-allowed opacity-60',
    )}
  >
    <input
      type="radio"
      name="assignee"
      value={value}
      checked={checked}
      disabled={disabled}
      onChange={() => onSelect(value)}
      className="sr-only"
    />
    {icon ??
      (userId ? (
        <PhotoThumb kind="user" id={userId} url={photoUrl} fallback={<Avatar name={name} size="md" />} />
      ) : (
        <Avatar name={name} size="md" />
      ))}
    <span className="grid min-w-0 flex-1">
      <span className="truncate text-sm font-medium text-ink">{label ?? name}</span>
      {detail && <span className="truncate text-xs text-muted">{detail}</span>}
    </span>
    <span
      aria-hidden="true"
      className={cx(
        'grid h-4 w-4 shrink-0 place-items-center rounded-full border',
        checked ? 'border-primary' : 'border-outline',
      )}
    >
      {checked && <span className="h-2 w-2 rounded-full bg-primary" />}
    </span>
  </label>
);

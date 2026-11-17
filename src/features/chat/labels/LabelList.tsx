import { cx } from '../../../common/components/ui';
import type { InboxLabel } from '../../../services/api/types';
import { LabelChip } from './LabelChip';

interface Props {
  labels: InboxLabel[] | undefined;
  /** Cuántas se dibujan; el resto va como «+N» (con los nombres en el título). */
  max?: number;
  size?: 'xs' | 'sm';
  /**
   * Dentro de un enlace (la fila de la bandeja): sólo contenido en línea (`span`), los chips ocultos al lector de
   * pantalla y un «2 etiquetas» corto, para que el nombre del enlace no lea todas de corrido.
   */
  inline?: boolean;
  className?: string;
}

const countText = (count: number) => (count === 1 ? '1 etiqueta' : `${count} etiquetas`);

/** Las etiquetas de una conversación, en el orden de la API (por nombre). Sin etiquetas no dibuja nada. */
export const LabelList = ({ labels, max = 5, size = 'sm', inline = false, className }: Props) => {
  if (!labels?.length) return null;
  const shown = labels.slice(0, max);
  const rest = labels.slice(max);
  const restNames = rest.map((label) => label.name).join(', ');
  const more = rest.length > 0 && (
    <span
      className="rounded-full bg-surface-muted px-1.5 text-[10px] font-medium leading-[18px] text-ink-2"
      title={restNames}
    >
      +{rest.length}
      {!inline && <span className="sr-only"> etiquetas más: {restNames}</span>}
    </span>
  );
  const classes = cx('flex min-w-0 flex-wrap items-center gap-1', className);
  if (inline) {
    return (
      <span className={classes}>
        <span aria-hidden="true" className="contents">
          {shown.map((label) => (
            <span key={label.id} className="min-w-0 max-w-[12rem]">
              <LabelChip name={label.name} color={label.color} size={size} />
            </span>
          ))}
          {more}
        </span>
        <span className="sr-only">, {countText(labels.length)}</span>
      </span>
    );
  }
  return (
    <ul className={classes} aria-label="Etiquetas">
      {shown.map((label) => (
        <li key={label.id} className="min-w-0 max-w-[12rem]">
          <LabelChip name={label.name} color={label.color} size={size} />
        </li>
      ))}
      {more && <li>{more}</li>}
    </ul>
  );
};

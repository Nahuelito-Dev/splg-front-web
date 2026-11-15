import { cx } from '../../../common/components/ui';
import { counterLevel } from '../faqRules';

interface Props {
  id: string;
  length: number;
  max: number;
}

/** Lo que se anuncia al cruzar un umbral (no en cada tecla): el texto cambia sólo al pasar el 90 % y el tope. */
const ANNOUNCEMENT = {
  ok: () => '',
  near: (max: number) => `Cerca del máximo de ${max} caracteres`,
  over: (max: number) => `Pasaste el máximo de ${max} caracteres`,
} as const;

/** Contador de caracteres (como los cuenta el back): en tono de error al pasarse, y anunciado al acercarse y al pasarse. */
export const CharCounter = ({ id, length, max }: Props) => {
  const level = counterLevel(length, max);
  return (
    <div className="-mt-2 flex justify-end">
      <p id={id} className={cx('text-xs tabular-nums', level === 'over' ? 'font-semibold text-danger' : 'text-muted')}>
        <span className="sr-only">Caracteres: </span>
        {`${length}/${max}`}
      </p>
      <span className="sr-only" aria-live="polite">
        {ANNOUNCEMENT[level](max)}
      </span>
    </div>
  );
};

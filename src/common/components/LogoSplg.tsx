import { cx } from './ui/cx';

type Size = 'sm' | 'lg';

interface Props {
  className?: string;
  size?: Size;
  /** `claro` sobre fondos oscuros (menú lateral), `oscuro` sobre claros. */
  variante?: 'claro' | 'oscuro';
  /** Línea debajo del nombre (p. ej. "Gestión de reparto"). */
  subtitle?: string;
}

const SIZES: Record<Size, { mark: string; flame: string; name: string }> = {
  sm: { mark: 'h-8 w-8 rounded-[9px]', flame: 'h-[17px] w-[17px]', name: 'text-base' },
  lg: { mark: 'h-12 w-12 rounded-[13px]', flame: 'h-6 w-6', name: 'text-3xl' },
};

/**
 * La marca del panel: la llama sobre un cuadrado con degradé y el nombre.
 * Es el nombre del sistema, no el de la distribuidora: el panel lo usa
 * cualquier empresa que opere con él.
 */
export const LogoSplg = ({ className, size = 'sm', variante = 'claro', subtitle }: Props) => (
  <div className={cx('flex select-none items-center gap-2.5', className)}>
    <span
      aria-hidden="true"
      className={cx(
        'grid shrink-0 place-items-center bg-gradient-to-br from-llama-400 via-llama-500 to-llama-700 shadow-mark',
        SIZES[size].mark,
      )}
    >
      <svg viewBox="0 0 24 24" className={cx('fill-white', SIZES[size].flame)}>
        <path d="M12 1.8c1 3.6 5.6 6 5.6 11.6A5.6 5.6 0 0 1 6.4 13.4c0-2.9 1.5-4.8 2.8-6.3.4 1.8 1.2 2.9 2.4 3.4.3-3.2-.3-5.9.4-8.7z" />
      </svg>
    </span>
    <span className="leading-tight">
      <span
        className={cx(
          'block font-bold tracking-[-0.02em]',
          SIZES[size].name,
          variante === 'claro' ? 'text-white' : 'text-ink',
        )}
      >
        SPLG
      </span>
      {subtitle && (
        <span className={cx('block text-[11px] font-medium', variante === 'claro' ? 'text-side-text' : 'text-muted')}>
          {subtitle}
        </span>
      )}
    </span>
  </div>
);

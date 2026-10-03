import { cx } from './cx';

export type EmptyVariant = 'box' | 'search' | 'done';

interface Props {
  variant?: EmptyVariant;
  className?: string;
}

/**
 * Ilustraciones propias de los vacíos: trazos y rellenos de la paleta (`currentColor` + tokens),
 * así siguen el modo claro y oscuro. Decorativas: el mensaje siempre va escrito al lado.
 */
export const EmptyIllustration = ({ variant = 'box', className }: Props) => (
  <svg
    viewBox="0 0 120 96"
    aria-hidden="true"
    className={cx('h-24 w-[120px] text-primary', className)}
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <ellipse cx="60" cy="86" rx="38" ry="5" className="fill-surface-muted" />
    {variant === 'box' && (
      <>
        <path d="M24 38 60 22l36 16v32L60 86 24 70z" className="fill-surface-muted stroke-outline" strokeWidth="2" />
        <path d="M24 38 60 54l36-16M60 54v32" className="stroke-outline" strokeWidth="2" />
        <path d="M42 30l36 16" stroke="currentColor" strokeWidth="2" opacity="0.55" />
      </>
    )}
    {variant === 'search' && (
      <>
        <rect
          x="22"
          y="22"
          width="60"
          height="48"
          rx="8"
          className="fill-surface-muted stroke-outline"
          strokeWidth="2"
        />
        <path d="M34 38h30M34 50h20" className="stroke-outline" strokeWidth="2" />
        <circle cx="82" cy="62" r="14" className="fill-surface stroke-current" strokeWidth="3" />
        <path d="m92 72 12 12" stroke="currentColor" strokeWidth="4" />
      </>
    )}
    {variant === 'done' && (
      <>
        <circle cx="60" cy="46" r="30" className="fill-surface-muted stroke-outline" strokeWidth="2" />
        <path d="m46 47 10 10 20-22" stroke="currentColor" strokeWidth="4" />
      </>
    )}
  </svg>
);

import { ChevronsLeft, ChevronsRight } from 'lucide-react';

interface Props {
  mini: boolean;
  onToggle: () => void;
}

/** El botón del borde del menú lateral (modelo `nav-toggle-button` de Minimal): lo reduce a íconos o lo expande. */
export const NavToggleButton = ({ mini, onToggle }: Props) => {
  const Icon = mini ? ChevronsRight : ChevronsLeft;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={mini ? 'Expandir el menú' : 'Reducir el menú a íconos'}
      aria-pressed={mini}
      className="absolute -right-3 top-[22px] z-40 grid h-6 w-6 place-items-center rounded-full border border-outline bg-surface text-ink-2 shadow-control transition-colors hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  );
};

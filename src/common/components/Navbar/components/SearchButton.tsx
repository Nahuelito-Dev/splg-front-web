import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { SearchDialog } from './SearchDialog';

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform);

/** Botón de la barra que abre el buscador global; ⌘K (Mac) o Ctrl+K lo abren desde cualquier pantalla. */
export const SearchButton = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (typeof event.key !== 'string' || event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return;
      // Con otro modal abierto el atajo no hace nada (el popover del selector de fechas no es modal);
      // el buscador, aunque esté en pantalla o cerrándose, no cuenta: con el atajo se alterna.
      if (document.querySelector('[role="dialog"][aria-modal="true"]:not([data-search-dialog])')) return;
      event.preventDefault();
      setOpen((value) => !value);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buscar"
        aria-haspopup="dialog"
        className="flex h-9 items-center gap-2 rounded-[10px] border border-outline bg-surface px-[9px] text-muted shadow-control transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:w-56 md:px-3"
      >
        <Search aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-ink-2" strokeWidth={1.8} />
        <span className="hidden flex-1 text-left text-[13px] md:block">Buscar…</span>
        <kbd className="hidden rounded-md border border-outline bg-surface-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted md:block">
          {isMac() ? '⌘K' : 'Ctrl K'}
        </kbd>
      </button>
      <SearchDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
};

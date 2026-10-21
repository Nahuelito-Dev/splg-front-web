import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Dialog } from '@mui/material';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDebounce, usePermissions } from '../../../../hooks';
import { MIN_SEARCH_LENGTH, useGlobalSearch } from '../../../../services/queries/globalSearch';
import { cx } from '../../ui/cx';
import { buildSearchGroups, screenResults, type SearchResult } from '../searchItems';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Buscador global (modelo `searchbar` de Minimal): pedidos, clientes, choferes,
 * vehículos y pantallas en un solo diálogo.
 */
export const SearchDialog = ({ open, onClose }: Props) => {
  const navigate = useNavigate();
  const listId = useId();
  const { isSuperAdmin } = usePermissions();
  const titleId = `${listId}-title`;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [term, setTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const debounced = useDebounce(term.trim(), 300);
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});

  const found = useGlobalSearch(debounced, open);
  const groups = buildSearchGroups(screenResults(term, isSuperAdmin), found);
  const flat = groups.flatMap((group) => group.results);
  const current = flat[Math.min(activeIndex, flat.length - 1)];

  useEffect(() => {
    if (open) return;
    setTerm('');
    setActiveIndex(0);
  }, [open]);

  const currentId = current?.id;
  useEffect(() => {
    if (currentId) itemRefs.current[currentId]?.scrollIntoView?.({ block: 'nearest' });
  }, [currentId]);

  const go = (result: SearchResult) => {
    onClose();
    navigate(result.to);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (flat.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % flat.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + flat.length) % flat.length);
    } else if (event.key === 'Enter' && current) {
      event.preventDefault();
      go(current);
    }
  };

  const searching = term.trim().length >= MIN_SEARCH_LENGTH;
  const hasTerm = term.trim().length > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby={titleId}
      TransitionProps={{ onEntered: () => inputRef.current?.focus() }}
      sx={{ '& .MuiDialog-container': { alignItems: 'flex-start' } }}
      PaperProps={{
        'data-search-dialog': true,
        className: '!m-4 !mt-[10vh] !w-full !max-w-xl',
      }}
    >
      <h2 id={titleId} className="sr-only">
        Buscador global
      </h2>
      <div className="flex items-center gap-3 border-b border-outline px-4">
        <Search aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-muted" strokeWidth={1.8} />
        <input
          ref={inputRef}
          autoFocus
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={current ? `${listId}-${current.id}` : undefined}
          aria-label="Buscar pedidos, clientes, choferes, vehículos o pantallas"
          placeholder="Buscar en el panel…"
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className="h-14 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <kbd className="hidden shrink-0 rounded-md border border-outline bg-surface-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted sm:block">
          Esc
        </kbd>
      </div>

      <div id={listId} role="listbox" aria-label="Resultados" className="max-h-[60vh] overflow-y-auto p-2">
        {groups.map((group) => (
          <div key={group.title} role="group" aria-label={group.title} className="mb-1 last:mb-0">
            <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
              {group.title}
            </p>
            {group.results.map((result) => {
              const isActive = result.id === current?.id;
              const Icon = result.icon;
              return (
                <button
                  key={result.id}
                  ref={(node) => {
                    itemRefs.current[result.id] = node;
                  }}
                  id={`${listId}-${result.id}`}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  tabIndex={-1}
                  onClick={() => go(result)}
                  onMouseMove={() => setActiveIndex(flat.indexOf(result))}
                  className={cx(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                    isActive ? 'bg-primary-soft' : 'hover:bg-surface-hover',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-muted text-ink-2"
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[13px] font-medium text-ink">{result.title}</span>
                    {result.subtitle && <span className="block truncate text-xs text-muted">{result.subtitle}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        ))}

        {searching && found.isLoading && (
          <p role="status" className="px-3 py-2 text-xs text-muted">
            Buscando…
          </p>
        )}
        {hasTerm && flat.length === 0 && !found.isLoading && (
          <p role="status" className="px-3 py-8 text-center text-sm text-muted">
            Sin resultados para «{term.trim()}»
          </p>
        )}
      </div>

      <div className="hidden items-center gap-4 border-t border-outline bg-surface-hover px-4 py-2 text-[11px] text-muted sm:flex">
        <span>↑ ↓ para moverte</span>
        <span>Enter para abrir</span>
        <span>Esc para cerrar</span>
      </div>
    </Dialog>
  );
};

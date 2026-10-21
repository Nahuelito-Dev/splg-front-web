import { useState, type MouseEvent } from 'react';
import { Popover } from '@mui/material';
import { Building2, Check, ChevronsUpDown, Layers } from 'lucide-react';
import { activeDistributor } from '../../../../services/api/activeDistributor';
import { useDistributors } from '../../../../services/queries/distributors';
import { initialsOf } from '../../../../utils/format';

const OPTION =
  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none';

/**
 * Selector de distribuidora del administrador general (modelo `workspaces-popover`
 * de Minimal): la misma lógica que «Ver como» de Distribuidoras. Elegir una
 * guarda su slug (`activeDistributor`, que viaja en X-Distributor) y recarga el
 * panel; «Todas las empresas» vuelve a la vista global.
 */
export const WorkspacesPopover = () => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { data: distributors, isLoading, error } = useDistributors();
  const currentSlug = activeDistributor.get();
  const current = distributors?.find((d) => d.slug === currentSlug);
  const label = currentSlug ? (current?.name ?? currentSlug) : 'Todas las empresas';

  const handleOpen = (event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget);
  const handleClose = () => setAnchor(null);

  const choose = (slug: string | null) => {
    handleClose();
    if (slug === currentSlug) return;
    activeDistributor.set(slug);
    window.location.reload();
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`Distribuidora: ${label}. Cambiar`}
        aria-haspopup="dialog"
        aria-expanded={Boolean(anchor)}
        className="flex h-9 items-center gap-2 rounded-[10px] border border-outline bg-surface px-[9px] text-ink shadow-control transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:max-w-[220px] lg:pl-2 lg:pr-2.5"
      >
        <span
          aria-hidden="true"
          className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-tinta-800 text-[10px] font-bold text-llama-300"
        >
          {currentSlug ? initialsOf(label).slice(0, 1) : <Layers className="h-3 w-3" strokeWidth={2} />}
        </span>
        <span className="hidden min-w-0 truncate text-[13px] font-medium lg:block">{label}</span>
        <ChevronsUpDown aria-hidden="true" className="hidden h-3.5 w-3.5 shrink-0 text-muted lg:block" />
      </button>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: { className: '!mt-2 !w-[280px]' },
        }}
      >
        <p className="border-b border-outline px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Ver como
        </p>
        <div className="max-h-72 overflow-y-auto p-1.5">
          <button type="button" onClick={() => choose(null)} className={OPTION}>
            <Layers aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.8} />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">Todas las empresas</span>
            {!currentSlug && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />}
          </button>
          {distributors?.map((distributor) => (
            <button
              key={distributor.distributor_id}
              type="button"
              onClick={() => choose(distributor.slug)}
              className={OPTION}
            >
              <Building2 aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.8} />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[13px] font-medium text-ink">{distributor.name}</span>
                <span className="block truncate text-xs text-muted">{distributor.slug}</span>
              </span>
              {distributor.slug === currentSlug && (
                <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
              )}
            </button>
          ))}
          {isLoading && <p className="px-2.5 py-2 text-xs text-muted">Cargando empresas…</p>}
          {Boolean(error) && <p className="px-2.5 py-2 text-xs text-danger">No se pudieron cargar las empresas.</p>}
        </div>
      </Popover>
    </>
  );
};

import { Truck } from 'lucide-react';
import { Avatar, cx, EmptyState, ErrorState, SearchInput, Skeleton } from '../../../common/components/ui';
import type { FilesSubject } from './FleetOwnerFiles';

export interface FileOwner {
  id: string;
  name: string;
  detail?: string;
}

interface Props {
  subject: FilesSubject;
  owners: FileOwner[];
  selectedId: string;
  onSelect: (owner: FileOwner) => void;
  search: string;
  onSearch: (value: string) => void;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}

/** La lista de vehículos o legajos para elegir de quién se ven los archivos. */
export const FleetFileOwners = ({
  subject,
  owners,
  selectedId,
  onSelect,
  search,
  onSearch,
  loading,
  error,
  onRetry,
}: Props) => (
  <div className="flex flex-col">
    <div className="border-b border-outline p-3">
      <SearchInput
        label={subject === 'vehicle' ? 'Buscar vehículo' : 'Buscar empleado'}
        placeholder={subject === 'vehicle' ? 'Patente, marca o modelo' : 'Nombre o legajo'}
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        className="sm:w-full"
      />
    </div>
    {loading ? (
      <div role="status" aria-label="Cargando lista" className="space-y-2 p-3">
        {[0, 1, 2, 3].map((slot) => (
          <Skeleton key={slot} className="h-12 w-full" />
        ))}
      </div>
    ) : error ? (
      <ErrorState error={error} resource="La lista" onRetry={onRetry} />
    ) : owners.length === 0 ? (
      <EmptyState
        illustration="search"
        title="Sin resultados"
        description={search ? 'Ninguno coincide con la búsqueda.' : 'Todavía no hay nada cargado.'}
      />
    ) : (
      <ul className="max-h-[560px] divide-y divide-outline-soft overflow-y-auto">
        {owners.map((owner) => {
          const selected = owner.id === selectedId;
          return (
            <li key={owner.id}>
              <button
                type="button"
                aria-current={selected ? 'true' : undefined}
                onClick={() => onSelect(owner)}
                className={cx(
                  'flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40',
                  selected ? 'bg-primary-soft' : 'hover:bg-surface-hover',
                )}
              >
                {subject === 'vehicle' ? (
                  <span
                    aria-hidden="true"
                    className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg border border-outline-soft bg-bg text-ink-2"
                  >
                    <Truck className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                ) : (
                  <Avatar name={owner.name} />
                )}
                <span className="min-w-0 leading-tight">
                  <span
                    className={cx(
                      'block truncate text-sm font-semibold',
                      selected ? 'text-primary-strong' : 'text-ink',
                    )}
                  >
                    {owner.name}
                  </span>
                  {owner.detail && (
                    <span className="block truncate font-mono text-[11.5px] text-muted">{owner.detail}</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    )}
  </div>
);

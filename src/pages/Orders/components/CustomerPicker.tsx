import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { Button, EmptyState, LoadingState, PersonAvatar, SearchInput } from '../../../common/components/ui';
import { useDebounce } from '../../../hooks';
import { useCustomers } from '../../../services/queries/customers';
import type { Customer } from '../../../services/api/types';

interface Props {
  selected: Customer | null;
  onSelect: (customer: Customer) => void;
}

/** Buscar y elegir un cliente existente. El alta telefónica no crea clientes nuevos. */
export const CustomerPicker = ({ selected, onSelect }: Props) => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim());
  const { data, isPending } = useCustomers({ page: 0, pageSize: 8 }, debouncedSearch);

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-primary bg-primary-soft p-3">
        <span className="flex items-center gap-3">
          <PersonAvatar
            name={selected.user?.full_name ?? 'Cliente'}
            userId={selected.user_id}
            fallback={
              <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-surface text-primary-strong shadow-sm">
                <UserRound className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
              </span>
            }
          />
          <span>
            <span className="block text-sm font-semibold text-ink">{selected.user?.full_name ?? 'Sin nombre'}</span>
            <span className="block text-xs text-muted">
              {selected.user?.phone_number ?? selected.user?.email ?? '—'}
            </span>
          </span>
        </span>
        <Button type="button" variant="secondary" size="sm" onClick={() => setSearch('')}>
          Cambiar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SearchInput
        label="Buscar cliente"
        placeholder="Nombre, email o teléfono"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {isPending ? (
        <LoadingState label="Buscando clientes…" />
      ) : !data || data.rows.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          description={debouncedSearch ? 'Ningún cliente coincide con la búsqueda.' : 'Escribí para buscar un cliente.'}
        />
      ) : (
        <ul className="space-y-2">
          {data.rows.map((customer) => (
            <li key={customer.customer_id}>
              <button
                type="button"
                onClick={() => onSelect(customer)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-outline p-3 text-left transition-colors hover:border-primary/50"
              >
                <span className="flex items-center gap-3">
                  <PersonAvatar
                    name={customer.user?.full_name ?? 'Cliente'}
                    userId={customer.user_id}
                    fallback={
                      <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-surface text-primary-strong shadow-sm">
                        <UserRound className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
                      </span>
                    }
                  />
                  <span>
                    <span className="block text-sm font-semibold text-ink">
                      {customer.user?.full_name ?? 'Sin nombre'}
                    </span>
                    <span className="block text-xs text-muted">
                      {customer.user?.phone_number ?? customer.user?.email ?? '—'}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

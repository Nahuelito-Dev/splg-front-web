import { useState } from 'react';
import { Button, IdentityCell, SearchInput } from '../../../common/components/ui';
import { useDebounce } from '../../../hooks';
import type { User } from '../../../services/api/types';
import { usePlatformAccounts } from '../../../services/queries/users';
import { roleLabel } from '../../Users/roleLabel';

interface Props {
  selected: User | null;
  onSelect: (user: User | null) => void;
  label: string;
  placeholder?: string;
}

const roleOf = (user: User) => roleLabel(user.role?.type).text;

/**
 * Buscar y elegir una cuenta de la plataforma o un administrador de empresa por nombre o correo. Nunca ofrece clientes
 * ni choferes: la plataforma no los administra.
 */
export const AccountPicker = ({ selected, onSelect, label, placeholder = 'Nombre o correo…' }: Props) => {
  const [term, setTerm] = useState('');
  const debounced = useDebounce(term.trim());
  const canSearch = debounced.length >= 2;
  const { accounts, loading } = usePlatformAccounts(debounced, { enabled: canSearch });

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-outline bg-surface-hover p-2.5">
        <IdentityCell
          title={selected.full_name ?? 'Sin nombre'}
          subtitle={selected.email ?? undefined}
          avatarName={selected.full_name ?? '?'}
          photo={{ kind: 'user', id: selected.user_id, url: selected.photoUrl }}
        />
        <Button variant="secondary" size="sm" onClick={() => onSelect(null)}>
          Cambiar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <SearchInput label={label} placeholder={placeholder} value={term} onChange={(e) => setTerm(e.target.value)} />
      {canSearch && !loading && accounts.length === 0 && (
        <p className="text-xs text-muted">Ninguna cuenta de la plataforma ni administrador coincide.</p>
      )}
      {canSearch && accounts.length > 0 && (
        <ul
          aria-label="Cuentas encontradas"
          className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-outline p-1.5"
        >
          {accounts.map((user) => (
            <li key={user.user_id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(user);
                  setTerm('');
                }}
                className="flex w-full items-center rounded-lg px-2 py-1.5 text-left hover:bg-surface-hover"
              >
                <IdentityCell
                  title={user.full_name ?? 'Sin nombre'}
                  subtitle={[user.email, roleOf(user)].filter(Boolean).join(' · ')}
                  avatarName={user.full_name ?? '?'}
                  photo={{ kind: 'user', id: user.user_id, url: user.photoUrl }}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import { EmptyState, LoadingState } from '../../../common/components/ui';
import type { User } from '../../../services/api/types';

/** Un cliente o un chofer: a los dos les alcanza con `user_id` y su `user`. */
export interface RatingProfile {
  user_id: string;
  user?: User;
}

interface Props {
  icon: 'delivery' | 'customer';
  items: RatingProfile[];
  loading: boolean;
  selectedId?: string;
  onSelect: (item: RatingProfile) => void;
}

export const ProfileList = ({ icon, items, loading, selectedId, onSelect }: Props) => {
  const Icon = icon === 'delivery' ? TwoWheelerIcon : PersonOutlineIcon;

  if (loading) return <LoadingState label="Buscando…" />;
  if (items.length === 0) return <EmptyState title="Sin resultados" />;

  return (
    <ul className="max-h-[28rem] divide-y divide-outline overflow-y-auto">
      {items.map((item) => {
        const selected = item.user_id === selectedId;
        return (
          <li key={item.user_id}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              aria-current={selected || undefined}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${selected ? 'bg-primary-soft' : 'hover:bg-surface-hover'}`}
            >
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted"
              >
                <Icon className="!h-5 !w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">
                  {item.user?.full_name ?? 'Sin nombre'}
                </span>
                <span className="block truncate text-xs text-muted">{item.user?.email ?? '—'}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

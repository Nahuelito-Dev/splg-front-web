import { useState } from 'react';
import { Button, Card, LoadingState, PageHeader, SearchInput, PageContainer } from '../../common/components/ui';
import { useDebounce } from '../../hooks';
import { useCustomers } from '../../services/queries/customers';
import { useDeliveries } from '../../services/queries/deliveries';
import { useRatingHistory, useRatingSummary } from '../../services/queries/ratings';
import { ProfileList, type RatingProfile } from './components/ProfileList';
import { RatingHistoryList } from './components/RatingHistoryList';
import { RatingSummaryCard } from './components/RatingSummaryCard';
import { resolveRatingStats } from './ratingStats';

type Tab = 'delivery' | 'customer';

const LIST_PAGE = { page: 0, pageSize: 20 };
const TAB_LABEL: Record<Tab, string> = { delivery: 'chofer', customer: 'cliente' };

export const Ratings = () => {
  const [tab, setTab] = useState<Tab>('delivery');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim());
  const [selected, setSelected] = useState<RatingProfile | null>(null);

  const { data: deliveries, isFetching: loadingDeliveries } = useDeliveries(LIST_PAGE, debouncedSearch, 'all');
  const { data: customers, isFetching: loadingCustomers } = useCustomers(LIST_PAGE, debouncedSearch);

  const items: RatingProfile[] = tab === 'delivery' ? (deliveries?.rows ?? []) : (customers?.rows ?? []);
  const loadingList = tab === 'delivery' ? loadingDeliveries : loadingCustomers;

  const { data: summary, isPending: loadingSummary } = useRatingSummary(selected?.user_id);
  const { data: history, isPending: loadingHistory } = useRatingHistory(selected?.user_id);
  const stats = resolveRatingStats(summary, history);

  const handleTab = (value: Tab) => {
    setTab(value);
    setSearch('');
    setSelected(null);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Calificaciones"
        description="Calificaciones bidireccionales entre clientes y choferes al finalizar un pedido."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex gap-2 border-b border-outline p-4">
            <Button
              variant={tab === 'delivery' ? 'primary' : 'secondary'}
              size="sm"
              className="flex-1"
              onClick={() => handleTab('delivery')}
            >
              Choferes
            </Button>
            <Button
              variant={tab === 'customer' ? 'primary' : 'secondary'}
              size="sm"
              className="flex-1"
              onClick={() => handleTab('customer')}
            >
              Clientes
            </Button>
          </div>
          <div className="border-b border-outline p-4">
            <SearchInput
              label={`Buscar ${TAB_LABEL[tab]}`}
              className="w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ProfileList
            icon={tab}
            items={items}
            loading={loadingList}
            selectedId={selected?.user_id}
            onSelect={setSelected}
          />
        </Card>

        <div className="space-y-6 lg:col-span-2">
          {!selected ? (
            <Card className="p-16 text-center">
              <p className="font-display text-base font-semibold text-ink">Elegí un {TAB_LABEL[tab]}</p>
              <p className="mt-1 text-sm text-muted">Seleccioná un perfil de la lista para ver sus calificaciones.</p>
            </Card>
          ) : loadingSummary || loadingHistory ? (
            <LoadingState label="Cargando calificaciones…" />
          ) : (
            <>
              <RatingSummaryCard
                title={tab === 'delivery' ? 'Chofer' : 'Cliente'}
                subtitle={selected.user?.full_name}
                average={stats.average}
                count={stats.count}
              />
              <RatingHistoryList ratings={history ?? []} />
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

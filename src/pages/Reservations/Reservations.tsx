import CalendarMonth from '@mui/icons-material/CalendarMonth';
import ViewList from '@mui/icons-material/ViewList';
import { useMemo, useState } from 'react';
import {
  CalendarKanbanViewToggle,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  SearchInput,
  Select,
  TableSkeleton,
  PageContainer,
} from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import type { Reserva } from '../../services/api/types';
import { useConfirmReservationDeposit, useReservations } from '../../services/queries/reservations';
import { notify } from '../../utils/notifications';
import { ReservationCalendar } from './components/ReservationCalendar';
import { ReservationDetailDrawer } from './components/ReservationDetailDrawer';
import { ReservationsTable } from './components/ReservationsTable';
import { filterReservations, type DepositFilter } from './reservationCalendar';
import { countPendingManualDeposits } from './reservationStats';

type View = 'calendar' | 'list';

const VIEWS = [
  { id: 'calendar', label: 'Calendario', icon: <CalendarMonth aria-hidden="true" fontSize="inherit" /> },
  { id: 'list', label: 'Lista', icon: <ViewList aria-hidden="true" fontSize="inherit" /> },
];

const DEPOSIT_OPTIONS = [
  { value: '', label: 'Todas las señas' },
  { value: 'paid', label: 'Seña paga' },
  { value: 'pending', label: 'Seña pendiente' },
];

export const Reservations = () => {
  const { needsDistributor } = usePermissions();
  const { data: reservations, isPending, isFetching, error, refetch } = useReservations({ enabled: !needsDistributor });
  const confirmDeposit = useConfirmReservationDeposit();
  const [selected, setSelected] = useState<Reserva | null>(null);
  const [view, setView] = useState<View>('calendar');
  const [deposit, setDeposit] = useState<DepositFilter>('');
  const [term, setTerm] = useState('');

  const rows = useMemo(() => filterReservations(reservations ?? [], { deposit, term }), [reservations, deposit, term]);
  const pendingCount = countPendingManualDeposits(reservations ?? []);

  const handleConfirmDeposit = (orderId: string) => {
    confirmDeposit.mutate(orderId, {
      onSuccess: () => {
        notify.success('Seña confirmada: la reserva se activa sola el día agendado');
        setSelected(null);
      },
      onError: notify.error,
    });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Reservas"
        description={`Pedidos agendados con seña. Confirmá la seña recibida en efectivo o por transferencia para que se despachen solos el día agendado${
          pendingCount > 0 ? ` · ${pendingCount} seña(s) pendiente(s)` : ''
        }.`}
        actions={
          !needsDistributor && (
            <CalendarKanbanViewToggle
              label="Vista de las reservas"
              options={VIEWS}
              value={view}
              onChange={(id) => setView(id as View)}
            />
          )
        }
      />

      {needsDistributor ? (
        <Card className="p-6">
          <EmptyState
            title="Elegí una distribuidora"
            description="Como administrador general, elegí una con «Ver como» para ver sus reservas."
          />
        </Card>
      ) : (
        <Card>
          <div className="grid gap-3 border-b border-outline p-4 sm:grid-cols-2 lg:grid-cols-4">
            <SearchInput
              label="Buscar"
              className="self-end sm:!w-full"
              placeholder="Cliente, teléfono o código"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
            <Select
              label="Seña"
              options={DEPOSIT_OPTIONS}
              value={deposit}
              onChange={(e) => setDeposit(e.target.value as DepositFilter)}
            />
          </div>
          {error ? (
            <div className="p-4">
              <ErrorState error={error} resource="Las reservas" onRetry={() => void refetch()} />
            </div>
          ) : isPending ? (
            <TableSkeleton columns={5} />
          ) : view === 'calendar' ? (
            <ReservationCalendar rows={rows} onOpen={setSelected} />
          ) : (
            <ReservationsTable rows={rows} loading={isFetching} onView={setSelected} />
          )}
        </Card>
      )}

      <ReservationDetailDrawer
        reservation={selected}
        onClose={() => setSelected(null)}
        onConfirmDeposit={handleConfirmDeposit}
        confirming={confirmDeposit.isPending}
      />
    </PageContainer>
  );
};

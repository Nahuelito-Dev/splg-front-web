import { useState } from 'react';
import { Card, PageHeader } from '../../common/components/ui';
import type { Reserva } from '../../services/api/types';
import { useConfirmReservationDeposit, useReservations } from '../../services/queries/reservations';
import { notify } from '../../utils/notifications';
import { ReservationDetailModal } from './components/ReservationDetailModal';
import { ReservationsTable } from './components/ReservationsTable';
import { countPendingCashDeposits } from './reservationStats';

export const Reservations = () => {
  const { data: reservations, isFetching } = useReservations();
  const confirmDeposit = useConfirmReservationDeposit();
  const [selected, setSelected] = useState<Reserva | null>(null);

  const pendingCount = countPendingCashDeposits(reservations ?? []);

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
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Reservas"
        description={`Pedidos agendados con seña. Confirmá la seña en efectivo para que se despachen solos el día agendado${
          pendingCount > 0 ? ` · ${pendingCount} seña(s) pendiente(s)` : ''
        }.`}
      />

      <Card>
        <ReservationsTable rows={reservations ?? []} loading={isFetching} onView={setSelected} />
      </Card>

      <ReservationDetailModal
        reservation={selected}
        onClose={() => setSelected(null)}
        onConfirmDeposit={handleConfirmDeposit}
        confirming={confirmDeposit.isPending}
      />
    </div>
  );
};

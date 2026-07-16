import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getReservations,
  confirmDeposit,
  Reservation,
} from '../../services/api/reservations';
import Swal from 'sweetalert2';

import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const money = (n: number) =>
  `$${Number(n || 0).toLocaleString('es-AR')}`;

const paymentLabel = (method: string) => {
  switch (method) {
    case 'cash':
      return 'Efectivo';
    case 'mercadopago':
      return 'Mercado Pago';
    case 'transfer':
      return 'Transferencia';
    default:
      return method;
  }
};

export const Reservations = () => {
  const queryClient = useQueryClient();

  const { data: reservations = [], isLoading } = useQuery(
    ['reservations'],
    getReservations,
  );

  const confirmMutation = useMutation({
    mutationFn: (orderId: string) => confirmDeposit(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries(['reservations']);
      Swal.fire({
        title: 'Seña confirmada',
        text: 'La reserva se activará automáticamente el día agendado.',
        icon: 'success',
        customClass: {
          confirmButton:
            'bg-indigo-600 text-white font-bold px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors',
        },
        buttonsStyling: false,
      });
    },
    onError: () =>
      Swal.fire({
        title: 'Error',
        text: 'No se pudo confirmar la seña.',
        icon: 'error',
        customClass: {
          confirmButton:
            'bg-rose-600 text-white font-bold px-6 py-2 rounded-md hover:bg-rose-700 transition-colors',
        },
        buttonsStyling: false,
      }),
  });

  const handleConfirm = async (reservation: Reservation) => {
    const res = await Swal.fire({
      title: 'Confirmar seña',
      html: `Cliente: <b>${reservation.customerName ?? '—'}</b><br/>Seña: <b>${money(
        reservation.depositAmount,
      )}</b> · Saldo: <b>${money(reservation.remainingBalance)}</b>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirmar seña',
      cancelButtonText: 'Cancelar',
      customClass: {
        confirmButton:
          'bg-emerald-600 text-white font-bold px-6 py-2 rounded-md hover:bg-emerald-700 transition-colors mr-2',
        cancelButton:
          'bg-slate-200 text-slate-700 font-bold px-6 py-2 rounded-md hover:bg-slate-300 transition-colors',
      },
      buttonsStyling: false,
    });
    if (res.isConfirmed) confirmMutation.mutate(reservation.id);
  };

  const pendingCount = reservations.filter(
    (r) => !r.depositPaid && r.paymentMethod === 'cash',
  ).length;

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <EventAvailableIcon fontSize="large" className="text-slate-400" />{' '}
            Reservas
          </h1>
          <p className="text-slate-500 mt-1 ml-11">
            Pedidos agendados con seña. Confirmá la seña en efectivo para que la
            reserva se despache sola el día agendado
            {pendingCount > 0 ? ` · ${pendingCount} seña(s) pendiente(s)` : ''}.
          </p>
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-slate-400">
              Cargando reservas...
            </div>
          ) : reservations.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon className="text-emerald-300" fontSize="large" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">Sin reservas</h3>
              <p className="text-slate-500">
                No hay pedidos reservados pendientes.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Cliente / Pedido</th>
                    <th className="px-6 py-4">Agendada</th>
                    <th className="px-6 py-4">Detalle</th>
                    <th className="px-6 py-4 text-right">Total</th>
                    <th className="px-6 py-4 text-right">Seña</th>
                    <th className="px-6 py-4 text-right">Saldo</th>
                    <th className="px-6 py-4 text-center">Pago</th>
                    <th className="px-6 py-4 text-center">Seña</th>
                    <th className="px-6 py-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reservations.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">
                          {r.customerName ?? '—'}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          #{r.id.slice(-6)}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {r.scheduledDate
                          ? new Date(r.scheduledDate).toLocaleDateString('es-AR')
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {r.items
                          .map(
                            (it) =>
                              `${it.quantity}x ${it.type ?? 'Garrafa'}`,
                          )
                          .join(', ') || '—'}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-700">
                        {money(r.total)}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-700">
                        {money(r.depositAmount)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-800">
                        {money(r.remainingBalance)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs text-slate-600">
                          {paymentLabel(r.paymentMethod)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {r.depositPaid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border uppercase text-emerald-600 bg-emerald-50 border-emerald-100">
                            Paga
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border uppercase text-amber-600 bg-amber-50 border-amber-100">
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {r.depositPaid ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : r.paymentMethod === 'cash' ? (
                          <button
                            onClick={() => handleConfirm(r)}
                            disabled={confirmMutation.isLoading}
                            className="bg-emerald-600 text-white font-bold hover:bg-emerald-700 px-3 py-1 rounded transition-colors text-xs border border-emerald-600 disabled:opacity-60"
                          >
                            Confirmar seña
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Automático (MP)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

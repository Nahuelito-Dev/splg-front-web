import { useEffect, useState } from 'react';
import { Button, Modal, TextArea } from '../../../common/components/ui';
import { errorMessage } from '../../../services/api/errors';
import type { TruckLoad } from '../../../services/api/types';
import { useCloseTruckLoad } from '../../../services/queries/truckLoads';
import { formatCurrency } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { useTruckStock } from '../../../services/queries/truckLoads';
import { closeDifference, signed } from '../truckLoadRules';

interface Props {
  open: boolean;
  onClose: () => void;
  load: TruckLoad;
}

/**
 * La rendición: esperado, declarado y diferencia por garrafa, y el efectivo de la jornada. Si hay diferencia la nota es
 * obligatoria y la carga queda «rendida con diferencia». Es irreversible: el camión queda en cero.
 */
export const CloseLoadModal = ({ open, onClose, load }: Props) => {
  const close = useCloseTruckLoad();
  const scope = `close:${load.loadId}`;
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const truck = useTruckStock(load.carId, { enabled: open });
  // Sin el saldo real del camión no se sabe si hay diferencia por ese lado: se exige la nota por las dudas.
  const { reasons, unknown } = closeDifference(load.items, truck.data ?? null);
  const difference = reasons.length > 0 || unknown;
  const missingNote = difference && note.trim() === '';

  useEffect(() => {
    if (open) {
      setNote('');
      setTouched(false);
      setServerError(null);
    }
  }, [open]);

  const submit = () => {
    setTouched(true);
    if (missingNote) return;
    setServerError(null);
    close.mutate(
      { id: load.loadId, body: { differenceNote: note.trim() || undefined }, scope },
      {
        onSuccess: () => {
          notify.success(difference ? 'Carga rendida con diferencia' : 'Carga rendida');
          onClose();
        },
        onError: (error) => setServerError(errorMessage(error)),
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`Rendir la carga N° ${load.number}`}
      description="Lo declarado vuelve al galpón y el camión queda en cero. Las diferencias se asientan como merma o sobrante. No se puede deshacer."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Volver
          </Button>
          <Button onClick={submit} loading={close.isPending} disabled={truck.isPending}>
            {difference ? 'Rendir con diferencia' : 'Rendir'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {serverError && (
          <p role="alert" className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            {serverError}
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[440px] text-left text-sm">
            <caption className="sr-only">Esperado, declarado y diferencia por garrafa</caption>
            <thead className="text-xs text-muted">
              <tr>
                <th scope="col" className="py-1.5 pr-2 font-medium">
                  Garrafa
                </th>
                <th scope="col" className="px-2 font-medium">
                  Esperado
                </th>
                <th scope="col" className="px-2 font-medium">
                  Declarado
                </th>
                <th scope="col" className="px-2 font-medium">
                  Diferencia
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline">
              {load.items.map((item) => (
                <tr key={item.itemId}>
                  <th scope="row" className="py-2 pr-2 font-semibold text-ink">
                    {item.gasCylinderType}
                  </th>
                  <td className="px-2 tabular-nums">
                    {item.expectedFull} llenas · {item.expectedEmpty} vacías
                  </td>
                  <td className="px-2 tabular-nums">
                    {item.declaredReturnFull ?? '—'} · {item.declaredReturnEmpty ?? '—'}
                  </td>
                  <td
                    className={`px-2 tabular-nums ${(item.differenceFull ?? 0) !== 0 || (item.differenceEmpty ?? 0) !== 0 ? 'text-danger' : ''}`}
                  >
                    {signed(item.differenceFull)} · {signed(item.differenceEmpty)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {truck.isError && (
          <p role="alert" className="rounded-lg border border-warn bg-warn-soft px-3 py-2 text-sm text-ink">
            No se pudo leer lo que el camión tiene realmente, así que se pide la nota por las dudas.{' '}
            <button type="button" className="font-semibold underline" onClick={() => void truck.refetch()}>
              Reintentar
            </button>
          </p>
        )}
        {reasons.length > 0 && (
          <div role="alert" className="rounded-lg border border-warn bg-warn-soft px-3 py-2 text-sm text-ink">
            <p className="font-semibold">Hay diferencia, por eso la nota es obligatoria:</p>
            <ul className="mt-1 list-disc pl-5">
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
        <dl className="grid grid-cols-1 gap-2 rounded-lg border border-outline bg-surface-hover p-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted">Efectivo cobrado</dt>
            <dd className="tabular-nums font-semibold">{formatCurrency(load.cash.cashCollectedAmount)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Impago</dt>
            <dd className="tabular-nums font-semibold">{formatCurrency(load.cash.unpaidAmount)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Sin confirmar</dt>
            <dd className="tabular-nums font-semibold">{formatCurrency(load.cash.pendingConfirmationAmount)}</dd>
          </div>
        </dl>
        <TextArea
          label={difference ? 'Nota de la diferencia' : 'Nota (opcional)'}
          required={difference}
          maxLength={500}
          hint={difference ? 'Obligatoria: explicá la merma, pérdida o sobrante.' : undefined}
          error={touched && missingNote ? 'Explicá la diferencia' : undefined}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </Modal>
  );
};

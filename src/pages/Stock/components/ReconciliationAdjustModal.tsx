import { ReasonModal } from '../../../common/components/ui';
import type { DiferenciaDeVendible } from '../../../services/api/types';
import { useCreateReconciliationAdjustment } from '../../../services/queries/stock';
import { notify } from '../../../utils/notifications';

interface Props {
  /** La garrafa con diferencia; `null` cierra el modal. */
  difference: DiferenciaDeVendible | null;
  onClose: () => void;
}

/**
 * Ajuste de conciliación: corrige sólo el vendible de la garrafa (el físico no cambió). Manda la diferencia que vio el
 * administrador: si cambió mientras tanto, la API responde 409 en vez de corregir un número viejo.
 */
export const ReconciliationAdjustModal = ({ difference, onClose }: Props) => {
  const adjust = useCreateReconciliationAdjustment();
  const scope = `reconcile:${difference?.gasCylinderId ?? ''}`;
  return (
    <ReasonModal
      open={difference !== null}
      onClose={onClose}
      title="Ajuste de conciliación"
      description={
        difference
          ? `El vendible de ${difference.gasCylinderType} pasa de ${difference.sellable} a ${difference.expected}. No mueve garrafas: solo corrige el número vendible.`
          : ''
      }
      reasonLabel="Nota"
      placeholder="Por qué el vendible estaba desviado"
      confirmLabel="Aplicar ajuste"
      danger={false}
      loading={adjust.isPending}
      onConfirm={(notes) => {
        if (!difference) return;
        adjust.mutate(
          {
            scope,
            body: { gasCylinderId: difference.gasCylinderId, notes, expectedDifference: difference.difference },
          },
          {
            onSuccess: () => {
              notify.success('Vendible corregido');
              onClose();
            },
            onError: notify.error,
          },
        );
      }}
    />
  );
};

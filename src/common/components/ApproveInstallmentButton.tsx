import { CheckCircle2 } from 'lucide-react';
import { usePermiso, usePermissions } from '../../hooks';
import { needsApproval } from '../../pages/Insurance/insuranceState';
import { useApproveInsuranceInstallment, useInsuranceInstallment } from '../../services/queries/insurance';
import { formatCurrency } from '../../utils/format';
import { confirm, notify } from '../../utils/notifications';
import { Button } from './ui';

interface Props {
  installmentId: string;
  /** Después de aprobar: marca el aviso como leído. */
  onApproved?: () => void;
}

/**
 * «Aprobar pago» del aviso «¿Aprobar pago?» de una cuota del seguro. Se muestra sólo si la cuota sigue pendiente y sin
 * aprobar (se consulta a la API) y a quien tiene el permiso `flota.gestionar`; pide confirmación. Aprobar no mueve plata:
 * el pago se registra después en la pestaña Seguro del vehículo.
 */
export const ApproveInstallmentButton = ({ installmentId, onApproved }: Props) => {
  const { canWrite, writeHint } = usePermissions();
  const gestionar = usePermiso('flota.gestionar');
  const installment = useInsuranceInstallment(installmentId);
  const approve = useApproveInsuranceInstallment();
  if (!installment.data || !needsApproval(installment.data)) return null;
  if (gestionar.known && !gestionar.allowed) return null;
  const { label, amount } = installment.data;

  const handleApprove = async () => {
    const ok = await confirm({
      title: '¿Aprobar el pago de la cuota?',
      text: `Cuota ${label} de ${formatCurrency(amount)}. Aprobar no mueve plata: después registrás el pago con su comprobante y la caja. Queda asentado quién aprobó y cuándo.`,
      confirmText: 'Aprobar pago',
    });
    if (!ok) return;
    approve.mutate(installmentId, {
      onSuccess: () => {
        notify.success('Pago aprobado: registralo desde la pestaña Seguro del vehículo');
        onApproved?.();
      },
      onError: notify.error,
    });
  };

  return (
    <Button
      size="sm"
      icon={<CheckCircle2 />}
      loading={approve.isPending}
      disabled={!canWrite}
      title={writeHint}
      onClick={() => void handleApprove()}
    >
      Aprobar pago
    </Button>
  );
};

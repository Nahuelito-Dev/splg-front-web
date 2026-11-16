import { useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import { useSupportSession } from '../../hooks';
import { Button } from '../components/ui';
import { RequestSupportModal } from './RequestSupportModal';

interface Props {
  /** La empresa ya elegida (desde su ficha). */
  distributorId?: string;
  size?: 'sm' | 'md';
}

/** «Pedir acceso de soporte». Con un pedido pendiente o una sesión activa no se puede pedir otro (la API da 409). */
export const RequestSupportButton = ({ distributorId, size = 'md' }: Props) => {
  const [open, setOpen] = useState(false);
  const { session } = useSupportSession();
  const blockedReason = session
    ? session.status === 'active'
      ? 'Ya estás en modo soporte: salí antes de pedir otro acceso'
      : `Ya pediste acceso a ${session.distributorName}: retiralo antes de pedir otro`
    : undefined;
  return (
    <>
      <Button size={size} icon={<LifeBuoy />} onClick={() => setOpen(true)} blockedReason={blockedReason}>
        Pedir acceso de soporte
      </Button>
      <RequestSupportModal open={open} onClose={() => setOpen(false)} distributorId={distributorId} />
    </>
  );
};

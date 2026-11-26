import { Landmark } from 'lucide-react';
import { AttachmentsPanel } from '../../../../common/components/AttachmentsPanel';
import { Card, CardHeader } from '../../../../common/components/ui';

/**
 * Los comprobantes que el cliente subió cuando todavía se pagaba por transferencia: sólo se ven y se descargan.
 * No hay forma de subir uno nuevo ni de borrarlos desde acá (la transferencia ya no existe).
 */
export const OrderLegacyReceipts = ({ orderId }: { orderId: string }) => (
  <Card className="p-4">
    <CardHeader title="Comprobantes anteriores" icon={<Landmark />} as="h3" className="mb-3" />
    <AttachmentsPanel
      ownerType="order"
      ownerId={orderId}
      canWrite={false}
      title="Adjuntos del pedido (sólo lectura)"
      emptyText="Este pedido no tiene comprobantes guardados."
    />
  </Card>
);

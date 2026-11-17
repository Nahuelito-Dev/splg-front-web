import { useState } from 'react';
import { UserRound, X } from 'lucide-react';
import { Button } from '../../../common/components/ui';
import type { Customer } from '../../../services/api/types';
import { usePreviewCompanyAssistant } from '../../../services/queries/assistantLab';
import { CustomerPicker } from '../../Orders/components/CustomerPicker';
import { PreviewPanel } from './PreviewPanel';

interface Props {
  blockedReason?: string;
}

const customerName = (customer: Customer) => customer.user?.full_name ?? 'Cliente sin nombre';

/** Elegir (o no) un cliente: con uno, «¿dónde está mi pedido?» se contesta con sus pedidos. */
const CustomerChoice = ({
  selected,
  onChange,
}: {
  selected: Customer | null;
  onChange: (customer: Customer | null) => void;
}) => {
  const [open, setOpen] = useState(false);
  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-outline bg-surface-muted p-3">
        <p className="flex min-w-0 items-center gap-2 text-sm text-ink">
          <UserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
          <span className="truncate">{`Como ${customerName(selected)}`}</span>
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          icon={<X aria-hidden="true" />}
          aria-label={`Quitar a ${customerName(selected)}`}
          onClick={() => onChange(null)}
        >
          Quitar
        </Button>
      </div>
    );
  }
  if (!open) {
    return (
      <div className="flex flex-col gap-1">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="self-start"
          icon={<UserRound aria-hidden="true" />}
          onClick={() => setOpen(true)}
        >
          Probar como un cliente
        </Button>
        <p className="text-xs text-muted">Sin cliente, contesta como a alguien que no tiene pedidos.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2 rounded-xl border border-outline p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">Elegí el cliente</p>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
      <CustomerPicker
        selected={null}
        onSelect={(customer) => {
          onChange(customer);
          setOpen(false);
        }}
      />
    </div>
  );
};

/** El probador del asistente de la distribuidora, con su base y, si se elige, los pedidos de un cliente. */
export const CompanyPreviewTab = ({ blockedReason }: Props) => {
  const preview = usePreviewCompanyAssistant();
  const [customer, setCustomer] = useState<Customer | null>(null);
  return (
    <PreviewPanel
      scope="company"
      preview={preview}
      description="Lo que les contestaría a tus clientes en el chat, con tus preguntas frecuentes."
      placeholder="¿Hasta qué hora toman pedidos?"
      blockedReason={blockedReason}
      customer={{
        id: customer?.customer_id ?? null,
        picker: <CustomerChoice selected={customer} onChange={setCustomer} />,
      }}
    />
  );
};

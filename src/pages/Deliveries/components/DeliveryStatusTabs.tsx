import { Button } from '../../../common/components/ui';
import type { DeliveriesStatusTab } from '../../../services/queries/deliveries';

const TABS: { value: DeliveriesStatusTab; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'unvalidated', label: 'Por validar' },
  { value: 'enabled', label: 'Habilitados' },
  { value: 'disabled', label: 'Deshabilitados' },
  { value: 'online', label: 'En línea' },
];

interface Props {
  value: DeliveriesStatusTab;
  onChange: (value: DeliveriesStatusTab) => void;
}

/** Los cuatro grupos administrativos de choferes (CU-032/CU-033) más "en línea", en pestañas. */
export const DeliveryStatusTabs = ({ value, onChange }: Props) => (
  <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar choferes por estado">
    {TABS.map((tab) => (
      <Button
        key={tab.value}
        size="sm"
        variant={value === tab.value ? 'primary' : 'secondary'}
        onClick={() => onChange(tab.value)}
      >
        {tab.label}
      </Button>
    ))}
  </div>
);

import { Tabs, type TabItem } from '../../../common/components/ui';
import type { DeliveriesStatusTab } from '../../../services/queries/deliveries';
import { DELIVERY_TAB_LABELS, DELIVERY_TAB_ORDER } from '../deliveryTabs';

export const DELIVERY_TABS_ID = 'deliveries';

/** El tono del contador de cada grupo cuando está activo: lo que pide atención va en cálido. */
const TONES: Partial<Record<DeliveriesStatusTab, TabItem['tone']>> = {
  unvalidated: 'warn',
  enabled: 'success',
  disabled: 'danger',
  online: 'primary',
};

interface Props {
  value: DeliveriesStatusTab;
  onChange: (value: DeliveriesStatusTab) => void;
  /** Cantidad por grupo; `null` mientras no hay dato (no se muestra como 0). */
  counts: Record<DeliveriesStatusTab, number | null>;
}

/** Los grupos administrativos de choferes (CU-032/CU-033) más "en línea", en pestañas con su cantidad. */
export const DeliveryStatusTabs = ({ value, onChange, counts }: Props) => (
  <Tabs
    items={DELIVERY_TAB_ORDER.map((tab) => ({
      id: tab,
      label: DELIVERY_TAB_LABELS[tab],
      count: counts[tab],
      tone: TONES[tab],
    }))}
    value={value}
    onChange={(id) => onChange(id as DeliveriesStatusTab)}
    label="Filtrar choferes por estado"
    idPrefix={DELIVERY_TABS_ID}
  />
);

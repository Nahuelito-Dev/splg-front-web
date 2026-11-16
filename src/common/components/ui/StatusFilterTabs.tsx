import type { ReactNode } from 'react';
import type { Tone } from '../../../utils/statusLabels';
import { Tabs, type TabItem } from './Tabs';
import { tabPanelProps } from './tabIds';

export interface StatusOption {
  value: string;
  label: string;
  tone?: Tone;
}

interface Props {
  /** Los estados del listado, sin «Todos». */
  options: StatusOption[];
  /** El estado elegido; vacío = todos (así vive en la URL). */
  value: string;
  onChange: (value: string) => void;
  /** Cuántos registros hay por estado (`all` = sin filtrar por estado); `null` = sin dato todavía. */
  counts: Record<string, number | null>;
  label: string;
  idPrefix: string;
  allLabel?: string;
  /** El listado que las pestañas filtran. */
  children: ReactNode;
}

const ALL = 'all';

/** Pestañas por estado con contador sobre un listado, con su panel asociado (mismo patrón que Clientes). */
export const StatusFilterTabs = ({
  options,
  value,
  onChange,
  counts,
  label,
  idPrefix,
  allLabel = 'Todos',
  children,
}: Props) => {
  const known = options.some((option) => option.value === value);
  const active = known ? value : ALL;
  const items: TabItem[] = [
    { id: ALL, label: allLabel, count: counts[ALL] ?? null },
    ...options.map((option) => ({
      id: option.value,
      label: option.label,
      count: counts[option.value] ?? null,
      tone: option.tone,
    })),
  ];
  return (
    <>
      <Tabs
        items={items}
        value={active}
        onChange={(id) => onChange(id === ALL ? '' : id)}
        label={label}
        idPrefix={idPrefix}
      />
      <div {...tabPanelProps(idPrefix, active)}>{children}</div>
    </>
  );
};

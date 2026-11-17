import type { ReactNode } from 'react';
import { cx } from './cx';

export interface DetailItem {
  label: string;
  value: ReactNode;
  /** Identificadores técnicos (ids, patentes, CUIT, códigos) en mono. Las cifras, la plata y las fechas no: van en la sans con `tabular-nums`, que la lista ya pone. */
  mono?: boolean;
  /** Ocupa las dos columnas (textos largos). */
  wide?: boolean;
}

/** Los datos de un registro en pares etiqueta/valor, para las vistas de detalle. */
export const DetailList = ({ items, className }: { items: DetailItem[]; className?: string }) => (
  <dl className={cx('grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2', className)}>
    {items.map((item) => (
      <div key={item.label} className={item.wide ? 'sm:col-span-2' : undefined}>
        <dt className="text-xs font-medium text-muted">{item.label}</dt>
        <dd className={cx('mt-0.5 text-[13.5px] tabular-nums text-ink', item.mono && 'font-mono')}>
          {item.value ?? '—'}
        </dd>
      </div>
    ))}
  </dl>
);

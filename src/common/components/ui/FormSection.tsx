import type { ReactNode } from 'react';
import { Card } from './Card';
import { CardHeader } from './CardHeader';
import { cx } from './cx';

interface Props {
  title: string;
  subtitle?: string;
  /** Columnas de la grilla de campos: dos desde `sm` por defecto, o una sola. */
  columns?: 1 | 2;
  children: ReactNode;
}

/** Una sección de un formulario de página: tarjeta con su encabezado y los campos en grilla. */
export const FormSection = ({ title, subtitle, columns = 2, children }: Props) => (
  <Card className="p-5 sm:p-6">
    <CardHeader title={title} subtitle={subtitle} />
    <div className={cx('grid gap-4', columns === 2 && 'sm:grid-cols-2')}>{children}</div>
  </Card>
);

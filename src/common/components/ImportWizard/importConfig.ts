import type { ImportResource } from '../../../services/api/imports';
import { formatCurrency, formatNumber } from '../../../utils/format';
import { STOCK_CONDITION, SUPPLIER_KIND, labelOf } from '../../../utils/statusLabels';

type Cell = unknown;

export interface PreviewColumn {
  key: string;
  label: string;
  render?: (value: Cell, data: Record<string, unknown>) => string;
}

export interface ImportConfig {
  title: string;
  /** Lo que hace la importación, en una línea. */
  description: string;
  columns: PreviewColumn[];
  /** Cómo se llama cada concepto del `resumen` que devuelve el back. */
  summaryLabels: Record<string, string>;
}

export const cellText = (value: Cell): string =>
  value === null || value === undefined || value === '' ? '—' : String(value);
const money = (value: Cell): string => (typeof value === 'number' ? formatCurrency(value) : cellText(value));
const count = (value: Cell): string => (typeof value === 'number' ? formatNumber(value) : cellText(value));
const signed = (value: Cell): string =>
  typeof value === 'number' ? `${value > 0 ? '+' : ''}${formatNumber(value)}` : cellText(value);

export const IMPORT_CONFIG: Record<ImportResource, ImportConfig> = {
  garrafas: {
    title: 'Importar garrafas',
    description: 'Da de alta garrafas nuevas en el catálogo, con su stock inicial.',
    columns: [
      { key: 'type', label: 'Tipo' },
      { key: 'weight', label: 'Peso (kg)', render: count },
      { key: 'price', label: 'Precio', render: money },
      { key: 'stock', label: 'Stock inicial', render: count },
      { key: 'description', label: 'Descripción' },
    ],
    summaryLabels: { creadas: 'Garrafas creadas' },
  },
  precios: {
    title: 'Importar precios',
    description: 'Cambia el precio de garrafas que ya existen, por tipo.',
    columns: [
      { key: 'type', label: 'Tipo' },
      { key: 'previousPrice', label: 'Precio anterior', render: money },
      { key: 'price', label: 'Precio nuevo', render: money },
    ],
    summaryLabels: { actualizadas: 'Precios actualizados', sinCambio: 'Sin cambio' },
  },
  stock: {
    title: 'Importar stock',
    description: 'Suma o resta garrafas por depósito, tipo y condición.',
    columns: [
      { key: 'warehouse', label: 'Depósito' },
      { key: 'type', label: 'Tipo' },
      { key: 'condition', label: 'Condición', render: (value) => labelOf(STOCK_CONDITION, value as 'full').text },
      { key: 'quantityDelta', label: 'Variación', render: signed },
    ],
    summaryLabels: { filasAplicadas: 'Filas aplicadas', ajustes: 'Ajustes creados', depositos: 'Depósitos tocados' },
  },
  proveedores: {
    title: 'Importar proveedores',
    description: 'Da de alta proveedores nuevos.',
    columns: [
      { key: 'businessName', label: 'Razón social' },
      { key: 'cuit', label: 'CUIT' },
      { key: 'kind', label: 'Tipo', render: (value) => labelOf(SUPPLIER_KIND, value as 'other').text },
      { key: 'contactName', label: 'Contacto' },
      { key: 'phone', label: 'Teléfono' },
      { key: 'email', label: 'Email' },
      { key: 'address', label: 'Dirección' },
      { key: 'paymentTermsDays', label: 'Plazo (días)', render: count },
    ],
    summaryLabels: { creados: 'Proveedores creados' },
  },
};

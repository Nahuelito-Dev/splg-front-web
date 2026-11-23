import type { StockAdjustment, StockBalance, StockMovement, StockThreshold } from '../../services/api/types';

/** Las tres condiciones de una garrafa en una ubicación. */
export interface ConditionRow {
  gasCylinderId: string;
  gasCylinderType: string;
  gasCylinderPhotoUrl: string | null;
  full: number;
  empty: number;
  defective: number;
}

/** Los saldos de una ubicación, una fila por garrafa con sus tres condiciones. */
export const pivotBalances = (balances: StockBalance[]): ConditionRow[] => {
  const rows = new Map<string, ConditionRow>();
  for (const b of balances) {
    const row = rows.get(b.gasCylinderId) ?? {
      gasCylinderId: b.gasCylinderId,
      gasCylinderType: b.gasCylinderType,
      gasCylinderPhotoUrl: b.gasCylinderPhotoUrl,
      full: 0,
      empty: 0,
      defective: 0,
    };
    row[b.condition] += b.quantity;
    rows.set(b.gasCylinderId, row);
  }
  return [...rows.values()].sort((a, b) => a.gasCylinderType.localeCompare(b.gasCylinderType, 'es', { numeric: true }));
};

/** Una fila por ubicación y garrafa, para el resumen «por galpón y por camión». */
export interface LocationRow extends ConditionRow {
  rowId: string;
  locationId: string;
  locationName: string;
  locationKind: StockBalance['locationKind'];
}

export const pivotByLocation = (balances: StockBalance[]): LocationRow[] => {
  const rows = new Map<string, LocationRow>();
  for (const b of balances) {
    const rowId = `${b.locationId}:${b.gasCylinderId}`;
    const row = rows.get(rowId) ?? {
      rowId,
      locationId: b.locationId,
      locationName: b.locationName,
      locationKind: b.locationKind,
      gasCylinderId: b.gasCylinderId,
      gasCylinderType: b.gasCylinderType,
      gasCylinderPhotoUrl: b.gasCylinderPhotoUrl,
      full: 0,
      empty: 0,
      defective: 0,
    };
    row[b.condition] += b.quantity;
    rows.set(rowId, row);
  }
  return [...rows.values()].sort(
    (a, b) =>
      a.locationKind.localeCompare(b.locationKind) ||
      a.locationName.localeCompare(b.locationName, 'es') ||
      a.gasCylinderType.localeCompare(b.gasCylinderType, 'es', { numeric: true }),
  );
};

/** Pares galpón-garrafa con menos llenas que su mínimo (un mínimo en 0 no avisa). */
export const lowStock = (thresholds: StockThreshold[]): StockThreshold[] =>
  thresholds.filter((t) => t.minFull > 0 && t.currentFull < t.minFull);

/**
 * La variación que se manda al back según el motivo. Merma, fuga, rotura y pérdida siempre restan; lo encontrado
 * siempre suma; la corrección de conteo lleva el signo que escribió quien la carga. La cantidad se escribe en
 * positivo para que nadie reste dos veces por error.
 */
export const adjustmentDelta = (reason: StockAdjustment['reason'], amount: number): number => {
  if (reason === 'found') return Math.abs(amount);
  if (reason === 'count_correction') return amount;
  return -Math.abs(amount);
};

/** La rotura pasa llenas a defectuosas: sólo se aplica sobre la condición `full`. */
export const adjustmentCondition = (
  reason: StockAdjustment['reason'],
  chosen: StockBalance['condition'],
): StockBalance['condition'] => (reason === 'damaged' ? 'full' : chosen);

/** El nombre de un extremo de un movimiento: sin ubicación es una entrada o salida del sistema (planta, entrega). */
export const placeName = (place: { name: string } | null | undefined): string => place?.name ?? 'Fuera del stock';

export const thresholdCellKey = (warehouseId: string, gasCylinderId: string): string =>
  `${warehouseId}:${gasCylinderId}`;

/**
 * Los mínimos que cambiaron respecto de lo guardado, listos para el PUT. Un par sin mínimo previo cuenta como 0:
 * dejarlo en 0 no es un cambio.
 */
export const changedThresholds = (
  edits: Record<string, string>,
  current: Map<string, Pick<StockThreshold, 'minFull'>>,
): { warehouseId: string; gasCylinderId: string; minFull: number }[] =>
  Object.entries(edits).flatMap(([key, raw]) => {
    const [warehouseId, gasCylinderId] = key.split(':');
    const minFull = raw === '' ? 0 : Number(raw);
    if (!Number.isInteger(minFull) || minFull < 0) return [];
    return minFull === (current.get(key)?.minFull ?? 0) ? [] : [{ warehouseId, gasCylinderId, minFull }];
  });

export interface MovementBatch {
  batchId: string;
  occurredAt: string;
  actorName: string | null;
  notes: string | null;
  lines: StockMovement[];
}

/** Los movimientos de una página agrupados por lote, en el orden en que aparecen: el lote es la unidad de una transferencia. */
export const groupByBatch = (movements: StockMovement[]): MovementBatch[] => {
  const batches = new Map<string, MovementBatch>();
  for (const m of movements) {
    const batch = batches.get(m.batchId);
    if (batch) batch.lines.push(m);
    else
      batches.set(m.batchId, {
        batchId: m.batchId,
        occurredAt: m.occurredAt,
        actorName: m.actorName,
        notes: m.notes,
        lines: [m],
      });
  }
  return [...batches.values()];
};

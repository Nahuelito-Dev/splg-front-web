import type { TruckLoad, TruckLoadItem, TruckStock } from '../../services/api/types';

type Status = TruckLoad['status'];

/** Qué se puede hacer con una carga según su estado (las mismas transiciones que la API). */
export const loadActions = (status: Status) => ({
  /** Los renglones sólo se editan mientras se carga. */
  canEditItems: status === 'loading',
  canDepart: status === 'loading',
  canCancel: status === 'loading',
  /** La reposición es sobre la misma carga y sólo en ruta. */
  canReload: status === 'on_route',
  /** Se puede volver a declarar la vuelta hasta cerrar. */
  canDeclareReturn: status === 'on_route' || status === 'returned',
  canClose: status === 'returned',
  isOpen: status === 'loading' || status === 'on_route' || status === 'returned',
});

/** Hay diferencia en la rendición si algún renglón declarado difiere de lo esperado, en llenas o en vacías. */
export const hasDifference = (items: TruckLoadItem[]): boolean =>
  items.some((i) => (i.differenceFull ?? 0) !== 0 || (i.differenceEmpty ?? 0) !== 0);

/**
 * Por qué la rendición lleva diferencia (y por lo tanto nota obligatoria), con el mismo criterio que el back
 * (`planDeCierre`): lo declarado contra lo esperado, lo declarado contra el saldo real del camión (alguien lo movió a
 * mano) y los tipos que el camión tiene pero la carga no lista (se rinden como faltante). Las defectuosas no cuentan.
 * `truck` en `null` es que todavía no se pudo leer el saldo real: se devuelve `unknown`.
 */
export const closeDifference = (
  items: TruckLoadItem[],
  truck: TruckStock | null,
): { reasons: string[]; unknown: boolean } => {
  const reasons: string[] = [];
  for (const i of items) {
    if ((i.differenceFull ?? 0) !== 0 || (i.differenceEmpty ?? 0) !== 0) {
      reasons.push(`${i.gasCylinderType}: lo declarado no coincide con lo esperado`);
    }
    const declaredFull = i.declaredReturnFull ?? 0;
    const declaredEmpty = i.declaredReturnEmpty ?? 0;
    if (truck && (i.onTruckFull !== declaredFull || i.onTruckEmpty !== declaredEmpty)) {
      reasons.push(
        `${i.gasCylinderType}: el camión tiene ${i.onTruckFull} llenas y ${i.onTruckEmpty} vacías y se declararon ${declaredFull} y ${declaredEmpty}`,
      );
    }
  }
  if (truck) {
    const listed = new Set(items.map((i) => i.gasCylinderId));
    for (const t of truck.items) {
      if (!listed.has(t.gasCylinderId) && (t.full > 0 || t.empty > 0)) {
        reasons.push(
          `${t.gasCylinderType}: el camión tiene ${t.full} llenas y ${t.empty} vacías que no figuran en la carga`,
        );
      }
    }
  }
  return { reasons: [...new Set(reasons)], unknown: truck === null };
};

/** Se declara por renglón: ¿ya declaró el chofer (o el administrador por él)? */
export const hasDeclared = (items: TruckLoadItem[]): boolean =>
  items.length > 0 && items.every((i) => i.declaredReturnFull !== null && i.declaredReturnEmpty !== null);

/** Los renglones de la declaración de la vuelta: se cargan vacíos (hay que contar) y lo esperado va de referencia. */
export const declarationRows = (items: TruckLoadItem[]) =>
  items.map((i) => ({
    gasCylinderId: i.gasCylinderId,
    type: i.gasCylinderType,
    declaredFull: i.declaredReturnFull === null ? '' : String(i.declaredReturnFull),
    declaredEmpty: i.declaredReturnEmpty === null ? '' : String(i.declaredReturnEmpty),
  }));

/** `+3`, `−2`, `0`: la diferencia con su signo. */
export const signed = (value: number | null): string => {
  if (value === null) return '—';
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return '0';
};

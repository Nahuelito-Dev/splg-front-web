import type { AsientoDeAuditoria, Claim } from '../../../services/api/types';
import { CLAIM_STATUS } from '../../../utils/statusLabels';
import { roleLabel } from '../../Users/roleLabel';

type Entry = Pick<AsientoDeAuditoria, 'httpMethod' | 'path' | 'result' | 'changes'>;

/** Quién hizo el movimiento, en palabras: el rol, o «Sistema» si no hubo usuario. */
export const actorLabel = (role: string | null): string => (role ? roleLabel(role).text : 'Sistema');

/** La acción del reclamo (`/api/claims/:id/take`) sin el prefijo ni el método. */
const actionOf = (path: string): string => {
  const segments = path.split('/').filter(Boolean);
  const at = segments.indexOf('claims');
  return at === -1 ? '' : segments.slice(at + 1).join('/');
};

interface Phrases {
  done: string;
  failed: string;
}

const phrasesOf = (entry: Entry): Phrases | null => {
  const action = actionOf(entry.path);
  if (entry.httpMethod === 'POST' && action === '') {
    return { done: 'Creó el reclamo', failed: 'No se pudo crear el reclamo' };
  }
  if (entry.httpMethod === 'POST' && action === ':id/photo') {
    return { done: 'Adjuntó una foto', failed: 'No se pudo adjuntar la foto' };
  }
  if (entry.httpMethod === 'PATCH' && action === ':id/take') {
    return { done: 'Tomó el reclamo', failed: 'No se pudo tomar el reclamo' };
  }
  if (entry.httpMethod === 'PATCH' && action === ':id/reopen') {
    return { done: 'Reabrió el reclamo', failed: 'No se pudo reabrir el reclamo' };
  }
  if (entry.httpMethod === 'PATCH' && action === ':id/resolve') {
    const status = entry.changes?.status;
    if (status === 'rejected') return { done: 'Rechazó el reclamo', failed: 'No se pudo rechazar el reclamo' };
    if (status === 'resolved') return { done: 'Resolvió el reclamo', failed: 'No se pudo resolver el reclamo' };
    if (typeof status === 'string' && Object.prototype.hasOwnProperty.call(CLAIM_STATUS, status)) {
      const text = CLAIM_STATUS[status as Claim['status']].text;
      return { done: `Cambió el estado a ${text}`, failed: `No se pudo cambiar el estado a ${text}` };
    }
  }
  return null;
};

/** La frase de una entrada del historial; lo que no se conoce cae en un texto genérico, nunca la ruta cruda. */
export const claimHistoryLabel = (entry: Entry): string => {
  const phrases = phrasesOf(entry);
  if (entry.result === 'failure') return phrases?.failed ?? 'No se pudo completar un cambio en el reclamo';
  return phrases?.done ?? 'Modificó el reclamo';
};

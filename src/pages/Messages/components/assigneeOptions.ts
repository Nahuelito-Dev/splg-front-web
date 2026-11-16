import { normalizeText } from '../../../common/components/Navbar/searchItems';
import type { InboxAssigneeOption } from '../../../services/api/types';

/** Con más de estas personas, el modal de asignar ofrece buscar. */
export const ASSIGNEE_SEARCH_FROM = 8;

/**
 * Las personas para asignar en el orden en que se muestran: quien mira primero («Yo») y el resto como lo manda la API
 * (por nombre). Con `term`, sólo las que tienen esas letras en el nombre (sin tildes ni mayúsculas).
 */
export const orderAssignees = (
  items: InboxAssigneeOption[],
  myUserId: string | undefined,
  term = '',
): InboxAssigneeOption[] => {
  const needle = normalizeText(term);
  const matching = needle ? items.filter((item) => normalizeText(item.fullName).includes(needle)) : items;
  const me = matching.filter((item) => item.userId === myUserId);
  return [...me, ...matching.filter((item) => item.userId !== myUserId)];
};

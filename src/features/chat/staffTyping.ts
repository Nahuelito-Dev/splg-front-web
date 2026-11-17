import { useEffect, useState, useSyncExternalStore } from 'react';
import type { StaffTypingEvent } from './socketEvents';

/**
 * «Ana está respondiendo…» (`chat:staff-typing`): quién más del equipo escribe en cada conversación, para no responder
 * dos a la vez. Vive en memoria y cada aviso dura hasta su `until`; el back no se lo manda a quien escribe.
 */
export interface StaffTyping {
  userId: string;
  name: string;
  internal: boolean;
  until: number;
}

const state = new Map<string, StaffTyping[]>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export const staffTypingStore = {
  set(this: void, event: StaffTypingEvent) {
    const until = Date.parse(event.until);
    if (Number.isNaN(until)) return;
    const others = (state.get(event.conversationId) ?? []).filter((t) => t.userId !== event.userId);
    state.set(event.conversationId, [
      ...others,
      { userId: event.userId, name: event.name, internal: event.internal, until },
    ]);
    emit();
  },
  /** Esa persona mandó su mensaje o su nota: deja de estar «respondiendo» sin esperar el `until`. */
  clear(this: void, conversationId: string, userId: string) {
    const current = state.get(conversationId);
    if (!current?.some((t) => t.userId === userId)) return;
    const rest = current.filter((t) => t.userId !== userId);
    if (rest.length) state.set(conversationId, rest);
    else state.delete(conversationId);
    emit();
  },
  get(this: void, conversationId: string): StaffTyping[] | undefined {
    return state.get(conversationId);
  },
  subscribe(this: void, listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  reset(this: void) {
    state.clear();
    emit();
  },
};

/** Quiénes del equipo escriben ahora en la conversación. Cada uno se apaga solo al llegar a su `until`. */
export const useStaffTyping = (conversationId: string): StaffTyping[] => {
  const typing = useSyncExternalStore(staffTypingStore.subscribe, () => staffTypingStore.get(conversationId));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const pending = (typing ?? []).map((t) => t.until - Date.now()).filter((wait) => wait > 0);
    if (pending.length === 0) return;
    const next = Math.min(...pending);
    const timer = window.setTimeout(() => setNow(Date.now()), next + 50);
    return () => window.clearTimeout(timer);
  }, [typing, now]);
  const at = Math.max(now, Date.now());
  return (typing ?? []).filter((t) => t.until > at);
};

/** «Ana está respondiendo…», «Ana escribe una nota interna…» o, si son varias, «Ana y Luis están respondiendo…». */
export const staffTypingText = (typing: StaffTyping[]): string | null => {
  if (typing.length === 0) return null;
  if (typing.length === 1) {
    const [only] = typing;
    return only.internal ? `${only.name} escribe una nota interna…` : `${only.name} está respondiendo…`;
  }
  const names = typing.map((t) => t.name);
  const joined = `${names.slice(0, -1).join(', ')} y ${names.at(-1)}`;
  return typing.every((t) => t.internal) ? `${joined} escriben notas internas…` : `${joined} están respondiendo…`;
};

import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ChatParty } from '../../services/api/supportChat';

/**
 * «Escribiendo…» de la otra punta, por conversación (`chat:typing { conversationId, party, until }`). Vive en memoria:
 * dura hasta `until` y se apaga solo; un mensaje nuevo de esa punta lo apaga antes.
 */
interface Typing {
  party: ChatParty;
  until: number;
}

const state = new Map<string, Typing>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export const typingStore = {
  set(this: void, conversationId: string, party: ChatParty, until: string) {
    const at = Date.parse(until);
    if (Number.isNaN(at)) return;
    state.set(conversationId, { party, until: at });
    emit();
  },
  clear(this: void, conversationId: string) {
    if (state.delete(conversationId)) emit();
  },
  get(this: void, conversationId: string): Typing | undefined {
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

/** La punta que está escribiendo en esa conversación, o `null`. Se apaga sola al llegar a `until`. */
export const useTyping = (conversationId: string | null): ChatParty | null => {
  const typing = useSyncExternalStore(typingStore.subscribe, () =>
    conversationId ? typingStore.get(conversationId) : undefined,
  );
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!typing) return;
    const wait = typing.until - Date.now();
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setNow(Date.now()), wait + 50);
    return () => window.clearTimeout(timer);
  }, [typing]);
  return typing && typing.until > Math.max(now, Date.now()) ? typing.party : null;
};

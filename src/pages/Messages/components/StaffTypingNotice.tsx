import { PenLine } from 'lucide-react';
import { staffTypingText, useStaffTyping } from '../../../features/chat/staffTyping';

/**
 * El aviso de colisión (8b): otra persona del equipo está escribiendo en esta conversación (`chat:staff-typing`). Va en
 * su renglón arriba del compositor, sin taparlo, y se apaga solo al llegar al `until` de cada aviso.
 */
export const StaffTypingNotice = ({ conversationId }: { conversationId: string }) => {
  const text = staffTypingText(useStaffTyping(conversationId));
  return (
    <div role="status" aria-live="polite" className="min-h-0">
      {text && (
        <p className="flex items-center gap-1.5 border-t border-outline-soft bg-warn-soft px-4 py-1.5 text-xs font-medium text-warn">
          <PenLine aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 truncate">{text}</span>
        </p>
      )}
    </div>
  );
};

import {
  Bell,
  MessageSquareWarning,
  Receipt,
  ShieldAlert,
  TriangleAlert,
  Undo2,
  UserRoundSearch,
  type LucideIcon,
} from 'lucide-react';
import type { AdminNotification } from '../services/api/types';
import type { Tone } from './statusLabels';

const KIND_VISUALS: Record<string, { icon: LucideIcon; tone: Tone }> = {
  claim_created: { icon: MessageSquareWarning, tone: 'warn' },
  incident_created: { icon: TriangleAlert, tone: 'warn' },
  order_no_drivers: { icon: UserRoundSearch, tone: 'warn' },
  refund_failed: { icon: Undo2, tone: 'danger' },
  transfer_receipt_uploaded: { icon: Receipt, tone: 'success' },
  cylinder_dispatch_blocked: { icon: ShieldAlert, tone: 'danger' },
};

/** Ícono y tono de un aviso guardado según su `kind`; un tipo que el panel no conoce se muestra con uno genérico. */
export const notificationVisuals = (kind: string): { icon: LucideIcon; tone: Tone } =>
  KIND_VISUALS[kind] ?? { icon: Bell, tone: 'info' };

/** A dónde lleva un aviso guardado; `null` si no tiene enlace o apunta a algo que el panel no sabe abrir. */
export const notificationTarget = (link: AdminNotification['link'] | undefined): string | null => {
  if (!link) return null;
  const id = encodeURIComponent(link.id);
  switch (link.entity) {
    case 'order':
      return `/orders/${id}`;
    case 'claim':
      return `/claims?claim=${id}`;
    case 'incident':
      return `/incidents?incident=${id}`;
    default:
      return null;
  }
};

import {
  Bell,
  CalendarClock,
  CalendarX2,
  Copy,
  Gavel,
  Landmark,
  FileWarning,
  MessageSquareWarning,
  PackageSearch,
  Receipt,
  Scale,
  SearchCheck,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  TriangleAlert,
  Undo2,
  Unplug,
  UserRoundSearch,
  Wrench,
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
  fleet_document_due: { icon: CalendarClock, tone: 'warn' },
  fleet_document_expired: { icon: CalendarX2, tone: 'danger' },
  employee_document_missing: { icon: FileWarning, tone: 'warn' },
  insurance_installment_due: { icon: CalendarClock, tone: 'warn' },
  insurance_installment_overdue: { icon: ShieldX, tone: 'danger' },
  insurance_policy_expiring: { icon: ShieldCheck, tone: 'warn' },
  traffic_fine_due: { icon: Gavel, tone: 'warn' },
  traffic_fine_overdue: { icon: Gavel, tone: 'danger' },
  sales_cash_unsettled: { icon: Landmark, tone: 'warn' },
  payment_in_mediation: { icon: Scale, tone: 'danger' },
  payment_chargeback_opened: { icon: Scale, tone: 'danger' },
  payment_chargeback: { icon: Scale, tone: 'danger' },
  payment_refunded: { icon: Undo2, tone: 'warn' },
  payment_fraud_alert: { icon: ShieldAlert, tone: 'danger' },
  payment_duplicate: { icon: Copy, tone: 'warn' },
  payment_needs_review: { icon: SearchCheck, tone: 'warn' },
  payment_lookup_failed: { icon: Unplug, tone: 'danger' },
  payment_chargeback_resolved: { icon: Scale, tone: 'success' },
  payment_chargeback_review: { icon: SearchCheck, tone: 'warn' },
  payment_alert_unprocessed: { icon: ShieldAlert, tone: 'danger' },
  payment_without_attempt: { icon: SearchCheck, tone: 'warn' },
  maintenance_escalated: { icon: Wrench, tone: 'danger' },
  cylinder_recovery_escalated: { icon: PackageSearch, tone: 'danger' },
  maintenance_window_agreed: { icon: Wrench, tone: 'warn' },
  vehicle_grounded_expired: { icon: ShieldX, tone: 'danger' },
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
    case 'fleet-task':
      return `/fleet/tasks/${id}`;
    case 'employee':
      return `/employees/details/${id}?tab=documents`;
    case 'car-insurance':
      return `/cars/details/${id}?tab=insurance`;
    case 'cash-settings':
      return '/finance/collection-settings';
    case 'traffic-fine':
      return `/fleet/fines?fine=${id}`;
    case 'cylinder-recovery-case':
      return `/physical-cylinders/recovery?case=${id}`;
    case 'maintenance-planner':
      return `/fleet/planner?case=${id}`;
    case 'car':
      return `/cars/details/${id}`;
    default:
      return null;
  }
};

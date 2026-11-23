import {
  Activity,
  AtSign,
  Bell,
  CalendarClock,
  CalendarX2,
  Copy,
  Gavel,
  HandCoins,
  Landmark,
  LifeBuoy,
  FileWarning,
  MessageSquareWarning,
  PackageSearch,
  Receipt,
  Scale,
  ScanText,
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
  driver_cash_unreported: { icon: HandCoins, tone: 'warn' },
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
  process_run_alert: { icon: Activity, tone: 'danger' },
  document_reading_proposal: { icon: ScanText, tone: 'warn' },
  document_reading_notice: { icon: FileWarning, tone: 'warn' },
  support_access_requested: { icon: LifeBuoy, tone: 'warn' },
  support_emergency_opened: { icon: LifeBuoy, tone: 'danger' },
  support_access_auto_approved: { icon: LifeBuoy, tone: 'info' },
  chat_mention: { icon: AtSign, tone: 'info' },
};

/** El aviso de una mención en una nota interna del chat (sólo le llega a la persona mencionada). */
export const CHAT_MENTION_KIND = 'chat_mention';

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
    case 'driver-settlement-cash':
      return '/finance/settlements';
    case 'cash-settings':
      return '/finance/collection-settings';
    case 'traffic-fine':
      return `/fleet/fines?fine=${id}`;
    case 'cylinder-recovery-case':
      return `/physical-cylinders/recovery?case=${id}`;
    // Lleva a la pestaña Seguro del vehículo, pero el aviso sólo trae la cuota: lo resuelve `useInstallmentTarget`.
    case 'insurance-installment':
      return null;
    case 'maintenance-planner':
      return `/fleet/planner?case=${id}`;
    case 'car':
      return `/cars/details/${id}`;
    case 'process-run':
      return '/platform/monitoring';
    case 'document-reading':
      return `/document-readings/${id}`;
    case 'support-session':
      return `/support-access?session=${id}`;
    case 'conversation':
      return `/messages/${id}`;
    default:
      return null;
  }
};

/** El aviso «¿Aprobar pago?» de una cuota del seguro: apunta a la cuota (no al vehículo) y se aprueba desde la bandeja. */
export const approvalInstallmentId = (notification: Pick<AdminNotification, 'link'>): string | null =>
  notification.link?.entity === 'insurance-installment' ? notification.link.id : null;

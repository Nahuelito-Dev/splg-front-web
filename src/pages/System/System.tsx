import { PageHeader } from '../../common/components/ui';
import { EmailTestCard } from './components/EmailTestCard';
import { NotificationTestCard } from './components/NotificationTestCard';
import { OrderConfirmationCard } from './components/OrderConfirmationCard';
import { RolesCard } from './components/RolesCard';
import { SystemHealthCard } from './components/SystemHealthCard';

/**
 * Herramientas de plataforma para el administrador general: estado del
 * sistema, pruebas de correo y push, y los roles del sistema. Sólo super
 * admin: la API rechaza cada uno de estos endpoints con 403 para un admin de
 * empresa, así que además de ocultarse del menú (`superAdminOnly`), si
 * alguien entra igual por URL cada tarjeta va a mostrar su propio error.
 */
export const System = () => (
  <div className="mx-auto max-w-5xl p-4 md:p-8">
    <PageHeader
      title="Sistema"
      description="Estado de la plataforma y herramientas de soporte, sólo para la plataforma."
    />
    <div className="space-y-6">
      <SystemHealthCard />
      <EmailTestCard />
      <NotificationTestCard />
      <OrderConfirmationCard />
      <RolesCard />
    </div>
  </div>
);

import { Mail, Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, DetailList } from '../../../../common/components/ui';
import type { Customer } from '../../../../services/api/types';
import { useGasCylinderTypes } from '../../../../services/queries/gasCylinders';
import { useDefaultUserAddress } from '../../../../services/queries/userAddresses';
import { formatDate, formatNumber } from '../../../../utils/format';

const Row = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <li className="flex items-center gap-3 text-sm text-ink [&_svg]:h-5 [&_svg]:w-5 [&_svg]:text-muted">
    {icon}
    <span className="min-w-0 truncate">{children}</span>
  </li>
);

const yesNo = (value: boolean) => (value ? 'Sí' : 'No');

/**
 * Pestaña "Resumen": todo lo que devuelven `CustomerResponseDto` y, anidado, `UserResponseDto`.
 * El consumo mensual y la garrafa habitual son lo que el cliente declaró (CU-143 y CU-144): el administrador los
 * consulta pero no los modifica. La garrafa habitual sólo se muestra si es del catálogo de la distribuidora; la
 * recompra estimada (`nextRepurchaseEstimateAt`) no se muestra acá: sale de compras en cualquier distribuidora; la de esta
 * distribuidora, calculada sólo con sus entregas, está en la pestaña «Recompra». `notification_token` queda afuera a propósito: ni siquiera lo devuelve la API (es el token push del
 * dispositivo, de uso interno). `lat_lang` es la última posición del dispositivo, no una dirección; se edita con
 * CU-094 (`PATCH /customers/:id/location`), la única escritura con sentido desde el panel sobre
 * `PATCH /customers/:id`. A diferencia de la cuenta y las direcciones, esta escritura no está restringida al
 * administrador general.
 */
export const CustomerSummary = ({ customer }: { customer: Customer }) => {
  const user = customer.user;
  const {
    data: defaultAddress,
    isPending: loadingAddress,
    error: addressError,
  } = useDefaultUserAddress(customer.user_id);
  // La API devuelve la primera dirección cuando ninguna está marcada: sólo cuenta si `isDefault`.
  // El catálogo es por distribuidora: la garrafa habitual sólo se muestra si es del catálogo de la
  // distribuidora en contexto; la de otra empresa no se revela.
  const { data: catalog, isPending: loadingCatalog } = useGasCylinderTypes();
  const habitualCylinder = customer.declaredCylinderTypeId
    ? catalog?.rows.find((cylinder) => cylinder.gas_cylinder_id === customer.declaredCylinderTypeId)?.type
    : undefined;
  const habitualCylinderLabel =
    customer.declaredCylinderTypeId && loadingCatalog ? 'Cargando…' : (habitualCylinder ?? 'Sin declarar');
  const defaultAddressLabel = loadingAddress
    ? 'Cargando…'
    : addressError
      ? 'No se pudo cargar'
      : defaultAddress?.isDefault
        ? [defaultAddress.street, defaultAddress.city].filter(Boolean).join(', ')
        : 'Sin dirección predeterminada';

  return (
    <Card className="p-6">
      <ul className="space-y-3">
        <Row icon={<Mail />}>{user?.email ?? '—'}</Row>
        <Row icon={<Phone />}>{user?.phone_number ?? '—'}</Row>
      </ul>
      <DetailList
        className="mt-5 border-t border-outline pt-5"
        items={[
          { label: 'ID de cliente', value: customer.customer_id, mono: true, wide: true },
          { label: 'ID de usuario', value: customer.user_id, mono: true, wide: true },
          { label: 'Teléfono verificado', value: user ? yesNo(user.phone_verified) : '—' },
          { label: 'Email verificado', value: user ? yesNo(user.email_verified) : '—' },
          { label: 'Dirección predeterminada', value: defaultAddressLabel, wide: true },
          {
            label: 'Consumo declarado',
            value:
              customer.avgMonthlyConsumptionKg == null
                ? 'Sin declarar'
                : `${formatNumber(customer.avgMonthlyConsumptionKg)} kg por mes`,
          },
          { label: 'Garrafa habitual', value: habitualCylinderLabel },
          { label: 'Última ubicación conocida', value: customer.lat_lang ?? 'Sin datos' },
          { label: 'Cliente desde', value: formatDate(customer.createdAt) },
          { label: 'Cuenta desde', value: user ? formatDate(user.createdAt) : '—' },
          { label: 'Baja del perfil de cliente', value: formatDate(customer.deletedAt) },
          { label: 'Baja de la cuenta', value: user ? formatDate(user.deletedAt) : '—' },
        ]}
      />
    </Card>
  );
};

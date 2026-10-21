import { useState } from 'react';
import { History, MapPin, Pencil, Plus, Star, Trash2, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  RowActions,
  CardHeader,
} from '../../../../common/components/ui';
import { usePermissions } from '../../../../hooks';
import type { UserAddressConUsuario } from '../../../../services/api/types';
import {
  useDeleteUserAddress,
  useSetDefaultUserAddress,
  useUserAddresses,
} from '../../../../services/queries/userAddresses';
import { auditHistoryPath } from '../../../../utils/auditLabels';
import { confirm, notify } from '../../../../utils/notifications';
import { AddressFormModal } from './AddressFormModal';

const mapsUrl = (address: UserAddressConUsuario) =>
  `https://www.google.com/maps/search/?api=1&query=${address.latitude},${address.longitude}`;

const unit = ({ floor, apartment }: UserAddressConUsuario) =>
  [floor && `Piso ${floor}`, apartment && `Depto ${apartment}`].filter(Boolean).join(' · ');

const GEOCODE_PRECISION_LABEL: Record<UserAddressConUsuario['geocodePrecision'], string> = {
  exact: 'Ubicación exacta',
  approximate: 'Ubicación aproximada',
  unresolved: 'Sin resolver',
};

type FormState = { open: false } | { open: true; address: UserAddressConUsuario | null };

interface AddressAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  tone?: 'neutral' | 'danger';
}

export const CustomerAddresses = ({ userId }: { userId: string }) => {
  const { canManageCustomerAccounts } = usePermissions();
  const { data, isPending, error, refetch } = useUserAddresses(userId);
  const addresses = data ?? [];
  const setDefault = useSetDefaultUserAddress();
  const deleteAddress = useDeleteUserAddress();
  const [form, setForm] = useState<FormState>({ open: false });
  const navigate = useNavigate();

  const handleSetDefault = (address: UserAddressConUsuario) => {
    setDefault.mutate(address.address_id, {
      onSuccess: () => notify.success('Dirección marcada como principal'),
      onError: notify.error,
    });
  };

  const actionsFor = (address: UserAddressConUsuario): AddressAction[] => {
    const actions: AddressAction[] = [
      { label: 'Editar', icon: Pencil, onClick: () => setForm({ open: true, address }) },
    ];
    if (!address.isDefault) {
      actions.push({ label: 'Marcar como principal', icon: Star, onClick: () => handleSetDefault(address) });
    }
    actions.push({
      label: 'Ver historial de cambios',
      icon: History,
      onClick: () => navigate(auditHistoryPath('UserAddress', address.address_id)),
    });
    actions.push({ label: 'Dar de baja', icon: Trash2, tone: 'danger', onClick: () => void handleDelete(address) });
    return actions;
  };

  const handleDelete = async (address: UserAddressConUsuario) => {
    const confirmed = await confirm({
      title: '¿Dar de baja la dirección?',
      text: address.isDefault
        ? `Baja lógica: ${address.street} es la dirección principal. Si tiene otras, la más reciente pasa a ser la principal. No se borra.`
        : `Baja lógica: ${address.street} deja de ofrecerse, pero no se borra.`,
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (!confirmed) return;
    deleteAddress.mutate(address.address_id, {
      onSuccess: () => notify.success('Dirección dada de baja'),
      onError: notify.error,
    });
  };

  return (
    <Card className="p-6">
      <CardHeader
        title="Direcciones"
        action={
          canManageCustomerAccounts &&
          addresses.length > 0 && (
            <IconButton
              label="Agregar dirección"
              icon={<Plus />}
              onClick={() => setForm({ open: true, address: null })}
            />
          )
        }
      />

      {isPending ? (
        <LoadingState label="Cargando direcciones…" />
      ) : error ? (
        <ErrorState error={error} resource="Las direcciones" onRetry={() => void refetch()} />
      ) : addresses.length === 0 ? (
        <EmptyState
          title="Sin direcciones"
          description="El cliente todavía no cargó ninguna."
          action={
            canManageCustomerAccounts && (
              <IconButton
                label="Agregar dirección"
                icon={<Plus />}
                onClick={() => setForm({ open: true, address: null })}
              />
            )
          }
        />
      ) : (
        <ul className="space-y-3">
          {addresses.map((address) => (
            <li key={address.address_id} className="rounded-xl border border-outline bg-surface-hover p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-ink">{address.street}</p>
                <div className="flex items-center gap-1.5">
                  {address.isDefault && <Badge label={{ text: 'Principal', tone: 'success' }} />}
                  {canManageCustomerAccounts && <RowActions rowLabel={address.street} actions={actionsFor(address)} />}
                </div>
              </div>
              <p className="text-xs text-muted">
                {[unit(address), address.city, address.postalCode].filter(Boolean).join(' · ')}
              </p>
              {address.formattedAddress && <p className="mt-1 text-xs text-muted">{address.formattedAddress}</p>}
              {address.additionalInstructions && (
                <p className="mt-1 text-xs italic text-muted">“{address.additionalInstructions}”</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {address.latitude && address.longitude && (
                  <a
                    href={mapsUrl(address)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary-strong hover:underline"
                  >
                    <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
                    Ver en el mapa
                    <span className="sr-only">(se abre en otra pestaña)</span>
                  </a>
                )}
                <span className="text-xs text-muted">{GEOCODE_PRECISION_LABEL[address.geocodePrecision]}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManageCustomerAccounts && (
        <AddressFormModal
          open={form.open}
          onClose={() => setForm({ open: false })}
          userId={userId}
          address={form.open ? form.address : null}
          isFirstAddress={addresses.length === 0}
        />
      )}
    </Card>
  );
};

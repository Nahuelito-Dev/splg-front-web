import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { LatLngTuple } from 'leaflet';
import {
  Button,
  ErrorState,
  Form,
  FormCheckbox,
  FormInput,
  FormSelect,
  FormTextArea,
  LoadingState,
  Modal,
} from '../../../../common/components/ui';
import type {
  CreateUserAddressBody,
  UpdateUserAddressBody,
  UserAddressConUsuario,
} from '../../../../services/api/types';
import { useCreateUserAddress, useUpdateUserAddress, useUserAddress } from '../../../../services/queries/userAddresses';
import { notify } from '../../../../utils/notifications';
import { AddressLocationPicker } from './AddressLocationPicker';
import { addressSchema, GEOCODE_PRECISION_OPTIONS, type AddressFormValues } from './addressSchema';

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  /** `null` da de alta una dirección nueva; con una dirección, la edita. */
  address: UserAddressConUsuario | null;
  /** Si todavía no tiene ninguna, se propone esta como predeterminada. */
  isFirstAddress: boolean;
}

const defaultsFor = (address: UserAddressConUsuario | null, isFirstAddress: boolean): AddressFormValues => ({
  street: address?.street ?? '',
  city: address?.city ?? '',
  postalCode: address?.postalCode ?? '',
  floor: address?.floor ?? '',
  apartment: address?.apartment ?? '',
  formattedAddress: address?.formattedAddress ?? '',
  additionalInstructions: address?.additionalInstructions ?? '',
  geocodePrecision: address?.geocodePrecision ?? 'approximate',
  latitude: address?.latitude != null ? Number(address.latitude) : Number.NaN,
  longitude: address?.longitude != null ? Number(address.longitude) : Number.NaN,
  isDefault: address?.isDefault ?? isFirstAddress,
});

/**
 * Al crear, un campo opcional vacío no se manda (si no, la API guarda `''`
 * en vez de `null`). Al editar es al revés: como el PATCH es parcial, no
 * mandar la clave significa "no tocar este campo", así que para borrar un
 * dato que ya tenía (dejar el piso en blanco, por ejemplo) hay que mandar
 * `''` explícitamente.
 */
const orUndefined = (value?: string): string | undefined => (value?.trim() ? value.trim() : undefined);
const orEmpty = (value?: string): string => value?.trim() ?? '';

export const AddressFormModal = ({ open, onClose, userId, address, isFirstAddress }: Props) => {
  const createAddress = useCreateUserAddress();
  const updateAddress = useUpdateUserAddress();
  const saving = createAddress.isPending || updateAddress.isPending;
  // Al editar se pide la dirección de nuevo (`GET /user-address/:id`) en vez de partir de la copia de la lista.
  const isEditing = Boolean(address);
  const fresh = useUserAddress(address?.address_id, open && isEditing);
  const source = isEditing ? (fresh.data ?? null) : null;
  const waitingForAddress = isEditing && !fresh.data;

  const methods = useForm<AddressFormValues>({ resolver: zodResolver(addressSchema) });
  const {
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = methods;

  useEffect(() => {
    if (open && !waitingForAddress) reset(defaultsFor(source, isFirstAddress));
  }, [open, source, waitingForAddress, isFirstAddress, reset]);

  const latitude = watch('latitude');
  const longitude = watch('longitude');
  const point: LatLngTuple | null =
    Number.isFinite(latitude) && Number.isFinite(longitude) ? [latitude, longitude] : null;

  const onSubmit = (values: AddressFormValues) => {
    const base = {
      street: values.street.trim(),
      city: values.city.trim(),
      geocodePrecision: values.geocodePrecision,
      latitude: values.latitude.toString(),
      longitude: values.longitude.toString(),
      isDefault: values.isDefault,
    };

    if (address) {
      const body: UpdateUserAddressBody = {
        ...base,
        postalCode: orEmpty(values.postalCode),
        floor: orEmpty(values.floor),
        apartment: orEmpty(values.apartment),
        formattedAddress: orEmpty(values.formattedAddress),
        additionalInstructions: orEmpty(values.additionalInstructions),
      };
      updateAddress.mutate(
        { addressId: address.address_id, body },
        {
          onSuccess: () => {
            notify.success('Dirección actualizada');
            onClose();
          },
          onError: notify.error,
        },
      );
      return;
    }

    const body: CreateUserAddressBody = {
      ...base,
      user_id: userId,
      postalCode: orUndefined(values.postalCode),
      floor: orUndefined(values.floor),
      apartment: orUndefined(values.apartment),
      formattedAddress: orUndefined(values.formattedAddress),
      additionalInstructions: orUndefined(values.additionalInstructions),
    };
    createAddress.mutate(body, {
      onSuccess: () => {
        notify.success('Dirección agregada');
        onClose();
      },
      onError: notify.error,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={address ? 'Editar dirección' : 'Nueva dirección'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="address-form"
            loading={saving}
            disabled={waitingForAddress || (isEditing && !isDirty)}
          >
            {address ? 'Guardar cambios' : 'Agregar dirección'}
          </Button>
        </>
      }
    >
      {isEditing && fresh.isPending && <LoadingState label="Cargando dirección…" />}
      {isEditing && fresh.error && (
        <ErrorState error={fresh.error} resource="La dirección" onRetry={() => void fresh.refetch()} />
      )}
      {!waitingForAddress && (
        <Form methods={methods} onSubmit={onSubmit} id="address-form" className="grid gap-4">
          <AddressLocationPicker
            value={point}
            onChange={([lat, lng]) => {
              setValue('latitude', lat, { shouldDirty: true, shouldValidate: true });
              setValue('longitude', lng, { shouldDirty: true, shouldValidate: true });
            }}
          />
          {(errors.latitude || errors.longitude) && (
            <p role="alert" className="-mt-2 text-xs text-danger">
              {errors.latitude?.message ?? errors.longitude?.message}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormInput label="Calle y número" required name="street" />
            </div>
            <FormInput label="Ciudad" required name="city" />
            <FormInput label="Código postal" name="postalCode" />
            <FormInput label="Piso" name="floor" />
            <FormInput label="Departamento" name="apartment" />
          </div>

          <FormInput
            label="Dirección formateada"
            hint="Como se le muestra al cliente y al chofer. Opcional."
            name="formattedAddress"
          />

          <FormTextArea
            label="Instrucciones adicionales"
            hint='Por ejemplo: "Portón negro, tocar timbre dos veces".'
            name="additionalInstructions"
          />

          <FormSelect
            label="Precisión de la ubicación"
            hint="El punto se eligió a mano en el mapa: no viene de un geocodificador."
            options={GEOCODE_PRECISION_OPTIONS}
            name="geocodePrecision"
          />

          {/*
          Si ya es la principal no se ofrece desmarcarla acá: la API no
          promueve otra en su lugar cuando se le manda `isDefault: false`
          (sólo lo hace al borrarla), así que quedaría el cliente sin
          ninguna. Para cambiarla, se marca otra como principal.
        */}
          {!(source ?? address)?.isDefault && <FormCheckbox label="Marcar como dirección principal" name="isDefault" />}
        </Form>
      )}
    </Modal>
  );
};

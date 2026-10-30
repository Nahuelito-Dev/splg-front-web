import { useQuery } from '@tanstack/react-query';
import { getPeoplePhotos, PEOPLE_PHOTOS_MAX } from '../api/peoplePhotos';
import type { PersonPhoto } from '../api/types';

/** De quién es la foto: un usuario (cliente, chofer, admin), un legajo o un chofer por su `delivery_id`. */
export type PersonRef = { kind: 'user' | 'employee' | 'delivery'; id: string };

/** Espera para juntar los pedidos de todos los avatares que se dibujan en el mismo render. */
const BATCH_WINDOW_MS = 20;

interface Waiter {
  resolve: (photo: PersonPhoto | null) => void;
  reject: (error: unknown) => void;
}

const pending: Record<PersonRef['kind'], Map<string, Waiter[]>> = {
  user: new Map(),
  employee: new Map(),
  delivery: new Map(),
};
let scheduled = false;

const take = (kind: PersonRef['kind']): [string, Waiter[]][] => {
  const batch = [...pending[kind]].slice(0, PEOPLE_PHOTOS_MAX);
  for (const [id] of batch) pending[kind].delete(id);
  return batch;
};

const flush = async () => {
  scheduled = false;
  while (pending.user.size || pending.employee.size || pending.delivery.size) {
    const users = take('user');
    const employees = take('employee');
    const deliveries = take('delivery');
    try {
      const photos = await getPeoplePhotos({
        userIds: users.map(([id]) => id),
        employeeIds: employees.map(([id]) => id),
        deliveryIds: deliveries.map(([id]) => id),
      });
      for (const [id, waiters] of users) for (const w of waiters) w.resolve(photos.users[id] ?? null);
      for (const [id, waiters] of employees) for (const w of waiters) w.resolve(photos.employees[id] ?? null);
      for (const [id, waiters] of deliveries) for (const w of waiters) w.resolve(photos.deliveries[id] ?? null);
    } catch (error) {
      for (const [, waiters] of [...users, ...employees, ...deliveries]) for (const w of waiters) w.reject(error);
    }
  }
};

/**
 * Junta en un solo `POST /v2/people/photos` todas las fotos pedidas en la misma ventana de tiempo (una pantalla con
 * 40 filas hace una llamada, no 40) y reparte cada resultado a quien lo pidió.
 */
export const loadPersonPhoto = (ref: PersonRef): Promise<PersonPhoto | null> =>
  new Promise((resolve, reject) => {
    const waiters = pending[ref.kind].get(ref.id) ?? [];
    waiters.push({ resolve, reject });
    pending[ref.kind].set(ref.id, waiters);
    if (!scheduled) {
      scheduled = true;
      setTimeout(() => void flush(), BATCH_WINDOW_MS);
    }
  });

/** Cuánto antes de que venza la URL se vuelve a pedir. */
const RENEW_MARGIN_MS = 30_000;
/** Sin foto (o sin permiso) se vuelve a mirar de a ratos, por si la subieron. */
const NO_PHOTO_STALE_MS = 5 * 60_000;
const MIN_REFETCH_MS = 5_000;

export const personPhotoKey = (ref: PersonRef) => ['peoplePhotos', ref.kind, ref.id] as const;
/** Invalidar esta clave refresca todas las fotos de personas que se están mostrando. */
export const PEOPLE_PHOTOS_KEY = ['peoplePhotos'] as const;

/**
 * La foto firmada de una persona, con cache por id. Todas las que se piden juntas viajan en una llamada. La URL no se
 * renueva sola: se vuelve a pedir cuando la imagen falla (`PersonAvatar`) o al volver a montar con la URL por vencer.
 */
export const usePersonPhoto = (ref: PersonRef | null) =>
  useQuery({
    queryKey: ref ? personPhotoKey(ref) : [...PEOPLE_PHOTOS_KEY, 'none'],
    queryFn: () => (ref ? loadPersonPhoto(ref) : Promise.resolve(null)),
    enabled: ref !== null,
    staleTime: (query) => {
      const expires = query.state.data?.expiresAt;
      if (!expires) return NO_PHOTO_STALE_MS;
      return Math.max(new Date(expires).getTime() - Date.now() - RENEW_MARGIN_MS, MIN_REFETCH_MS);
    },
  });

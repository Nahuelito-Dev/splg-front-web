import { useCallback, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPhotoLink, removePhoto, uploadPhoto, type PhotoKind } from '../api/photos';
import { PEOPLE_PHOTOS_KEY } from './peoplePhotos';
import { queryKeys } from './queryKeys';

/** Clave del enlace a la foto de los recursos cuya respuesta no trae `photoUrl`. */
function photoLinkKey(kind: PhotoKind, id?: string): readonly string[] {
  return id ? ['photoLink', kind, id] : ['photoLink', kind];
}

/**
 * El enlace firmado a la foto de un recurso cuya respuesta no trae `photoUrl` (proveedor, envase, carga: la foto es
 * de la v2 y su ficha, de la v1). Dura menos que la URL firmada; si igual vence, `useRenewablePhoto` la renueva.
 */
export const usePhotoLink = (kind: PhotoKind, id: string) =>
  useQuery({
    queryKey: photoLinkKey(kind, id),
    queryFn: () => getPhotoLink(kind, id),
    staleTime: 4 * 60_000,
  });

/** Qué listas y fichas muestran la foto de cada recurso: todas se refrescan al subirla, cambiarla o quitarla. */
const AFFECTED: Record<PhotoKind, readonly (readonly string[])[]> = {
  user: [
    queryKeys.users.all,
    queryKeys.customers.all,
    queryKeys.deliveries.all,
    queryKeys.admins.all,
    queryKeys.cars.all,
    queryKeys.employees.all,
    PEOPLE_PHOTOS_KEY,
  ],
  car: [
    queryKeys.cars.all,
    queryKeys.orders.all,
    queryKeys.fleet.all,
    queryKeys.routePlans.all,
    queryKeys.routeSheets.all,
  ],
  gasCylinder: [queryKeys.gasCylinders.all],
  distributor: [queryKeys.distributors.all, queryKeys.platformConsole.all, queryKeys.companyTheme.all],
  incident: [queryKeys.incidents.all],
  claim: [queryKeys.claims.all],
  employee: [queryKeys.employees.all, PEOPLE_PHOTOS_KEY],
  // Sin `photoUrl` en su respuesta: la foto se pide aparte (`usePhotoLink`).
  supplier: [photoLinkKey('supplier')],
  cylinder: [photoLinkKey('cylinder')],
  truckLoad: [photoLinkKey('truckLoad')],
};

const useInvalidatePhoto = (kind: PhotoKind) => {
  const queryClient = useQueryClient();
  return () => Promise.all(AFFECTED[kind].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
};

/** Sube o reemplaza la foto y refresca todo lo que la muestra. */
export const useUploadPhoto = (kind: PhotoKind) => {
  const invalidate = useInvalidatePhoto(kind);
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadPhoto(kind, id, file),
    onSuccess: invalidate,
  });
};

/** Quita la foto y refresca todo lo que la muestra. */
export const useRemovePhoto = (kind: PhotoKind) => {
  const invalidate = useInvalidatePhoto(kind);
  return useMutation({
    mutationFn: (id: string) => removePhoto(kind, id),
    onSuccess: invalidate,
  });
};

interface Renewed {
  /** La URL del back con la que se pidió la renovada: si el back manda otra, esta ya no vale. */
  base: string | null | undefined;
  url: string;
  expiresAt: number | null;
}

type Link = Awaited<ReturnType<typeof getPhotoLink>>;

/** Renovaciones en curso por recurso: la miniatura y la ampliada (o dos tablas) comparten un solo pedido. */
const inflight = new Map<string, Promise<Link>>();
const requestLink = (kind: PhotoKind, id: string): Promise<Link> => {
  const key = `${kind}:${id}`;
  const running = inflight.get(key);
  if (running) return running;
  const request = getPhotoLink(kind, id).finally(() => inflight.delete(key));
  inflight.set(key, request);
  return request;
};

/** Una foto de S3 viene firmada; una URL externa vieja (logo de texto, foto de una incidencia) no. */
export const isSignedPhotoUrl = (url: string | null | undefined): boolean => Boolean(url?.includes('X-Amz-Signature='));

/**
 * La URL que se pinta para una foto. Arranca con la `photoUrl` firmada que mandó el back; como vence en minutos,
 * si el `<img>` falla (o ya pasó su `expiresAt`) se pide una nueva con `GET .../photo?modo=url`, una sola vez por
 * URL. Nunca se arma ni se guarda una URL de S3 en el panel. Cuando el back manda otra `photoUrl` (se subió o se
 * quitó la foto, o se refrescó la lista), lo renovado se descarta solo. Si la renovación dice que ya no hay foto
 * (`none`) o devuelve la misma URL que falló (`failed`: una URL externa muerta), no se insiste.
 */
export const useRenewablePhoto = (kind: PhotoKind, id: string, url: string | null | undefined) => {
  const [renewed, setRenewed] = useState<Renewed | null>(null);
  const [failedFor, setFailedFor] = useState<string | null | undefined>(undefined);
  const [noneFor, setNoneFor] = useState<string | null | undefined>(undefined);
  const [renewing, setRenewing] = useState(false);
  const tried = useRef<string | null | undefined>(undefined);
  const running = useRef(false);

  const current = renewed?.base === url ? renewed : null;
  const src = current ? current.url : (url ?? null);
  const none = url !== undefined && noneFor === url;
  const failed = url !== undefined && failedFor === url;

  const renew = useCallback(async () => {
    running.current = true;
    setRenewing(true);
    const shown = current ? current.url : url;
    try {
      const link = await requestLink(kind, id);
      if (link.url === null) {
        setNoneFor(url);
        return;
      }
      if (link.url === shown) {
        setFailedFor(url);
        return;
      }
      setFailedFor(undefined);
      setRenewed({ base: url, url: link.url, expiresAt: link.expiresAt ? new Date(link.expiresAt).getTime() : null });
    } catch {
      setFailedFor(url);
    } finally {
      running.current = false;
      setRenewing(false);
    }
  }, [kind, id, url, current]);

  /** `<img onError>`: la primera vez se renueva la URL; si vuelve a fallar, la foto no se pudo cargar. */
  const handleError = useCallback(() => {
    if (running.current) return;
    if (tried.current === url) {
      setFailedFor(url);
      return;
    }
    tried.current = url;
    void renew();
  }, [url, renew]);

  /** Antes de ampliar: si la URL renovada ya venció se pide otra. */
  const renewIfExpired = useCallback(() => {
    if (current?.expiresAt && current.expiresAt <= Date.now()) void renew();
  }, [current, renew]);

  /** Reintento manual tras un error. */
  const retry = useCallback(() => {
    tried.current = url;
    setFailedFor(undefined);
    void renew();
  }, [url, renew]);

  return { src: none ? null : src, failed, none, renewing, handleError, renewIfExpired, retry };
};

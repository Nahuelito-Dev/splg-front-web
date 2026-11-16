import { usePermiso } from '../../hooks/usePermiso';
import { usePermissions } from '../../hooks/usePermissions';
import { useModuleGate } from '../../services/queries/modules';

/** Qué puede hacer quien mira en la bandeja de la empresa (catálogo F37, módulo «Mensajes»). */
export interface InboxAccess {
  /** Atiende a los clientes (C3): `mensajes.clientes`. */
  customers: boolean;
  /** Atiende a los choferes (C2) y avisa a varios: `mensajes.choferes`. */
  drivers: boolean;
  /** Horario, respuestas automáticas y guardadas: `mensajes.configurar`. */
  configure: boolean;
  /** Crear un reclamo desde el hilo pide además `reclamos.gestionar`. */
  claims: boolean;
  /** Ve la bandeja (alguno de los dos canales). */
  any: boolean;
}

/**
 * La bandeja es del admin de la empresa (o de la empresa propia) con el módulo `chat`: el administrador general en la plataforma o en modo
 * soporte no la ve (D-C2b: OrixTech no lee los chats de una empresa). Mientras no se saben los permisos no se esconde
 * nada: la API igual responde 403.
 */
export const useInboxAccess = (): InboxAccess => {
  const { mode } = usePermissions();
  // Sin el módulo `chat` habilitado (o mientras no se sabe) no hay bandeja: ni insignia, ni botones, ni consultas.
  const { ready } = useModuleGate('chat');
  const company = (mode === 'company' || mode === 'owned') && ready;
  const customers = usePermiso('mensajes.clientes').allowed && company;
  const drivers = usePermiso('mensajes.choferes').allowed && company;
  const configure = usePermiso('mensajes.configurar').allowed && company;
  const claims = usePermiso('reclamos.gestionar').allowed && company;
  return { customers, drivers, configure, claims, any: customers || drivers };
};

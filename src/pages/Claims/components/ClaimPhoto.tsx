import { EntityPhoto } from '../../../common/components/ui';
import type { Claim } from '../../../services/api/types';

interface Props {
  claim: Claim;
  /** Puede operar la distribuidora activa (sin ella la API no deja subir). */
  canOperate: boolean;
  operateHint?: string;
}

/**
 * Foto del reclamo: la URL firmada viene en `claim.photoUrl` y se renueva sola si vence. Un reclamo resuelto o
 * rechazado no admite foto nueva (409): se reabre antes.
 */
export const ClaimPhoto = ({ claim, canOperate, operateHint }: Props) => {
  const closed = claim.status === 'resolved' || claim.status === 'rejected';
  return (
    <EntityPhoto
      kind="claim"
      id={claim.claim_id}
      url={claim.photoUrl}
      subject="del reclamo"
      canEdit={canOperate}
      blockedReason={closed ? 'El reclamo está cerrado: reabrilo para cambiar la foto.' : operateHint}
    />
  );
};

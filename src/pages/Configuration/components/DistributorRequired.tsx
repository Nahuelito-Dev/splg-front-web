import { Card } from '../../../common/components/ui';

/** El administrador general sin «Ver como» no tiene una distribuidora a la que configurar. */
export const DistributorRequired = () => (
  <Card className="p-6">
    <p className="text-sm text-muted">Elegí una distribuidora con «Ver como» para ver y cambiar esta configuración.</p>
  </Card>
);

import { useState } from 'react';
import { Landmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import { useCustomerAccountOf } from '../../../services/queries/finance';
import { CustomerAccountFormModal } from './CustomerAccountFormModal';

interface Props {
  userId: string;
  name: string;
}

/** En la ficha del cliente: ir a su cuenta corriente en esta distribuidora o habilitársela. */
export const CustomerAccountAction = ({ userId, name }: Props) => {
  const navigate = useNavigate();
  const { canWrite, writeHint } = usePermissions();
  const { data: account, isPending } = useCustomerAccountOf(userId, name);
  const [enabling, setEnabling] = useState(false);

  if (isPending) return null;
  return account ? (
    <Button
      variant="secondary"
      size="sm"
      icon={<Landmark />}
      onClick={() => navigate(`/finance/accounts/${account.accountId}`)}
    >
      Cuenta corriente
    </Button>
  ) : (
    <>
      <Button
        variant="secondary"
        size="sm"
        icon={<Landmark />}
        disabled={!canWrite}
        title={writeHint}
        onClick={() => setEnabling(true)}
      >
        Habilitar cuenta corriente
      </Button>
      <CustomerAccountFormModal
        open={enabling}
        onClose={() => setEnabling(false)}
        account={null}
        customer={{ userId, name }}
      />
    </>
  );
};

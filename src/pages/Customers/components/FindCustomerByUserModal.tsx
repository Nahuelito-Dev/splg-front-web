import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Modal } from '../../../common/components/ui';
import { useFindCustomerByUserId } from '../../../services/queries/customers';
import { notify } from '../../../utils/notifications';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * CU-130: resuelve la ficha de cliente a partir de un ID de usuario, el dato
 * con el que se llega desde un pedido, un reclamo o una calificación.
 */
export const FindCustomerByUserModal = ({ open, onClose }: Props) => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const findByUser = useFindCustomerByUserId();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    findByUser.mutate(userId.trim(), {
      onSuccess: (customer) => {
        onClose();
        setUserId('');
        navigate(`/customers/details/${customer.customer_id}`);
      },
      onError: notify.error,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Buscar cliente por ID de usuario"
      description="Pegá el ID de la cuenta de usuario para ir directo a su ficha de cliente."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="find-customer-by-user" loading={findByUser.isPending}>
            Buscar
          </Button>
        </>
      }
    >
      <form id="find-customer-by-user" onSubmit={handleSubmit} noValidate>
        <Input
          label="ID de usuario"
          placeholder="UUID de la cuenta"
          required
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
      </form>
    </Modal>
  );
};

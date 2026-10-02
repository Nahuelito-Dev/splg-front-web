import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Modal } from '../../../common/components/ui';
import { useFindDeliveryByUserId } from '../../../services/queries/deliveries';
import { notify } from '../../../utils/notifications';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * CU-110: resuelve la ficha de chofer a partir de un ID de usuario, el dato
 * con el que se llega desde un pedido, un reclamo o una calificación.
 */
export const FindDeliveryByUserModal = ({ open, onClose }: Props) => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const findByUser = useFindDeliveryByUserId();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    findByUser.mutate(userId.trim(), {
      onSuccess: (delivery) => {
        onClose();
        setUserId('');
        navigate(`/deliveries/details/${delivery.delivery_id}`);
      },
      onError: notify.error,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Buscar chofer por ID de usuario"
      description="Pegá el ID de la cuenta de usuario para ir directo a su ficha de chofer."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="find-delivery-by-user" loading={findByUser.isPending}>
            Buscar
          </Button>
        </>
      }
    >
      <form id="find-delivery-by-user" onSubmit={handleSubmit} noValidate>
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

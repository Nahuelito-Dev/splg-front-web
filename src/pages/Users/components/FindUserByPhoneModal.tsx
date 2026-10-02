import { useState, type FormEvent } from 'react';
import { Button, Input, Modal } from '../../../common/components/ui';
import { isE164, normalizePhone } from '../../../common/forms/phone';
import { toApiError } from '../../../services/api/errors';
import type { User } from '../../../services/api/types';
import { useFindUserByPhone } from '../../../services/queries/users';

interface Props {
  open: boolean;
  onClose: () => void;
  onFound: (user: User) => void;
}

const FORMAT_ERROR = 'Formato internacional, por ejemplo +5493764000000';

/** GET /users/phone/:phoneNumber: ubicar una cuenta por teléfono exacto (E.164), sin saber el nombre. */
export const FindUserByPhoneModal = ({ open, onClose, onFound }: Props) => {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | undefined>();
  const findUser = useFindUserByPhone();

  const handleClose = () => {
    setPhone('');
    setError(undefined);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const normalized = normalizePhone(phone);
    if (!isE164(normalized)) {
      setError(FORMAT_ERROR);
      return;
    }
    setPhone(normalized);
    setError(undefined);
    try {
      const user = await findUser.mutateAsync(normalized);
      if (!user) {
        setError('Ningún usuario tiene ese teléfono');
        return;
      }
      onFound(user);
      handleClose();
    } catch (failure) {
      const { status } = toApiError(failure);
      setError(status === 400 ? FORMAT_ERROR : 'No se pudo buscar. Probá de nuevo.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Buscar usuario por teléfono"
      description="Formato internacional, por ejemplo +5493764000000."
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" form="find-user-by-phone" loading={findUser.isPending}>
            Buscar
          </Button>
        </>
      }
    >
      <form id="find-user-by-phone" onSubmit={(e) => void handleSubmit(e)} noValidate>
        <Input
          label="Teléfono"
          type="tel"
          placeholder="+5493764000000"
          required
          error={error}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </form>
    </Modal>
  );
};

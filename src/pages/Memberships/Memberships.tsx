import { MembershipsTable } from './components/MembershipsTable';
import { User } from '../../interfaces';
import { AddItemFab } from '../../common/components/AddItemFab';
import { deleteUser } from '../../services/api/users';
import { useCRUDModal } from '../../hooks';
import { useState, useEffect } from 'react';
import { CreateMembershipModal } from './components/CreateMembershipModal';

export const Memberships = () => {
  const [user, setUser] = useState<User>();
  const [open, setOpen] = useState(false);

  const { deleteMutation } = useCRUDModal({
    deleteFn: deleteUser,
    queryKey: 'user',
  });

  const handleCellClick = (event: any) => {
    const { row, field } = event;
    switch (field) {
      case 'delete':
        deleteMutation.mutate(row);
        break;
      case 'edit':
        setUser(row);
        break;

      default:
        // Show details
        // setUser(row)
        break;
    }
  };

 /* const handleAddUser = () => {
    setOpen(true);
  };*/

  const setModalOpen = () => {
    setOpen(true);
    setUser(undefined);
  };

  const handleOpen = () => {
    console.log('Botón para abrir el modal clickeado');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  useEffect(() => {
    if (user) setOpen(true);
  }, [user]);

  return (
    <>
      <MembershipsTable user={user} setUser={handleCellClick} />
      {/* Abrir modal solo si 'open' es verdadero */}
      {open && (
        <CreateMembershipModal
          user={user}
          open={open}
          setOpen={setModalOpen}
          closeEvent={handleClose}
        />
      )}
      <AddItemFab onClick={handleOpen} />
    </>
  );
};

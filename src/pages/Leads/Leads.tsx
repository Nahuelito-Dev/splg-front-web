import { LeadsTable } from './components/LeadsTable';

import { Lead } from '../../interfaces';
import { AddItemFab } from '../../common/components/AddItemFab';
import { deleteUser } from '../../services/api/users';
import { useCRUDModal } from '../../hooks';
import { useState, useEffect } from 'react';

export const Leads = () => {
  const [lead, setLead] = useState<Lead>();
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
        setLead(row);
        break;

      default:
        // Show details
        // setUser(row)
        break;
    }
  };

  /*const handleAddUser = () => {
    setUser(undefined);
    setOpen(true);
  };

  const setModalOpen = () => {
    setOpen(false);
    setUser(undefined);
  };*/

  useEffect(() => {
    if (lead) setOpen(true);
  }, [lead]);

  return (
    <>
      <LeadsTable lead={lead} setLead={handleCellClick} />
      {/*{open && <UserModal user={user} open={open} setOpen={setModalOpen} />}
      {/* <AddItemFab onClickFn={handleAddUser} /> */}
    </>
  );
};

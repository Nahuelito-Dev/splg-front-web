import { UserTable } from "./components/UserTable";

import { User } from "../../interfaces";
import { UserModal } from "./components/UserModal";
import { AddItemFab } from "../../common/components/AddItemFab";
import { deleteUser } from "../../services/api/users";
import { useCRUDModal } from "../../hooks";
import { useState, useEffect } from "react";

export const Users = () => {
  const [user, setUser] = useState<User>();
  const [open, setOpen] = useState(false);
  const { deleteMutation } = useCRUDModal({
    deleteFn: deleteUser,
    queryKey: "user",
  });

  const handleCellClick = (event: any) => {
    const { row, field } = event;
    switch (field) {
      case "delete":
        deleteMutation.mutate(row);
        break;
      case "edit":
        setUser(row);
        break;

      default:
        // Show details
        // setUser(row)
        break;
    }
  };

  const handleAddUser = () => {
    setUser(undefined);
    setOpen(true);
  };

  const setModalOpen = () => {
    setOpen(false);
    setUser(undefined);
  };

  useEffect(() => {
    if (user) setOpen(true);
  }, [user]);

  return (
    <>
      <UserTable user={user} setUser={handleCellClick} />
      {open && <UserModal user={user} open={open} setOpen={setModalOpen} />}
      {/* <AddItemFab onClickFn={handleAddUser} /> */}
    </>
  );
};

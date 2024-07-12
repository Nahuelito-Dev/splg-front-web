import { useState } from 'react';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import {
  Typography,
  Stack,
  TextField,
  Box,
  Button,
  Select,
  InputLabel,
  MenuItem,
  InputAdornment,
  IconButton,
  Autocomplete,
} from '@mui/material';
import { useForm, useCRUDModal } from '../../../hooks';
import { CustomModal } from '../../../common/components';
import { User } from '../../../interfaces';
import { createUser, updateUser } from '../../../services/api';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';

interface Props {
  user?: User;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  closeEvent: () => void;
}

const initialForm = {
  email: '',
  full_name: '',
  role: 'admin',
  password: '',
};

export const CreateMembershipModal = ({
  user,
  open,
  setOpen,
  closeEvent,
}: Props) => {
  const { email, full_name, role, password, onInputChange }: any = useForm(
    user ?? initialForm
  );

  const [showPassword, setShowPassword] = useState(false);

  const { createMutation, updateMutation } = useCRUDModal({
    createFn: createUser,
    updateFn: updateUser,
    queryKey: 'user',
  });

  // This could be integrated into the useCrudModal hook as well as the useForm, but maybe it shouldn't. Its up to you bread.
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      createMutation.mutate({ email, full_name, role, password });
    } else {
      const updatedUser: any = { ...user, role };
      updateMutation.mutate(updatedUser);
    }
    setOpen(false);
  };
  return (
    <CustomModal
      open={open}
      closingFn={() => setOpen(false)}
      sx={{ overflowY: 'auto' }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          paddingRight: '8px',
        }}
      >
        <Typography variant='h4'>
          {user ? 'Edit' : 'Create'} Memberships
        </Typography>
        <IconButton
          aria-label='close'
          onClick={closeEvent}
          title='Close'
          sx={{
            backgroundColor: '#EB6123 !important',
            color: '#FFF',
            borderRadius: '50%',
            padding: '8px',
            '&:hover': {
              backgroundColor: '#D45216 !important',
            },
          }}
        >
          <CloseOutlinedIcon />
        </IconButton>
      </Box>

      <Stack spacing={2} direction='column' sx={{ padding: { sm: '1rem' } }}>
        <Stack spacing={2} component={'form'} onSubmit={(e) => handleSubmit(e)}>
          <Box>
            <Typography variant='body1'>Name:</Typography>
            {!user ? (
              <TextField
                placeholder='JhonDoe@email.com'
                type='text'
                name='email'
                value={email}
                onChange={onInputChange}
                fullWidth
              />
            ) : (
              <Typography variant='h6'>{user.email}</Typography>
            )}
          </Box>
          <Button fullWidth type='submit' variant='contained' color='secondary'>
            Submit
          </Button>
        </Stack>
      </Stack>
    </CustomModal>
  );
};

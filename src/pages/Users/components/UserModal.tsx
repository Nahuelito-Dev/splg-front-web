import { useState } from 'react'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import { Typography, Stack, TextField, Box, Button, Select, InputLabel, MenuItem, InputAdornment, IconButton, Autocomplete } from '@mui/material';
import { useForm, useCRUDModal } from '../../../hooks'
import { CustomModal } from '../../../common/components'
import { User } from '../../../interfaces'
import { createUser, updateUser } from '../../../services/api';

interface Props {
    user?: User
    open: boolean
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const initialForm = {
    email: '',
    full_name: '',
    role: 'admin',
    password: '',
}

export const UserModal = ({ user, open, setOpen }: Props) => {
    const { email, full_name, role, password, onInputChange }: any = useForm(user ?? initialForm)

    const [showPassword, setShowPassword] = useState(false);

    const { createMutation, updateMutation } = useCRUDModal({ createFn: createUser, updateFn: updateUser, queryKey: 'user' })

    // This could be integrated into the useCrudModal hook as well as the useForm, but maybe it shouldn't. Its up to you bread.
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!user) {
            createMutation.mutate({ email, full_name, role, password })
        } else {
            const updatedUser: any = { ...user, role }
            updateMutation.mutate(updatedUser)
        }
        setOpen(false)
    }
    return (
        <CustomModal openModal={open} setOpenModal={() => setOpen(false)} sx={{ overflowY: 'auto' }}>
            <Typography variant="h4">{user ? "Edit" : "Create"} user</Typography>
            <Stack spacing={2} direction="column" sx={{ padding: { sm: "1rem" } }}>
                <Stack spacing={2} component={'form'} onSubmit={(e) => handleSubmit(e)}>
                    <Box>
                        <Typography variant='body1'>Email:</Typography>
                        {!user ?
                            <TextField
                                placeholder="JhonDoe@email.com"
                                type='text'
                                name='email'
                                value={email}
                                onChange={onInputChange}
                                fullWidth
                            />
                            :
                            <Typography variant='h6'>{user.email}</Typography>
                        }

                    </Box>
                    <Box>
                        <Typography variant='body1'>Full name:</Typography>
                        {!user ?
                            <TextField
                                type='text'
                                fullWidth
                                required
                                placeholder='Jhon Doe'
                                name='full_name'
                                value={full_name}
                                onChange={onInputChange}
                            />
                            : <Typography variant='h6'>{user.full_name}</Typography>
                        }
                    </Box>

                    <Box>
                        <InputLabel>Role:</InputLabel>
                        <Select
                            fullWidth
                            required
                            name='role'
                            value={role}
                            onChange={({ target }) => onInputChange({ target: { name: 'role', value: target.value } })}
                            MenuProps={{ sx: { zIndex: 2500 } }}
                        >
                            <MenuItem value={'admin'}>Admin</MenuItem>
                            <MenuItem value={'accountant'}>Accountant</MenuItem>
                            <MenuItem value={'superAdmin'}>Super-Admin</MenuItem>
                        </Select>
                    </Box>


                    {!user &&
                        <Box>
                            <Typography variant='body1'>Password:</Typography>
                            <TextField
                                type={showPassword ? "text" : "password"}
                                fullWidth
                                required
                                autoComplete='off'
                                name='password'
                                value={password}
                                onChange={onInputChange}
                                inputProps={{ "minlength": 6 }}
                                InputProps={{
                                    autoComplete: 'off',
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label="toggle password visibility"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? <Visibility /> : <VisibilityOff />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />
                        </Box>
                    }
                    <Button fullWidth type='submit' variant='contained' color='secondary'>Submit</Button>
                </Stack>
            </Stack>
        </CustomModal>
    )
}

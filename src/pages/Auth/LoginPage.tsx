import { useMemo, useState } from 'react';

import { Navigate } from "react-router-dom";

import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import {
    Avatar,
    Button,
    IconButton,
    InputAdornment,
    Stack,
    TextField,
    Typography,
} from "@mui/material";

import pallette from '../../theme/pallete';

import { AuthLayout } from '../../common/layout';
import { useAppDispatch, useAppSelector, useForm } from '../../hooks';
import { startLoginWithEmailAndPassword } from "../../store/auth/thunks";

const formData = {
    email: '',
    password: ''
}

export const LoginPage = () => {
    const dispatch = useAppDispatch();
    const { status } = useAppSelector((state) => state.auth);
    const { formState, onInputChange } = useForm(formData);
    const isAuthenticating = useMemo(() => status === "checking", [status]);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e: any) => {
        e.preventDefault()
        dispatch(startLoginWithEmailAndPassword(formState))
    }

    if (status === "authenticated") return <Navigate to="/home" />

    return (
      <AuthLayout>
        <Stack
          gap={2}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
          }}
        >
          <TextField
            sx={{ width: '100%' }}
            value={formState.email}
            onChange={onInputChange}
            id="email"
            type="email"
            name="email"
            variant="standard"
            InputProps={{
              placeholder: 'email@example.com',
              sx: { color: '#FFF !important' },
            }}
          />
          <TextField
            sx={{ width: '100%', color: '#FFF !important' }}
            name="password"
            value={formState.password}
            onChange={onInputChange}
            type={showPassword ? 'text' : 'password'}
            variant="standard"
            InputProps={{
              sx: { color: '#FFF !important' },
              placeholder: 'Min. 8 caracteres',
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityIcon /> : <VisibilityOffIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            disabled={isAuthenticating}
            onClick={handleSubmit}
            sx={{
              borderRadius: '12px',
              width: '50%',
              marginTop: '20px',
              backgroundColor: pallette.secondary.light + '!important',
              '&:hover': {
                backgroundColor: pallette.secondary.lighter + '!important',
              },
            }}
          >
            LOGIN
          </Button>
        </Stack>
      </AuthLayout>
    );
};
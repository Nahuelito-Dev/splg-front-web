import { Dispatch } from 'redux';

import { checkingCredentials, finishCheckingCredentials, login, logOut } from "./authSlice"

import { ICredentials, loginWithEmailAndPassword, logOutFirebase } from "../../firebase/providers"

import { checkToken, getAdmin } from '../../services/api/auth';

import Swal from 'sweetalert2';
// import { getNewAdmin } from "../../services/api/admin"
// import Swal from "sweetalert2"
// interface ICreateUsers extends ICredentials {
//     displayName: string
// }

export const checkingAuthentication = () => {
    return async (dispatch: Dispatch) => {
        dispatch(checkingCredentials())
    }
}

export const checkIfTokenExpired = () => {
    return async () => {
        if (!localStorage.getItem('token')) startLogOut()
        checkingAuthentication()
        const response = await checkToken()
        if (response === 500 || response === 403) return startLogOut()
        if (response !== 201) {
            localStorage.clear()
            startLogOut()
        }
    }
}


// export const startCreatingUserWithEmailPassword = ({ email, password, displayName }: ICreateUsers) => {
//     return async (dispatch: Dispatch) => {
//         try {
//             // await getNewAdmin(email, displayName, password)
//             Swal.fire('Admin creado', 'Se creo exitosamente el nuevo admin', 'success')
//         } catch (error) {
//             Swal.fire('Ocurrio un error', 'El email ya se encuentra en uso', 'error')
//         }
//     }
// }

export const startLoginWithEmailAndPassword = ({ email, password }: ICredentials) => {
    return async (dispatch: Dispatch) => {
        dispatch(checkingCredentials());
        console.log("checking credentials");
        
        const { ok, uid, photoURL, displayName, token, errorMessage } = await loginWithEmailAndPassword({ email, password });
        
        if (!ok) {
            dispatch(finishCheckingCredentials());
            Swal.fire('Error al iniciar sesión', errorMessage || 'Credenciales incorrectas', 'error');
            dispatch(logOut({ errorMessage: errorMessage || 'Credenciales incorrectas' }));
            return;
        }

        try {
            const { fullName, role, blocked } = await getAdmin(email);
            
            if (blocked) {
                localStorage.clear();
                dispatch(finishCheckingCredentials());
                Swal.fire('Cuenta Bloqueada', 'Tu cuenta ha sido bloqueada. Contactá al administrador.', 'error');
                dispatch(logOut({ errorMessage: 'Cuenta bloqueada' }));
                return;
            }

            if (!role) {
                localStorage.clear();
                dispatch(finishCheckingCredentials());
                Swal.fire('Acceso Denegado', 'El usuario no tiene rol de administrador', 'error');
                dispatch(logOut({ errorMessage: 'User not found' }));
            } else {
                const expirationDate = new Date();
                expirationDate.setTime(expirationDate.getTime() + 60 * 60 * 1000);
                localStorage.setItem('token', token!);
                localStorage.setItem('expireTimestamp', JSON.stringify(expirationDate.getTime()));
                dispatch(finishCheckingCredentials());
                dispatch(login({ fullName, uid, displayName, photoURL, email, role }));
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message || 'Error validando permisos en el servidor';
            localStorage.clear();
            dispatch(finishCheckingCredentials());
            Swal.fire('Acceso Denegado', msg, 'error');
            dispatch(logOut({ errorMessage: msg }));
        }
    }
}

export const startLogOut = () => {
    return async (dispatch: Dispatch) => {
        await logOutFirebase()
        dispatch(logOut({}))
    }
}
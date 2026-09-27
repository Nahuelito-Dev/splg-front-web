import type { Dispatch } from 'redux';
import { checkingCredentials, finishCheckingCredentials, login, logOut, type LoginPayload } from './authSlice';
import { getAdmin } from '../../services/api/auth';
import { errorMessage } from '../../services/api/errors';
import { loginWithEmailAndPassword, logOutFirebase, type ICredentials } from '../../firebase/providers';
import { notify } from '../../utils/notifications';

export const startLoginWithEmailAndPassword = ({ email, password }: ICredentials) => {
  return async (dispatch: Dispatch) => {
    dispatch(checkingCredentials());

    const result = await loginWithEmailAndPassword({ email, password });

    if (!result.ok) {
      dispatch(finishCheckingCredentials());
      notify.error(result.errorMessage);
      dispatch(logOut({ errorMessage: result.errorMessage }));
      return;
    }

    // El token va a localStorage ANTES de preguntar por el admin: ese
    // endpoint dejó de ser público y http lo lee de ahí. Si la validación
    // falla, el catch limpia todo.
    localStorage.setItem('token', result.token);

    try {
      const { fullName, role, blocked } = await getAdmin(email);

      if (blocked) {
        localStorage.clear();
        dispatch(finishCheckingCredentials());
        const message = 'Tu cuenta ha sido bloqueada. Contactá al administrador.';
        notify.error(message);
        dispatch(logOut({ errorMessage: message }));
        return;
      }

      const expirationDate = new Date();
      expirationDate.setTime(expirationDate.getTime() + 60 * 60 * 1000);
      localStorage.setItem('expireTimestamp', JSON.stringify(expirationDate.getTime()));
      dispatch(finishCheckingCredentials());

      const payload: LoginPayload = {
        uid: result.uid,
        email,
        displayName: result.displayName,
        photoUrl: result.photoURL,
        fullName,
        role,
      };
      dispatch(login(payload));
    } catch (error) {
      const message = errorMessage(error);
      localStorage.clear();
      dispatch(finishCheckingCredentials());
      notify.error(message);
      dispatch(logOut({ errorMessage: message }));
    }
  };
};

export const startLogOut = () => {
  return async (dispatch: Dispatch) => {
    await logOutFirebase();
    dispatch(logOut({}));
  };
};

import type { Dispatch } from 'redux';
import { checkingCredentials, finishCheckingCredentials, login, logOut, type LoginPayload } from './authSlice';
import { activeDistributor } from '../../services/api/activeDistributor';
import { getAdmin } from '../../services/api/auth';
import { errorMessage } from '../../services/api/errors';
import { loginWithEmailAndPassword, logOutFirebase, type ICredentials } from '../../firebase/providers';
import { notify } from '../../utils/notifications';

export const startLoginWithEmailAndPassword = ({ email, password }: ICredentials) => {
  return async (dispatch: Dispatch) => {
    dispatch(checkingCredentials());

    // Una distribuidora elegida en la sesión anterior (o de una que ya no existe) no debe
    // seguir viajando en X-Distributor: la elige de nuevo quien entre, si la necesita.
    activeDistributor.set(null);

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
    // Cierre voluntario: sin token guardado, `useCheckAuth` no lo toma por una sesión vencida.
    localStorage.removeItem('token');
    await logOutFirebase();
    dispatch(logOut({}));
  };
};

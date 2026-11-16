import type { Dispatch } from 'redux';
import { checkingCredentials, finishCheckingCredentials, login, logOut, type LoginPayload } from './authSlice';
import { getAdmin } from '../../services/api/auth';
import { errorMessage } from '../../services/api/errors';
import { loginWithEmailAndPassword, logOutFirebase, type ICredentials } from '../../firebase/providers';
import { notify } from '../../utils/notifications';
import { ownedCompany } from '../../services/api/ownedCompany';

export const startLoginWithEmailAndPassword = ({ email, password }: ICredentials) => {
  return async (dispatch: Dispatch) => {
    dispatch(checkingCredentials());

    const result = await loginWithEmailAndPassword({ email, password });

    if (!result.ok) {
      ownedCompany.syncIdentity(null);
      dispatch(finishCheckingCredentials());
      notify.error(result.errorMessage);
      dispatch(logOut({ errorMessage: result.errorMessage }));
      return;
    }

    // El token va a localStorage ANTES de preguntar por el admin: ese
    // endpoint dejó de ser público y http lo lee de ahí. Si la validación
    // falla, el catch limpia todo.
    localStorage.setItem('token', result.token);
    // Lo elegido por otra cuenta en este navegador no se hereda: se borra antes de la primera request de esta.
    ownedCompany.syncIdentity(result.uid);

    try {
      const { fullName, role, blocked } = await getAdmin(email);

      if (blocked) {
        localStorage.clear();
        ownedCompany.syncIdentity(null);
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
      ownedCompany.syncIdentity(null);
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
    ownedCompany.syncIdentity(null);
    await logOutFirebase();
    dispatch(logOut({}));
  };
};

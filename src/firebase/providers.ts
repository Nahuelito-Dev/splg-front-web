import { FirebaseError } from 'firebase/app';
import { EmailAuthProvider, reauthenticateWithCredential, signInWithEmailAndPassword } from 'firebase/auth';
import { FirebaseAuth } from './config';

export interface ICredentials {
  email: string;
  password: string;
}

interface LoginOk {
  ok: true;
  displayName: string | null;
  email: string;
  photoURL: string | null;
  uid: string;
  /** ID token de Firebase: lo que el interceptor de la API manda como Bearer. */
  token: string;
}

interface LoginError {
  ok: false;
  errorMessage: string;
}

/** El texto en castellano de un error de Firebase al entrar; nunca el mensaje técnico del SDK. */
export const loginErrorMessage = (code: string | undefined): string => {
  switch (code) {
    case 'auth/invalid-login-credentials':
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'El email o la contraseña no son correctos.';
    case 'auth/user-disabled':
      return 'Esta cuenta está desactivada. Hablá con quien administra el panel.';
    case 'auth/too-many-requests':
      return 'Hubo demasiados intentos. Esperá unos minutos y probá de nuevo.';
    case 'auth/network-request-failed':
      return 'No hay conexión. Revisá internet y probá de nuevo.';
    default:
      return 'No se pudo iniciar sesión. Probá de nuevo en un rato.';
  }
};

/** Entra con Firebase Auth. El token sale de la API pública `getIdToken`, no de campos internos del SDK. */
export const loginWithEmailAndPassword = async ({ email, password }: ICredentials): Promise<LoginOk | LoginError> => {
  try {
    const { user } = await signInWithEmailAndPassword(FirebaseAuth, email, password);
    const token = await user.getIdToken();
    const { displayName, photoURL, uid } = user;
    return { ok: true, displayName, email, photoURL, uid, token };
  } catch (error) {
    return { ok: false, errorMessage: loginErrorMessage(error instanceof FirebaseError ? error.code : undefined) };
  }
};

export const logOutFirebase = async (): Promise<void> => {
  await FirebaseAuth.signOut();
};

/** ID token vigente de la sesión (`force` lo renueva contra Firebase). Null si no hay sesión. */
export const getCurrentIdToken = async (force = false): Promise<string | null> => {
  const user = FirebaseAuth.currentUser;
  return user ? user.getIdToken(force) : null;
};

/** Vuelve a validar la contraseña actual para refrescar la sesión. Devuelve el mensaje de error o null si salió bien. */
export const reauthenticateWithPassword = async (password: string): Promise<string | null> => {
  const user = FirebaseAuth.currentUser;
  if (!user?.email) return 'No hay una sesión activa';
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    return null;
  } catch (error) {
    if (error instanceof FirebaseError && ['auth/wrong-password', 'auth/invalid-credential'].includes(error.code)) {
      return 'La contraseña actual no es correcta';
    }
    return 'No se pudo verificar tu contraseña';
  }
};

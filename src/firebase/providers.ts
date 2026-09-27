import { FirebaseError } from 'firebase/app';
import { signInWithEmailAndPassword } from 'firebase/auth';
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

/** Entra con Firebase Auth. El token sale de la API pública `getIdToken`, no de campos internos del SDK. */
export const loginWithEmailAndPassword = async ({ email, password }: ICredentials): Promise<LoginOk | LoginError> => {
  try {
    const { user } = await signInWithEmailAndPassword(FirebaseAuth, email, password);
    const token = await user.getIdToken();
    const { displayName, photoURL, uid } = user;
    return { ok: true, displayName, email, photoURL, uid, token };
  } catch (error) {
    const errorMessage = error instanceof FirebaseError ? error.message : 'No se pudo iniciar sesión';
    return { ok: false, errorMessage };
  }
};

export const logOutFirebase = async (): Promise<void> => {
  await FirebaseAuth.signOut();
};

// services/api/axiosConfig.ts
import axios, { InternalAxiosRequestConfig } from 'axios';
import { logOut } from '../../store/auth';
import { startLogOut } from '../../store/auth/thunks';
import { store } from '../../store/store';

export enum RequestSource {
  ADMIN_PANEL = 'panel-app',
}

const baseURL = import.meta.env.VITE_APP_API_URL;

const instancesData = {
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Source': RequestSource.ADMIN_PANEL,
  },
};

export const privateAxiosInstance = axios.create(instancesData);
export const publicAxiosInstance = axios.create(instancesData);

privateAxiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');

    if (!token) {
      // Rechazamos la promesa si no hay token, sin loguear nada
      return Promise.reject(new Error('No authentication token found'));
    } else {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
      config.headers['X-Client-Source'] = RequestSource.ADMIN_PANEL;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

privateAxiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('expireTimestamp');
      store.dispatch(logOut({}));
    }

    if (error.response?.status === 500) {
      const responseData = error.response.data;
      if (
        responseData &&
        (responseData.code === 'auth/id-token-expired' ||
          responseData.code === 'auth/argument-error')
      ) {
        localStorage.removeItem('token');
        localStorage.removeItem('expireTimestamp');
        store.dispatch(startLogOut());
      }
    }
    return Promise.reject(error);
  },
);

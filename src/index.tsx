import './observability/instrument';
import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from './App';

import { Provider } from 'react-redux';
import { store } from './store/store';
import './styles/index.css';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { installNewVersionReload } from './utils/newVersionReload';
import { ReportingBoundary } from './observability/ReportingBoundary';
import { wrapBrowserRouter } from './observability/sentry';

const safeStorage = (): Storage | null => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

installNewVersionReload({
  target: window,
  storage: safeStorage(),
  reload: () => window.location.reload(),
  now: () => Date.now(),
});

/** Router de datos (hace falta para `useBlocker`); todas las rutas siguen declaradas en `router/Navigation`. */
const router = wrapBrowserRouter(createBrowserRouter)([
  {
    path: '*',
    element: (
      <ReportingBoundary>
        <Provider store={store}>
          <App />
        </Provider>
      </ReportingBoundary>
    ),
  },
]);

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);

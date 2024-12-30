# Deploying the Frontend to Firebase Hosting

Follow these detailed steps to deploy your frontend to Firebase Hosting.

## Step 1: Install Firebase CLI
If you haven't already, install the Firebase CLI by running:

```bash
npm install -g firebase-tools
```

## Step 2: Log in to Firebase
To authenticate your Firebase account, run the following command and follow the instructions:

```bash
firebase login
```
This will prompt you to sign in with your Google account.



## Step 3: Initialize Firebase
Navigate to your project directory and run the Firebase initialization command:

```bash
firebase init hosting
```
During initialization:

* Select the Firebase project you'd like to use (the project where you want to deploy your frontend).
* Choose the public directory (set this to the folder where your built assets are, typically dist/ for Vite/React projects).
* Configure as a single-page app (this is typically Yes, so all routes are redirected to index.html).
* Choose not to set up GitHub deployment if you don't need it.

## Step 4: Build the Frontend

If you haven't already, run the following command to build your frontend for production:

```bash
npm run build
```
This will generate the dist/ folder with the optimized production build of your app.

## Step 5: Deploy to Firebase

Now, deploy the build files to Firebase Hosting by running:

```bash
firebase deploy --only hosting
```
Firebase will upload the files from your dist/ folder and deploy them to your chosen project.



## Step 6: Check the Deployment

Once the deployment is complete, Firebase will provide you with a hosting URL. The URL will look like this:

[https://gearth-admin.web.app](https://gearth-admin.web.app)



Summary of Steps:
* Install Firebase CLI: npm install -g firebase-tools
* Log in to Firebase: firebase login
* Initialize Firebase Hosting: firebase init hosting
* Build your frontend: npm run build
* Deploy to Firebase Hosting: firebase deploy --only 
* hosting
Visit your hosted app: https://gearth-admin.web.app


# Guía de Configuración para Ejecutar una App React con Vite en Local

Esta guía te enseñará cómo levantar tu proyecto React creado con Vite en tu entorno local.

## Paso 1: Clonar el Repositorio

Si aún no has clonado el repositorio de la aplicación, puedes hacerlo con el siguiente comando:

```bash
git clone https://github.com/Nahuelito97/gearth-admin.git
```
## Paso 2: Instalar Dependencias

Después de clonar el repositorio, navega al directorio del proyecto y ejecuta el siguiente comando para instalar todas las dependencias necesarias:

```bash
npm install
```

Esto instalará todas las dependencias listadas en el archivo package.json del proyecto.


## Paso 3: Verificar la Configuración de Vite

Asegúrate de que tu proyecto esté configurado para usar Vite correctamente. En el archivo package.json, debe haber un script de dev como el siguiente:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "serve": "vite preview"
  }
}
```

Este script te permitirá ejecutar el servidor de desarrollo local con Vite.


## Paso 4: Iniciar el Servidor de Desarrollo

Para iniciar la aplicación en tu máquina local, ejecuta el siguiente comando:

```bash
npm run dev
```

Esto iniciará el servidor de desarrollo local y podrás ver tu aplicación en el navegador accediendo a la siguiente URL:

```bash
http://localhost:3000
```

Asegúrate de que no haya ningún proceso ejecutándose en el puerto 3000 antes de ejecutar este comando. Si el puerto 3000 está ocupado, Vite seleccionará otro puerto disponible automáticamente.


## Paso 5: Verificar la Aplicación en Localhost
Una vez que hayas ejecutado el comando, abre tu navegador y visita:

```bash
http://localhost:3000
```

Deberías ver tu aplicación ejecutándose correctamente en tu entorno local.

Resumen de los Pasos
* Clonar el repositorio: git clone <URL_DEL_REPOSITORIO>
* Instalar las dependencias: npm install
* Verificar el script de dev en package.json
* Levantar el servidor de desarrollo: npm run dev
* Verificar la aplicación en localhost: http://localhost:3000



## Variables de Entorno

Para configurar variables de entorno en tu proyecto Vite, puedes crear un archivo .env en la raíz del proyecto y definir tus variables allí. Por ejemplo:

```bash
#Devdloop
#VITE_SERVER_BASE_URL=http://localhost:3000/api/

#Prod
VITE_SERVER_BASE_URL=https://testers-android-app-hygww.ondigitalocean.app/api/
```


## Dpcumentación del Backend

Para obtener más información sobre cómo configurar y ejecutar el backend de la aplicación, consulta la documentación en el siguiente enlace:

[https://testers-android-app-hygww.ondigitalocean.app/docs](https://testers-android-app-hygww.ondigitalocean.app/docs)

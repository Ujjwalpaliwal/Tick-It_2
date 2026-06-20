# Deployment Guide — Tick-It OS

This guide walks you through setting up environment variables, compiling an APK for early release testing, and deploying the Express/Node.js backend to Render.

---

## 1. Environment Variables Setup Sequence

To ensure the frontend and backend communicate correctly, follow this exact sequence:

### Step A: Deploy/Obtain Backend URL first
You cannot configure the frontend's environment variable until you know where the backend is hosted. Therefore, deploy your database and backend server first (see Section 3) to obtain the public API URL (e.g., `https://tick-it-server.onrender.com`).

### Step B: Configure Backend (`server/.env`)
Create/edit `server/.env` with:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.oqswaez.mongodb.net/tickit?retryWrites=true&w=majority
NODE_ENV=production
```

### Step C: Configure Frontend (`my-app/.env`)
Create/edit `my-app/.env` with your backend URL. Expo variables must be prefixed with `EXPO_PUBLIC_` to be loaded into the client bundle at build time:
```env
EXPO_PUBLIC_API_URL=https://your-backend-domain.onrender.com/api
```
> [!NOTE]
> During local development, if `EXPO_PUBLIC_API_URL` is left blank, the app dynamically detects your local machine's IP address (e.g. `http://192.168.x.x:5000/api`) so you do not need to hardcode it. But for compiling an APK, it **must** be set to the production backend URL before starting the build.

---

## 2. Generating an APK for Early Release Testing

To share the app with testers without publishing to the Google Play Store or EAS app channels, you need to compile an **APK** (Android Package) instead of an **AAB** (Android App Bundle).

Here are the two ways to build your APK:

### Method A: EAS Build (Recommended, Cloud-based)

This compiles the app on Expo's servers, meaning you don't need Android Studio or SDKs configured locally.

1. **Install EAS CLI globally** (if not already installed):
   ```bash
   npm install -g eas-cli
   ```
2. **Log in to your Expo account**:
   ```bash
   eas login
   ```
3. **Configure the `preview` profile in `my-app/eas.json`**:
   Ensure `my-app/eas.json` has `buildType` set to `apk` under the `preview` profile:
   ```json
   {
     "cli": {
       "version": ">= 19.0.8"
     },
     "build": {
       "development": {
         "developmentClient": true,
         "distribution": "internal"
       },
       "preview": {
         "distribution": "internal",
         "android": {
           "buildType": "apk"
         }
       },
       "production": {}
     }
   }
   ```
4. **Trigger the APK build**:
   Run the following command inside the `my-app` directory:
   ```bash
   eas build -p android --profile preview
   ```
5. **Install on device**:
   Once the build completes on the Expo dashboard, it will print a terminal QR code. Scan it with an Android device to download and install the `.apk` file directly!

---

### Method B: Local APK Build (Offline, commands run on your machine)

This compiles the app locally on your machine using Gradle. It requires JDK 17+ and the Android SDK to be installed and configured in your environment variables.

1. **Generate the native Android folder**:
   In the `my-app` directory, run:
   ```bash
   npx expo prebuild --platform android
   ```
2. **Build the release APK**:
   Navigate to the `android` folder and compile using Gradle wrapper:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
3. **Retrieve the APK**:
   The output APK will be generated at:
   `my-app/android/app/build/outputs/apk/release/app-release.apk`
   Copy this file directly onto your Android device to install and test!

---

## 3. Deploying the Backend on Render

Render is a developer-friendly platform for hosting Express servers.

### Step 1: Set up MongoDB Atlas
1. Create a free shared cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Go to **Database Access** and create a user with read/write permissions.
3. Go to **Network Access** and add IP address `0.0.0.0/0` (allowing access from anywhere, which is required since Render web services use dynamic IP ranges).
4. Go to **Database** -> **Connect** -> **Drivers** and copy the Connection String (`mongodb+srv://...`).

### Step 2: Push your code to GitHub
Make sure your root folder or `server` subfolder is pushed to a Git repository.

### Step 3: Create a Web Service on Render
1. Log in to [Render](https://render.com) and click **New** -> **Web Service**.
2. Connect your Git repository.
3. If your repository contains both folders, configure the following:
   - **Name**: `tick-it-backend`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js` (or `npm start`)
4. Under **Instance Type**, select the **Free** tier.

### Step 4: Configure Env Variables in Render
Under the **Environment** tab, add the following variables:
- `MONGO_URI`: *[Your MongoDB Atlas Connection String]*
- `PORT`: `10000` (Render overrides this, but Express will fall back to it automatically)
- `NODE_ENV`: `production`

Click **Deploy Web Service**. Once it is online, copy your web service URL (e.g. `https://tick-it-backend.onrender.com`) and configure `EXPO_PUBLIC_API_URL` in `my-app/.env` before compiling the APK!

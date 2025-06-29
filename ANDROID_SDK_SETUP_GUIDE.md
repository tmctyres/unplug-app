# Android SDK Setup Guide for Windows

## Critical Issue Resolution

Your project currently cannot build for Android because the Android SDK is not properly configured. Here's how to fix it:

## Step 1: Install Android Studio

1. **Download Android Studio**
   - Go to https://developer.android.com/studio
   - Download Android Studio for Windows
   - Run the installer and follow the setup wizard

2. **Complete Initial Setup**
   - Launch Android Studio
   - Follow the setup wizard to install the Android SDK
   - Accept all license agreements
   - Let it download the required SDK components

## Step 2: Configure Environment Variables

1. **Find your Android SDK location**
   - Open Android Studio
   - Go to File → Settings (or Android Studio → Preferences on Mac)
   - Navigate to Appearance & Behavior → System Settings → Android SDK
   - Note the "Android SDK Location" path (usually `C:\Users\YourName\AppData\Local\Android\Sdk`)

2. **Set ANDROID_HOME Environment Variable**
   - Press `Win + R`, type `sysdm.cpl`, press Enter
   - Click "Environment Variables" button
   - Under "User variables" or "System variables", click "New"
   - Variable name: `ANDROID_HOME`
   - Variable value: Your Android SDK path (e.g., `C:\Users\YourName\AppData\Local\Android\Sdk`)
   - Click OK

3. **Update PATH Environment Variable**
   - In the same Environment Variables dialog
   - Find "Path" in the list and click "Edit"
   - Click "New" and add: `%ANDROID_HOME%\platform-tools`
   - Click "New" and add: `%ANDROID_HOME%\tools`
   - Click "New" and add: `%ANDROID_HOME%\tools\bin`
   - Click OK to save

## Step 3: Install Required SDK Components

1. **Open Android Studio SDK Manager**
   - In Android Studio, go to Tools → SDK Manager
   - Or click the SDK Manager icon in the toolbar

2. **Install Required SDK Platforms**
   - In the "SDK Platforms" tab, install:
     - Android 14.0 (API 34) - Latest
     - Android 13.0 (API 33)
     - Android 12.0 (API 31)
     - Any other versions your app targets

3. **Install Required SDK Tools**
   - In the "SDK Tools" tab, ensure these are installed:
     - Android SDK Build-Tools (latest version)
     - Android SDK Platform-Tools
     - Android SDK Tools
     - Android Emulator (if you want to test on emulator)

## Step 4: Verify Installation

1. **Restart your computer** to ensure environment variables take effect

2. **Open a new Command Prompt or PowerShell** and run:
   ```cmd
   echo %ANDROID_HOME%
   adb version
   ```

3. **Test NativeScript detection**
   ```cmd
   cd C:\Users\tobia\UNPLUG\unplug-app
   ns doctor android
   ```

## Step 5: Test Android Build

Once everything is set up, try building your app:

```cmd
npm run build:android
```

## Troubleshooting

### If ANDROID_HOME is still not recognized:
- Make sure you restarted your computer after setting environment variables
- Try setting the variable in both User and System variables
- Verify the path exists and contains folders like `platform-tools`, `build-tools`, etc.

### If build-tools are not found:
- Open Android Studio SDK Manager
- Go to SDK Tools tab
- Install the latest Android SDK Build-Tools
- Make sure the version matches what NativeScript expects

### If you get license errors:
- Open Android Studio
- Go to Tools → SDK Manager
- Accept all license agreements in the SDK Tools tab

## Alternative: Using NativeScript CLI

If you prefer, you can also use the NativeScript CLI to set up Android:

```cmd
ns setup android
```

This command will guide you through the Android setup process.

## Notes

- This setup is required only for local Android builds
- If you only plan to use the PWA version, you can skip this setup
- For iOS builds, you would need a Mac (which you mentioned you don't have)
- Consider using NativeScript Cloud builds if you don't want to set up local Android development

## After Setup

Once Android SDK is properly configured, you should be able to:
- Build Android APKs: `npm run build:android`
- Run on Android emulator: `npm run run:android`
- Debug on Android: `npm run debug:android`

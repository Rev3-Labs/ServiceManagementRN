# Android Tablet Deployment Guide

This guide explains how to build and deploy your React Native app directly to Android tablets without publishing to an app store.

## Prerequisites

1. **Android Development Environment**
   - Android Studio installed
   - Android SDK (API level 23+ based on your `minSdkVersion`)
   - Java Development Kit (JDK) 11 or higher

2. **Physical Device or Emulator**
   - Android tablet connected via USB
   - USB debugging enabled on the tablet
   - OR an Android emulator running

3. **Project Setup**
   - All dependencies installed (`npm install`)
   - Android project configured (if using Expo, run `npx expo prebuild`)

## Quick Verification

Before building, verify your Android project is set up:

```bash
# Check if Android app directory exists
ls android/app  # Should show build.gradle, src/, etc.

# If missing, and you're using Expo:
npx expo prebuild --platform android

# Or initialize React Native Android project:
npx react-native init TempProject --template react-native-template-typescript
# Then copy the android/ folder structure
```

## Method 1: Direct Installation via ADB (Recommended for Development/Testing)

This is the fastest method for installing on a single device during development.

### Step 1: Enable USB Debugging on Your Tablet

1. Go to **Settings** → **About tablet**
2. Tap **Build number** 7 times to enable Developer options
3. Go back to **Settings** → **Developer options**
4. Enable **USB debugging**
5. Connect your tablet to your computer via USB

### Step 2: Build and Install Debug APK

```bash
# Build and install directly to connected device
npm run android

# Or use React Native CLI directly
npx react-native run-android
```

This will:
- Build a debug APK
- Install it on your connected tablet
- Launch the app automatically

### Step 3: Verify Installation

The app should launch automatically. If not, find "Service Management" in your tablet's app drawer.

## Method 2: Build Release APK for Distribution

For production deployment or distributing to multiple devices, build a release APK.

### Step 1: Generate a Signing Key (First Time Only)

```bash
# Navigate to android/app directory
cd android/app

# Generate a keystore file
keytool -genkeypair -v -storetype PKCS12 -keystore service-management-release-key.keystore -alias service-management-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

**Important**: 
- Remember the password you set
- Store the keystore file securely (you'll need it for future updates)
- The keystore file should be added to `.gitignore` (never commit it!)

### Step 2: Configure Gradle for Signing

Create or edit `android/gradle.properties` and add:

```properties
SERVICE_MANAGEMENT_RELEASE_STORE_FILE=service-management-release-key.keystore
SERVICE_MANAGEMENT_RELEASE_KEY_ALIAS=service-management-key-alias
SERVICE_MANAGEMENT_RELEASE_STORE_PASSWORD=your-keystore-password
SERVICE_MANAGEMENT_RELEASE_KEY_PASSWORD=your-key-password
```

**Security Note**: For production, consider using environment variables or a secure credential store instead of plain text passwords.

### Step 3: Update build.gradle

Edit `android/app/build.gradle` and add the signing configuration:

```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('SERVICE_MANAGEMENT_RELEASE_STORE_FILE')) {
                storeFile file(SERVICE_MANAGEMENT_RELEASE_STORE_FILE)
                storePassword SERVICE_MANAGEMENT_RELEASE_STORE_PASSWORD
                keyAlias SERVICE_MANAGEMENT_RELEASE_KEY_ALIAS
                keyPassword SERVICE_MANAGEMENT_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            ...
            signingConfig signingConfigs.release
        }
    }
}
```

### Step 4: Build Release APK

```bash
# From project root
cd android
./gradlew assembleRelease

# On Windows (PowerShell)
cd android
.\gradlew.bat assembleRelease
```

The APK will be generated at:
```
android/app/build/outputs/apk/release/app-release.apk
```

### Step 5: Install Release APK

**Option A: Via ADB (USB)**
```bash
# Connect tablet via USB, then:
adb install android/app/build/outputs/apk/release/app-release.apk
```

**Option B: Transfer File to Tablet**
1. Copy `app-release.apk` to your tablet (via USB, email, cloud storage, etc.)
2. On the tablet, open the APK file
3. If prompted, enable "Install from Unknown Sources" in Settings
4. Tap "Install"

**Option C: Use a File Manager App**
- Upload APK to Google Drive, Dropbox, or similar
- Download on tablet using a file manager app
- Open and install

## Method 3: Build Android App Bundle (AAB) for Advanced Distribution

AAB format is more optimized but requires additional tools to install.

```bash
cd android
./gradlew bundleRelease
```

The AAB will be at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

**Note**: AAB files cannot be directly installed. You need to:
1. Use `bundletool` to convert AAB to APK, or
2. Use Google Play Console's internal testing track (even for internal distribution)

For direct installation, stick with APK format.

## Method 4: Internal Distribution Options

### Option A: Internal File Server
1. Host the APK on an internal web server or file share
2. Provide a download link to your team
3. Users download and install on their tablets

### Option B: Mobile Device Management (MDM)
If your organization uses MDM (like Microsoft Intune, VMware Workspace ONE, etc.):
1. Upload the APK to your MDM platform
2. Push the app to enrolled tablets automatically
3. MDM handles installation and updates

### Option C: Firebase App Distribution
For testing and internal distribution:
1. Set up Firebase App Distribution
2. Upload APK to Firebase
3. Invite testers via email
4. They receive a download link

## Troubleshooting

### "Device not found" or ADB Issues

```bash
# Check if device is connected
adb devices

# If device shows as "unauthorized":
# - Check tablet for USB debugging authorization prompt
# - Accept the prompt on the tablet

# Restart ADB server
adb kill-server
adb start-server
```

### "Installation failed" on Tablet

1. **Enable Unknown Sources**:
   - Settings → Security → Enable "Install from Unknown Sources" or
   - Settings → Apps → Special Access → Install Unknown Apps

2. **Check Storage Space**: Ensure tablet has enough free space

3. **Uninstall Previous Version**: If updating, uninstall the old version first

### Build Errors

```bash
# Clean build
cd android
./gradlew clean

# Rebuild
./gradlew assembleRelease
```

### "Gradle sync failed"

```bash
# Clear Gradle cache
cd android
./gradlew clean --refresh-dependencies
```

## Updating the App

When you need to update the app on tablets:

1. Build a new release APK (same signing key)
2. Increment version in `android/app/build.gradle`:
   ```gradle
   android {
       defaultConfig {
           versionCode 2  // Increment this
           versionName "1.0.1"  // Update this
       }
   }
   ```
3. Distribute the new APK using one of the methods above
4. Users install the new APK (it will replace the old version)

## Security Considerations

1. **Signing Key Security**:
   - Never commit the keystore file to version control
   - Store backups securely
   - Use different keys for development and production

2. **APK Distribution**:
   - Use secure channels for distribution
   - Consider code obfuscation for production builds
   - Enable ProGuard/R8 for release builds

3. **Device Security**:
   - Only install on trusted devices
   - Consider device management policies
   - Monitor for unauthorized installations

## Quick Reference Commands

```bash
# Development build and install
npm run android

# Build release APK
cd android && ./gradlew assembleRelease

# Install APK via ADB
adb install android/app/build/outputs/apk/release/app-release.apk

# Check connected devices
adb devices

# Uninstall app from device
adb uninstall com.servicemgmt  # Replace with your package name

# View app logs
adb logcat | grep ReactNativeJS
```

## Next Steps

- For rugged tablet-specific configuration, see [ANDROID_RUGGED_TABLET_GUIDE.md](./ANDROID_RUGGED_TABLET_GUIDE.md)
- For UI guidelines, see [ANDROID_TABLET_UI_GUIDELINES_ANALYSIS.md](./ANDROID_TABLET_UI_GUIDELINES_ANALYSIS.md)


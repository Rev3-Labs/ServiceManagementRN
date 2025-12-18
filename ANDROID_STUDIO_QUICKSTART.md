# Android Studio Quickstart Guide

Complete step-by-step instructions for setting up and running the Service Management app in Android Studio.

---

## Prerequisites

### 1. Install Required Software

**Java Development Kit (JDK 17+)**
- Download from: https://adoptium.net/
- Verify installation: Open Command Prompt and run `java -version`
- Should show version 17 or higher

**Node.js (v18+)**
- Download from: https://nodejs.org/
- Verify installation: `node -v` (should show v18 or higher)
- npm should be included: `npm -v`

**Android Studio (Latest Version)**
- Download from: https://developer.android.com/studio
- During installation, ensure these components are selected:
  - Android SDK
  - Android SDK Platform
  - Android Virtual Device (AVD)
  - Performance (Intel HAXM or Hyper-V)

---

## Part 1: First-Time Setup

### Step 1: Set Up Android Studio

1. **Launch Android Studio**
2. **If this is your first time:**
   - Click "More Actions" → "SDK Manager"
   - Or go to: **File → Settings → Appearance & Behavior → System Settings → Android SDK**

3. **Install Required SDK Components:**
   - **SDK Platforms tab:**
     - ✅ Check "Android 14.0 (UpsideDownCake)" (API Level 34)
     - ✅ Check "Android 13.0 (Tiramisu)" (API Level 33)
     - Click "Show Package Details"
     - ✅ Ensure "Android SDK Platform 34" is checked
   
   - **SDK Tools tab:**
     - ✅ Android SDK Build-Tools 34.0.0
     - ✅ Android Emulator
     - ✅ Android SDK Platform-Tools
     - ✅ Intel x86 Emulator Accelerator (HAXM installer)
   
   - Click "Apply" and wait for downloads to complete

4. **Note your SDK location** (you'll need this):
   - Usually: `C:\Users\YourName\AppData\Local\Android\Sdk`

### Step 2: Set Environment Variables (Windows)

1. **Open System Environment Variables:**
   - Press `Win + R`, type `sysdm.cpl`, press Enter
   - Click "Advanced" tab → "Environment Variables"

2. **Add ANDROID_HOME:**
   - Under "User variables", click "New"
   - Variable name: `ANDROID_HOME`
   - Variable value: `C:\Users\YourName\AppData\Local\Android\Sdk`
   - Click "OK"

3. **Add to PATH:**
   - Find "Path" in "User variables", click "Edit"
   - Click "New" and add: `%ANDROID_HOME%\platform-tools`
   - Click "New" and add: `%ANDROID_HOME%\emulator`
   - Click "OK" on all dialogs

4. **Verify Setup:**
   - Open a **NEW** Command Prompt (important - restart it)
   - Run: `adb --version` (should show Android Debug Bridge version)

### Step 3: Create Android Virtual Device (Emulator)

1. **In Android Studio:**
   - Click "More Actions" → "Virtual Device Manager"
   - Or go to: **Tools → Device Manager**

2. **Create New Device:**
   - Click "+ Create Device"
   - **Category:** Tablet
   - **Select:** Pixel Tablet (recommended for this app)
   - Click "Next"

3. **Select System Image:**
   - **Release Name:** UpsideDownCake (Android 14.0)
   - **API Level:** 34
   - **Target:** Android 14.0 (Google APIs)
   - Click "Download" next to the system image (if not installed)
   - Wait for download, then click "Next"

4. **Configure AVD:**
   - **AVD Name:** Keep default or use "Pixel_Tablet_API_34"
   - **Startup orientation:** Landscape (recommended for tablets)
   - **Graphics:** Automatic
   - Click "Finish"

---

## Part 2: Open and Build the Project

### Step 4: Install Project Dependencies

1. **Open Command Prompt or PowerShell**

2. **Navigate to project folder:**
   ```bash
   cd "C:\_code\Clean Earth\ServiceManagementRN"
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```
   - Wait for all packages to download (may take 3-5 minutes)

### Step 5: Open Project in Android Studio

1. **Launch Android Studio**

2. **Open the Android project:**
   - Click "Open"
   - Navigate to: `C:\_code\Clean Earth\ServiceManagementRN\android`
   - Click "OK"

3. **Wait for Gradle Sync:**
   - Bottom of screen will show "Gradle Sync" progress
   - This may take 2-5 minutes on first run
   - If prompted to upgrade Gradle Plugin, click "Don't remind me again"

4. **Check for Errors:**
   - If you see any red errors in the "Build" panel, try:
     - **Build → Clean Project**
     - **Build → Rebuild Project**

---

## Part 3: Run the App

### Step 6: Start Metro Bundler (JavaScript Server)

**The Metro bundler MUST be running before you can use the app.**

1. **Open a NEW Command Prompt/PowerShell window**

2. **Navigate to project root:**
   ```bash
   cd "C:\_code\Clean Earth\ServiceManagementRN"
   ```

3. **Start Metro:**
   ```bash
   npm start
   ```
   - You'll see: "Loading Metro Bundler"
   - Wait until you see: "Metro waiting on port 8081"
   - **Keep this window open!** (Don't close it)

### Step 7: Launch Emulator

**Option A: From Android Studio**
1. Click the device dropdown (top toolbar)
2. Select "Pixel_Tablet_API_34" (or your created device)
3. Click the green play button ▶ next to it
4. Wait 30-60 seconds for emulator to boot

**Option B: From Command Line**
1. Open another Command Prompt
2. Run:
   ```bash
   emulator -avd Pixel_Tablet_API_34
   ```

### Step 8: Build and Install the App

**Option A: Using npm (Recommended)**

1. **Open ANOTHER Command Prompt** (you should have 2 now: Metro + this one)
2. Navigate to project:
   ```bash
   cd "C:\_code\Clean Earth\ServiceManagementRN"
   ```
3. Run build:
   ```bash
   npm run android
   ```
4. **First build takes 3-5 minutes** (subsequent builds are faster)
5. App will automatically install and launch on the emulator

**Option B: Using Android Studio**

1. In Android Studio, click the **green play button** ▶ (top toolbar)
2. Or press **Shift + F10**
3. Select your emulator from the list
4. Click "OK"
5. Wait for build to complete

---

## Part 4: Using the App

### Initial Login
- Username: Enter any username (e.g., "tech1")
- Password: Enter any password
- Click "Sign In"

### Set Truck ID
1. Click on your username at the top
2. Select a Truck ID from the dropdown (e.g., "TRK-001")
3. Click "Save Truck ID"
4. You'll be taken back to the main menu

### Main Features
- **Waste Collection** - Manage orders, add containers
- **Drop Waste** - Record waste drops at transfer locations
- **Settings** - Configure truck and preferences

---

## Troubleshooting

### Metro Bundler Not Running
**Error:** "Unable to load script. Make sure you're running Metro..."

**Fix:**
```bash
cd "C:\_code\Clean Earth\ServiceManagementRN"
npm start
```
Keep this running in a separate window.

### Port 8081 Already in Use
**Error:** "Port 8081 is already in use"

**Fix:**
```bash
# Windows
netstat -ano | findstr :8081
taskkill /PID <process_id> /F

# Then restart Metro
npm start
```

### Emulator Not Detected
**Error:** "No connected devices"

**Fix:**
1. Ensure emulator is fully booted (home screen visible)
2. Check connection:
   ```bash
   adb devices
   ```
3. Should show: `emulator-5554    device`
4. If not, restart adb:
   ```bash
   adb kill-server
   adb start-server
   ```

### Build Fails - Java Version Issues
**Error:** "Unsupported Java version" or "JAVA_HOME is set to an invalid directory"

**Fix:**
1. Verify Java version: `java -version` (need 17+)
2. In `android/gradle.properties`, ensure this line exists:
   ```properties
   org.gradle.java.home=C:/Program Files/Android/Android Studio/jbr
   ```

### App Crashes on Launch
**Fix:**
1. Check Metro bundler is running
2. Clear app data:
   ```bash
   adb shell pm clear com.servicemgmt
   ```
3. Reinstall:
   ```bash
   npm run android
   ```

### Gradle Sync Failed
**Fix:**
1. In Android Studio: **File → Invalidate Caches → Invalidate and Restart**
2. Delete these folders (in `android/` directory):
   - `.gradle`
   - `build`
   - `app/build`
3. Re-sync: **File → Sync Project with Gradle Files**

### Changes Not Showing
**Fix - Hot Reload:**
- Press `R` twice in the Metro window (RR)
- Or shake the device (Ctrl+M in emulator) → "Reload"

**Fix - Full Rebuild:**
```bash
npm run android
```

---

## Development Workflow

### Making Code Changes

1. **Edit files** in VS Code or your preferred editor
2. **Save the file**
3. **Hot reload** happens automatically in most cases
4. If changes don't appear:
   - Press `R` twice in Metro console
   - Or reload from emulator: `Ctrl+M` → "Reload"

### Full Rebuild (after major changes)

```bash
# Stop Metro (Ctrl+C)
# Run clean build
cd android
./gradlew clean
cd ..
npm run android
```

---

## Running on Physical Device

### Setup USB Debugging

1. **Enable Developer Mode on Device:**
   - Settings → About phone
   - Tap "Build number" 7 times

2. **Enable USB Debugging:**
   - Settings → System → Developer options
   - Toggle "USB debugging" ON

3. **Connect Device:**
   - Connect via USB cable
   - On device: Tap "Allow" when prompted

4. **Verify Connection:**
   ```bash
   adb devices
   ```
   Should show your device serial number

5. **Run App:**
   ```bash
   npm run android
   ```
   Automatically detects physical device

---

## Quick Reference Commands

```bash
# Start Metro bundler
npm start

# Build and run on Android
npm run android

# Run on web browser
npm run web

# Check connected devices
adb devices

# Restart adb
adb kill-server && adb start-server

# Clean build
cd android && ./gradlew clean && cd ..

# Clear app data
adb shell pm clear com.servicemgmt

# Launch app manually
adb shell am start -n com.servicemgmt/.MainActivity
```

---

## Need More Help?

- **React Native Docs:** https://reactnative.dev/docs/environment-setup
- **Android Studio Guide:** https://developer.android.com/studio/intro
- **Troubleshooting:** See `CONNECTION_FIX_GUIDE.md` in project root

---

**Last Updated:** December 2025

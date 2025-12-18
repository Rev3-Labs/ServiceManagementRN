# Running on Your Android Tablet - Quick Guide

Simple instructions to connect your physical Android tablet and run the app.

---

## Part 1: Enable Developer Mode on Your Tablet (One-Time Setup)

### Step 1: Enable Developer Options

1. On your tablet, open **Settings**
2. Scroll down and tap **About tablet** (or **About device**)
3. Find **Build number**
4. **Tap "Build number" 7 times rapidly**
5. You'll see a message: "You are now a developer!"

### Step 2: Enable USB Debugging

1. Go back to main **Settings**
2. Scroll down to **System** → **Developer options**
   - (On some tablets: **Settings → Additional settings → Developer options**)
3. Toggle **Developer options** to ON (if needed)
4. Scroll down and toggle **USB debugging** to ON
5. When prompted "Allow USB debugging?", tap **OK**

---

## Part 2: Connect Your Tablet to Computer

### Step 1: Connect USB Cable

1. **Connect your tablet to your computer** using a USB cable
   - ⚠️ Make sure it's a **data cable**, not just a charging cable
   - Try the cable that came with your tablet

2. **On your tablet**, you'll see a popup:
   - "Allow USB debugging?"
   - "The computer's RSA key fingerprint is: ..."
   - ✅ Check "Always allow from this computer"
   - Tap **Allow** or **OK**

### Step 2: Verify Connection

1. **On your computer**, open Command Prompt or PowerShell

2. **Check if tablet is detected:**
   ```bash
   adb devices
   ```

3. **You should see output like this:**
   ```
   List of devices attached
   ABC123456789    device
   ```
   - If you see your device with "device" status → ✅ **Connected!**

**If you see "unauthorized":**
- On tablet: Tap "Revoke USB debugging authorizations" in Developer options
- Disconnect and reconnect USB cable
- Tap "Allow" on the popup again

**If you see nothing or "offline":**
- Try a different USB cable
- Try a different USB port on your computer
- Restart adb: `adb kill-server` then `adb start-server`

---

## Part 3: Install and Run the App

### Prerequisites Check

Make sure you have:
- ✅ Installed Node.js (run `node -v` to check)
- ✅ Installed project dependencies (`npm install` in project folder)

### Step 1: Start Metro Bundler

1. **Open Command Prompt or PowerShell**

2. **Navigate to project folder:**
   ```bash
   cd "C:\_code\Clean Earth\ServiceManagementRN"
   ```

3. **Start Metro (JavaScript server):**
   ```bash
   npm start
   ```
   - Wait until you see: **"Metro waiting on port 8081"**
   - **Keep this window open!** (Don't close it while using the app)

### Step 2: Build and Install App on Tablet

1. **Open a NEW Command Prompt/PowerShell window**
   - (Keep Metro running in the first window)

2. **Navigate to project folder:**
   ```bash
   cd "C:\_code\Clean Earth\ServiceManagementRN"
   ```

3. **Build and install:**
   ```bash
   npm run android
   ```

4. **Wait for build to complete:**
   - First time: 3-5 minutes
   - Subsequent builds: 1-2 minutes
   - You'll see: "BUILD SUCCESSFUL"
   - App will automatically install and launch on your tablet

---

## Using the App

### First Time Setup

1. **Login Screen:**
   - Username: Enter any username (e.g., "tech1")
   - Password: Enter any password
   - Tap "Sign In"

2. **Set Truck ID:**
   - Tap on your username at the top of the screen
   - Select a Truck ID from the dropdown (e.g., "TRK-001")
   - Tap "Save Truck ID"
   - Tap "Back" to return to dashboard

3. **Start Using:**
   - Tap "Waste Collection" to manage orders
   - Add containers, complete orders
   - Tap "Drop Waste" when you have completed orders

---

## Making Changes & Reloading

### Hot Reload (for small changes)

After editing code files:

**Option 1: Automatic (usually works)**
- Just save your file
- Changes appear on tablet automatically

**Option 2: Manual Reload**
- Shake your tablet
- Or tap the menu button (if your tablet has one)
- Or in Command Prompt with Metro running, press: **R** (twice quickly: RR)
- Tap "Reload"

### Full Rebuild (for major changes)

If hot reload doesn't work or you made big changes:

```bash
npm run android
```

---

## Troubleshooting

### "Unable to load script" Error

**Problem:** Metro bundler not running or not connected

**Fix:**
1. Make sure Metro is running (see "Start Metro Bundler" above)
2. In Command Prompt, run:
   ```bash
   adb reverse tcp:8081 tcp:8081
   ```
3. Restart the app:
   ```bash
   adb shell am force-stop com.servicemgmt
   adb shell am start -n com.servicemgmt/.MainActivity
   ```

### App Crashes on Launch

**Fix:**
```bash
# Clear app data
adb shell pm clear com.servicemgmt

# Reinstall
npm run android
```

### "No connected devices" Error

**Fix:**
1. Check USB connection
2. Verify: `adb devices` shows your tablet
3. If not, try:
   ```bash
   adb kill-server
   adb start-server
   adb devices
   ```

### Changes Not Showing Up

**Fix:**
1. Try manual reload (shake tablet → Reload)
2. If still not working, full rebuild:
   ```bash
   npm run android
   ```

### Tablet Shows Old Version

**Fix - Clean Install:**
```bash
# Uninstall from tablet
adb uninstall com.servicemgmt

# Reinstall
npm run android
```

---

## Daily Workflow

**Every day when you start testing:**

1. **Connect tablet via USB**
2. **Start Metro bundler:**
   ```bash
   cd "C:\_code\Clean Earth\ServiceManagementRN"
   npm start
   ```
3. **Launch app on tablet:**
   - Tap the app icon on your tablet
   - Or run: `adb shell am start -n com.servicemgmt/.MainActivity`

**When you make code changes:**
- Small changes → Save file → Hot reload (automatic or press R in Metro)
- Large changes → `npm run android`

---

## Disconnecting Your Tablet

When you're done testing:

1. **Stop Metro bundler:**
   - Press `Ctrl+C` in the Command Prompt window where Metro is running

2. **Disconnect USB cable** from your tablet

3. **The app stays installed** on your tablet
   - You can use it offline (but no live reloading)
   - To get updates, reconnect and run `npm run android` again

---

## Wireless Debugging (Optional - Android 11+)

If you want to test without USB cable:

### One-Time Setup:

1. **Connect tablet via USB first**

2. **Enable wireless debugging:**
   - Tablet: Settings → Developer options → Wireless debugging → ON
   - Note the IP address and port (e.g., 192.168.1.100:5555)

3. **Connect wirelessly:**
   ```bash
   adb tcpip 5555
   adb connect 192.168.1.100:5555
   ```

4. **Disconnect USB cable**

5. **Verify:**
   ```bash
   adb devices
   ```
   Should show: `192.168.1.100:5555    device`

### Using Wireless:

- Your tablet and computer must be on the **same WiFi network**
- Use `npm run android` as normal (it will use the wireless connection)

---

## Quick Reference Commands

```bash
# Check connected tablets
adb devices

# Start Metro bundler
npm start

# Build and install app
npm run android

# Launch app
adb shell am start -n com.servicemgmt/.MainActivity

# Restart app
adb shell am force-stop com.servicemgmt
adb shell am start -n com.servicemgmt/.MainActivity

# Clear app data (fresh start)
adb shell pm clear com.servicemgmt

# Uninstall app
adb uninstall com.servicemgmt

# Connect to Metro server
adb reverse tcp:8081 tcp:8081

# Restart adb
adb kill-server
adb start-server
```

---

## Need More Help?

- **Full Android Studio Guide:** See `ANDROID_STUDIO_QUICKSTART.md`
- **Connection Issues:** See `CONNECTION_FIX_GUIDE.md`
- **React Native Docs:** https://reactnative.dev/docs/running-on-device

---

**Last Updated:** December 2025

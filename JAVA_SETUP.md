# Java Setup for React Native Android

## Quick Fix: Set JAVA_HOME

Since Android Studio is working, Java is installed. You just need to set `JAVA_HOME` for command-line use.

### Option 1: Use the Setup Script (Easiest)

1. **Run the setup script** before running `npm run android`:
   ```powershell
   .\set-java-home.ps1
   npm run android
   ```

2. **Or run it in the same PowerShell session**:
   ```powershell
   .\set-java-home.ps1
   # Then in the same terminal:
   npm run android
   ```

### Option 2: Set JAVA_HOME Permanently (Recommended)

1. **Open System Properties**:
   - Press `Win + X` → **System**
   - Click **Advanced system settings**
   - Click **Environment Variables**

2. **Add JAVA_HOME**:
   - Under **System variables**, click **New**
   - Variable name: `JAVA_HOME`
   - Variable value: `C:\Program Files\Android\Android Studio\jbr`
   - Click **OK**

3. **Update PATH**:
   - Find **Path** in System variables
   - Click **Edit**
   - Click **New**
   - Add: `%JAVA_HOME%\bin`
   - Click **OK** on all dialogs

4. **Restart your terminal/IDE** for changes to take effect

### Option 3: Set JAVA_HOME in Current Session Only

Run this in PowerShell before `npm run android`:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
npm run android
```

### Verify Java is Working

After setting JAVA_HOME, verify it works:

```powershell
java -version
```

You should see Java version information.

### Alternative: Use Android Studio Instead

If you prefer, you can always run the app from **Android Studio** instead of the command line:
- Open the `android` folder in Android Studio
- Click the **Run** button (▶️)

This doesn't require JAVA_HOME to be set.










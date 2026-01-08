# Launcher Icon Setup

## Quick Fix: Use Android Studio Image Asset Studio

1. **In Android Studio**, right-click on `app/src/main/res` folder
2. Select **New → Image Asset**
3. In the **Icon Type** dropdown, select **Launcher Icons (Adaptive and Legacy)**
4. Choose a **Foreground Layer**:
   - Use **Image** and select any square image (or use the built-in clipart)
   - Or use **Text** and type "SM" for Service Management
5. Set **Background Color** to `#65B230` (your app's green color)
6. Click **Next** → **Finish**

This will automatically generate all required icon files in the correct density folders.

## Alternative: Use Default Android Icon (Temporary)

If you just need to get the build working immediately, you can temporarily use Android's default icon by updating `AndroidManifest.xml`:

```xml
android:icon="@android:drawable/sym_def_app_icon"
android:roundIcon="@android:drawable/sym_def_app_icon"
```

Then replace with proper icons later using Image Asset Studio.











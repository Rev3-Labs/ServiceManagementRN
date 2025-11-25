# Service Management - React Native

A React Native application for field service management, optimized for **Android Zebra and Honeywell rugged tablets**. This is a port of the web-based Service Management application to React Native, designed for field use with glove-friendly touch targets and hardware barcode scanner integration.

## Features

- ✅ Fully responsive design for tablets
- ✅ Touch-optimized UI for glove use (44px+ touch targets)
- ✅ **Dual dashboard views**: Full-screen and Master-Detail (tablet-optimized)
- ✅ Complete waste collection workflow
- ✅ Stream selection and container management
- ✅ Weight tracking with soft/hard warnings
- ✅ Manifest management
- ✅ Materials & supplies tracking
- ✅ Service closeout process
- ✅ Native navigation and scrolling

## Getting Started

### Prerequisites

- Node.js >= 18
- React Native development environment set up
- For iOS: Xcode and CocoaPods
- For Android: Android Studio and Android SDK

### Installation

```bash
npm install
```

### Running the App

#### iOS

```bash
cd ios && pod install && cd ..
npm run ios
```

#### Android

```bash
npm run android
```

#### Web (Browser)

```bash
npm run web
```

This will start a development server at `http://localhost:8080` and automatically open it in your browser.

To build for production:

```bash
npm run web:build
```

### Development

Start the Metro bundler:

```bash
npm start
```

#### Visual Editing with React DevTools

For point-and-click editing in the browser:

1. **Install browser extension:**
   - [Chrome/Edge Extension](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
   - [Firefox Extension](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)

2. **Run your app:**

   ```bash
   npm run web
   ```

3. **Open DevTools** (F12) and click the "⚛️ Components" tab

4. **Inspect and edit** components, props, and state directly in the browser!

For detailed setup instructions, see **[DEVTOOLS_SETUP.md](./DEVTOOLS_SETUP.md)**.

#### AI-Powered Code Changes with Cursor Agent CLI

For AI-assisted code generation and refactoring from the terminal:

1. **Install Cursor Agent CLI** (requires WSL or Git Bash on Windows):

   ```bash
   curl https://cursor.com/install -fsS | bash
   ```

2. **Use interactive mode**:

   ```bash
   cursor-agent
   ```

3. **Or use print mode** for quick changes:
   ```bash
   cursor-agent -p "Add a new feature to the dashboard"
   ```

For detailed setup and usage, see **[CURSOR_AGENT_CLI_SETUP.md](./CURSOR_AGENT_CLI_SETUP.md)**.

**Note**: React DevTools is for browser-based visual editing, while Cursor Agent CLI is for terminal-based AI code assistance. Both tools complement each other!

## Project Structure

```
src/
  components/     # Reusable UI components
  screens/        # Screen components
  navigation/     # Navigation configuration
  styles/         # Shared styles and theme
  utils/          # Utility functions
```

## Technology Stack

- React Native 0.73
- React Navigation
- React Native Paper (Material Design components)
- TypeScript

## Android Rugged Tablet Deployment

This application is specifically optimized for **Zebra Technologies** and **Honeywell** rugged Android tablets used in field service environments.

**Key Features for Rugged Tablets**:

- ✅ Glove-friendly touch targets (44-56px minimum)
- ✅ Hardware barcode scanner integration ready
- ✅ Optimized for outdoor visibility
- ✅ Field-tested UX patterns

For detailed deployment instructions, scanner integration, and device-specific configuration, see **[ANDROID_RUGGED_TABLET_GUIDE.md](./ANDROID_RUGGED_TABLET_GUIDE.md)**.

For an analysis of Android tablet UI guidelines compliance and recommendations, see **[ANDROID_TABLET_UI_GUIDELINES_ANALYSIS.md](./ANDROID_TABLET_UI_GUIDELINES_ANALYSIS.md)**.

For a comparison of the Full-Screen vs Master-Detail dashboard views, see **[MASTER_DETAIL_COMPARISON.md](./MASTER_DETAIL_COMPARISON.md)**.

# React Native Setup Instructions

## Prerequisites

1. **Node.js** (v18 or higher)
2. **React Native CLI** (optional, but recommended)
3. **For iOS Development:**
   - macOS
   - Xcode 14 or higher
   - CocoaPods
4. **For Android Development:**
   - Android Studio
   - Android SDK (API 23+)
   - Java Development Kit (JDK 17)

## Installation Steps

### 1. Install Dependencies

```bash
cd ServiceMgmtRN
npm install
```

### 2. iOS Setup

```bash
cd ios
pod install
cd ..
```

### 3. Android Setup

No additional setup required for Android. The project is configured to work out of the box.

## Running the App

### iOS

```bash
npm run ios
```

Or open the project in Xcode:
```bash
open ios/ServiceMgmtRN.xcworkspace
```

### Android

```bash
npm run android
```

Make sure you have an Android emulator running or a physical device connected.

### Start Metro Bundler

```bash
npm start
```

## Project Structure

```
ServiceMgmtRN/
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Switch.tsx
│   │   └── Table.tsx
│   ├── screens/         # Screen components
│   │   ├── WasteCollectionScreen.tsx
│   │   ├── ManifestScreen.tsx
│   │   ├── MaterialsSuppliesScreen.tsx
│   │   └── ServiceCloseoutScreen.tsx
│   └── styles/          # Theme and styling
│       └── theme.ts
├── App.tsx              # Main app component
└── index.js             # Entry point
```

## Key Features Ported

✅ Waste Collection workflow
✅ Stream selection
✅ Container selection and entry
✅ Weight tracking with warnings
✅ Responsive layout for tablets
✅ Touch-optimized UI (44px+ touch targets)
✅ Navigation between screens

## Differences from Web Version

- Uses React Native components instead of HTML elements
- StyleSheet instead of Tailwind CSS classes
- React Navigation instead of conditional rendering
- Native touch interactions
- Responsive using Dimensions API

## Troubleshooting

### Metro bundler issues
```bash
npm start -- --reset-cache
```

### iOS build issues
```bash
cd ios
pod deintegrate
pod install
cd ..
```

### Android build issues
```bash
cd android
./gradlew clean
cd ..
```


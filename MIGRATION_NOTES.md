# Migration Notes: Web to React Native

## Overview

This React Native application is a port of the web-based Service Management application, optimized for tablet use in field environments.

## Key Changes

### 1. Component Architecture

**Web (React + Radix UI):**
- Used HTML elements (`div`, `button`, `input`, etc.)
- Radix UI components for complex interactions
- Tailwind CSS for styling

**React Native:**
- Native components (`View`, `TouchableOpacity`, `TextInput`, etc.)
- Custom-built components matching the design system
- StyleSheet API for styling

### 2. Styling System

**Web:**
```tsx
<div className="flex flex-col p-4 bg-card">
  <Button className="h-12 px-6">Click</Button>
</div>
```

**React Native:**
```tsx
<View style={styles.container}>
  <Button title="Click" size="md" onPress={handlePress} />
</View>
```

### 3. Navigation

**Web:**
- Conditional rendering with state management
- Single-page application with step-based flow

**React Native:**
- React Navigation for screen management
- Stack navigator for hierarchical navigation
- Native back button support

### 4. Responsive Design

**Web:**
- CSS media queries and Tailwind breakpoints
- Viewport units (`vh`, `vw`)

**React Native:**
- `Dimensions` API for screen size detection
- Dynamic style calculation based on screen dimensions
- Responsive utility functions

### 5. Touch Interactions

**Web:**
- Mouse events (`onClick`, `onMouseOver`)
- Hover states

**React Native:**
- Touch events (`onPress`, `onPressIn`, `onPressOut`)
- Touch target sizes (minimum 44px for glove use)
- Active opacity feedback

### 6. Forms and Inputs

**Web:**
- HTML form elements
- Browser validation

**React Native:**
- `TextInput` component
- Custom validation logic
- Keyboard handling

## Components Ported

### Core Components
- ✅ Button (with variants: primary, secondary, outline, ghost, destructive)
- ✅ Card (with Header, Content, Title)
- ✅ Input (with label and error states)
- ✅ Badge (with variants)
- ✅ Switch
- ✅ Table (with Header, Body, Row, Cell)

### Screens Ported
- ✅ Waste Collection Screen (full workflow)
  - Dashboard
  - Stream Selection
  - Container Selection
  - Container Entry
  - Container Summary
  - Manifest Management
  - Materials & Supplies
  - Order Service
- ✅ Manifest Screen (placeholder)
- ✅ Materials & Supplies Screen (placeholder)
- ✅ Service Closeout Screen (placeholder)

## Features Maintained

1. **Workflow Logic**: All business logic and state management preserved
2. **Data Structures**: Same TypeScript interfaces and types
3. **User Experience**: Similar flow and interactions
4. **Responsive Layout**: Adapts to different tablet sizes
5. **Touch Optimization**: Large touch targets for glove use

## Features Enhanced

1. **Native Performance**: Better performance on mobile devices
2. **Offline Capability**: Can work offline (with proper setup)
3. **Native Features**: Access to device features (camera, GPS, etc.)
4. **Better Scrolling**: Native scroll views with momentum

## Not Yet Ported

The following features from the web version are placeholders and need full implementation:

1. **DEA Flow Screens**: DEA-specific workflows
2. **Signature Capture**: Digital signature functionality
3. **Barcode Scanning**: Camera-based barcode scanning
4. **Image Capture**: Photo capture for documentation
5. **Advanced Table Features**: Sorting, filtering, pagination
6. **Modal Dialogs**: Full modal system with animations
7. **Toast Notifications**: Success/error notifications

## Next Steps

1. Install dependencies: `npm install`
2. Set up iOS: `cd ios && pod install`
3. Run on device/emulator: `npm run ios` or `npm run android`
4. Implement remaining features as needed
5. Add native modules for barcode scanning, signatures, etc.

## Dependencies

### Core
- `react-native`: 0.73.0
- `react`: 18.2.0

### Navigation
- `@react-navigation/native`: Navigation framework
- `@react-navigation/native-stack`: Stack navigator
- `react-native-safe-area-context`: Safe area handling
- `react-native-screens`: Native screen components

### UI
- `react-native-paper`: Material Design components (optional, for future use)

### Utilities
- `react-native-gesture-handler`: Gesture handling
- `react-native-reanimated`: Animations

## Testing

The app should be tested on:
- iPad (various sizes)
- Android tablets (various sizes)
- Different orientations (portrait/landscape)
- With gloves (touch target validation)


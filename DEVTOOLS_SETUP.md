# React DevTools Setup Guide

## Overview

React DevTools allows you to inspect and edit React components directly in the browser. You can view component props, state, and styles, and make live edits.

## Installation Methods

### Method 1: Browser Extension (Recommended)

The easiest way to use React DevTools is through browser extensions:

#### Chrome/Edge
1. Install the [React Developer Tools extension](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
2. Open your app at `http://localhost:8080`
3. Open Chrome DevTools (F12)
4. You'll see a new "⚛️ Components" tab
5. Click on components to inspect and edit them

#### Firefox
1. Install the [React Developer Tools extension](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)
2. Open your app at `http://localhost:8080`
3. Open Firefox DevTools (F12)
4. You'll see a new "⚛️ Components" tab

### Method 2: Standalone DevTools (Alternative)

If you prefer a separate window for DevTools:

1. **Start the DevTools server:**
   ```bash
   npm run devtools
   ```
   This opens a standalone DevTools window.

2. **In a separate terminal, start your app:**
   ```bash
   npm run web
   ```

3. The DevTools window will automatically connect to your app.

## Using React DevTools

### Inspecting Components

1. **Open your app** in the browser (`http://localhost:8080`)
2. **Open DevTools** (F12 or right-click → Inspect)
3. **Click the "⚛️ Components" tab**
4. **Browse the component tree** - You'll see your React component hierarchy
5. **Click on any component** to see its:
   - Props
   - State
   - Hooks
   - Rendered output

### Editing Props and State

1. **Select a component** in the component tree
2. **Find the prop or state** you want to edit
3. **Click the value** to edit it inline
4. **Press Enter** to apply the change
5. **See the update instantly** in your app

### Example: Editing Button Text

1. Open DevTools → Components tab
2. Find a `<Button>` component in the tree
3. Click on it to see its props
4. Find the `title` prop
5. Click on the value (e.g., "Start Service")
6. Change it to "Begin Service"
7. Press Enter
8. See the button text update in real-time!

### Inspecting Styles

1. **Select a component** in the Components tab
2. **Look at the right panel** - you'll see:
   - Props
   - State
   - Hooks
   - **Styles** (if available)

3. **For React Native Web**, styles are shown as:
   - Style objects
   - Computed CSS (in the Elements tab)

### Finding Components

1. **Use the search bar** at the top of the Components tab
2. **Type a component name** (e.g., "Button", "Card")
3. **Or use the "Select an element" tool** (target icon)
4. **Click on an element** in your app to highlight it in DevTools

## Tips and Tricks

### 1. Highlight Updates
- Enable "Highlight updates" to see which components re-render
- Useful for performance debugging

### 2. Filter Components
- Use the filter box to find specific components
- Filter by component name or prop value

### 3. View Component Source
- Right-click a component → "Show source"
- Opens the component code in Sources tab

### 4. Profiler Tab
- Use the "Profiler" tab to analyze performance
- Record interactions to see render times
- Identify slow components

### 5. Console Integration
- Use `$r` in the Console tab to reference the selected component
- Example: `$r.props.title` to see the title prop

## Common Use Cases

### 1. Testing Different Props
- Edit button variants, sizes, or text
- Test different states without changing code
- See how components respond to different props

### 2. Debugging State
- Inspect component state values
- See when state changes
- Understand data flow

### 3. Style Debugging
- See computed styles
- Understand why styles aren't applying
- Test different style values

### 4. Component Hierarchy
- Understand the component tree
- See parent-child relationships
- Identify where props come from

## Troubleshooting

### DevTools Not Showing Components

1. **Make sure you're in development mode:**
   - Check that `NODE_ENV` is not `production`
   - The webpack config should be in development mode

2. **Refresh the page:**
   - Sometimes DevTools needs a refresh to connect

3. **Check browser console:**
   - Look for any errors
   - React DevTools should log when it connects

### Standalone DevTools Not Connecting

1. **Make sure both are running:**
   - DevTools server: `npm run devtools`
   - Web app: `npm run web`

2. **Check the port:**
   - Standalone DevTools uses port 8097 by default
   - Make sure nothing is blocking it

3. **Try the browser extension instead:**
   - Browser extensions are more reliable
   - No separate process needed

## Keyboard Shortcuts

- **F12**: Open/Close DevTools
- **Ctrl+Shift+C** (Cmd+Option+C on Mac): Select element tool
- **Ctrl+Shift+I** (Cmd+Option+I on Mac): Toggle DevTools
- **Esc**: Toggle console/DevTools panels

## Additional Resources

- [React DevTools Documentation](https://react.dev/learn/react-developer-tools)
- [Chrome DevTools Guide](https://developer.chrome.com/docs/devtools/)
- [React DevTools GitHub](https://github.com/facebook/react/tree/main/packages/react-devtools)

## Quick Start

1. **Install browser extension** (Chrome/Edge or Firefox)
2. **Run your app:**
   ```bash
   npm run web
   ```
3. **Open DevTools** (F12)
4. **Click "⚛️ Components" tab**
5. **Start inspecting and editing!**

That's it! You can now point and click to inspect and edit your React components directly in the browser.


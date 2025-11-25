# Cursor Agent CLI Setup Guide

## Overview

The **Cursor Agent CLI** is a command-line tool that brings Cursor's AI capabilities to your terminal. It allows you to:
- Make AI-powered code changes from the terminal
- Refactor code with natural language commands
- Review and approve changes interactively
- Automate coding tasks

**Note**: This is different from React DevTools (browser-based visual editing). The Cursor Agent CLI is for terminal-based AI assistance.

## Installation

### Windows (PowerShell/WSL)

The Cursor Agent CLI installation script requires bash. On Windows, you have two options:

#### Option 1: Using WSL (Windows Subsystem for Linux) - Recommended

1. **Install WSL** (if not already installed):
   ```powershell
   wsl --install
   ```
   Restart your computer after installation.

2. **Open WSL terminal** and run:
   ```bash
   curl https://cursor.com/install -fsS | bash
   ```

3. **Verify installation**:
   ```bash
   cursor-agent --version
   ```

4. **Add to PATH** (if needed):
   ```bash
   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
   source ~/.bashrc
   ```

#### Option 2: Using Git Bash

1. **Install Git for Windows** (includes Git Bash)
   - Download from: https://git-scm.com/download/win

2. **Open Git Bash** and run:
   ```bash
   curl https://cursor.com/install -fsS | bash
   ```

3. **Verify installation**:
   ```bash
   cursor-agent --version
   ```

### macOS/Linux

```bash
curl https://cursor.com/install -fsS | bash
cursor-agent --version
```

## Usage

### Interactive Mode

Start an interactive session to have a conversation with the AI agent:

```bash
cursor-agent
```

Then you can:
- Describe what you want to do: "Add a new button component"
- Review proposed changes
- Approve or reject modifications
- Ask follow-up questions

### Non-Interactive Mode (Print Mode)

Use for automation and scripting:

```bash
cursor-agent -p "Refactor the Button component to use TypeScript interfaces"
```

### Resuming Sessions

Continue a previous conversation:

```bash
cursor-agent resume
```

## Configuration

### Rules System

Create custom rules in `.cursor/rules` directory to guide the agent's behavior:

```bash
mkdir -p .cursor/rules
```

Example rule file (`.cursor/rules/react-native.md`):
```markdown
# React Native Development Rules

- Always use TypeScript for new components
- Follow the existing component structure
- Use the theme from src/styles/theme.ts
- Maintain 44px+ touch targets for tablet use
- Use React Native components, not web components
```

### Model Context Protocol (MCP)

Connect external tools and data sources using MCP servers. See [Cursor MCP Documentation](https://docs.cursor.com/cli/mcp) for details.

## Examples

### Example 1: Add a New Component

```bash
cursor-agent -p "Create a new LoadingSpinner component in src/components/LoadingSpinner.tsx that matches our design system"
```

### Example 2: Refactor Code

```bash
cursor-agent -p "Refactor the WasteCollectionScreen to extract the order card into a separate component"
```

### Example 3: Fix Bugs

```bash
cursor-agent -p "Fix the layout issue in the master-detail view where the panes don't resize properly"
```

### Example 4: Interactive Session

```bash
cursor-agent
# Then type:
> I want to add form validation to the ContainerEntryScreen
> Make sure to validate that gross weight is greater than tare weight
> Add error messages below each input field
```

## Comparison: Cursor Agent CLI vs React DevTools

| Feature | Cursor Agent CLI | React DevTools |
|---------|-----------------|----------------|
| **Interface** | Terminal/CLI | Browser extension |
| **Purpose** | AI-powered code generation/refactoring | Visual inspection and editing |
| **Editing** | Code files | Component props/state (temporary) |
| **Best For** | Making code changes, refactoring | Debugging, testing props, inspecting |
| **Persistence** | Changes saved to files | Changes are temporary (refresh resets) |
| **AI Assistance** | ✅ Yes - AI generates code | ❌ No - manual editing only |

## When to Use Each Tool

### Use Cursor Agent CLI When:
- ✅ You want to make permanent code changes
- ✅ You need to refactor or restructure code
- ✅ You want AI assistance with coding tasks
- ✅ You're working from the terminal
- ✅ You need to create new files or components

### Use React DevTools When:
- ✅ You want to test different prop values quickly
- ✅ You're debugging component behavior
- ✅ You want to inspect the component tree
- ✅ You're testing UI changes visually
- ✅ You want to see component state/props in real-time

## Security Note

⚠️ **Important**: The Cursor Agent CLI can read, modify, and delete files, and execute shell commands. Always:
- Review proposed changes before approving
- Use in trusted environments only
- Set appropriate permission rules
- Test changes in a development environment first

## Troubleshooting

### Command Not Found

If `cursor-agent` command is not found:

1. **Check if installed**:
   ```bash
   ls ~/.local/bin/cursor-agent
   ```

2. **Add to PATH**:
   ```bash
   export PATH="$HOME/.local/bin:$PATH"
   ```

3. **Make it permanent** (add to `~/.bashrc` or `~/.zshrc`):
   ```bash
   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
   source ~/.bashrc
   ```

### Windows-Specific Issues

- Use WSL or Git Bash for installation
- Ensure bash is available in your terminal
- Check that `~/.local/bin` is in your PATH

## Additional Resources

- [Cursor Agent CLI Documentation](https://docs.cursor.com/en/cli)
- [Cursor CLI Blog Post](https://cursor.com/blog/cli)
- [Model Context Protocol (MCP)](https://docs.cursor.com/cli/mcp)

## Quick Start

1. **Install** (using WSL or Git Bash on Windows):
   ```bash
   curl https://cursor.com/install -fsS | bash
   ```

2. **Verify**:
   ```bash
   cursor-agent --version
   ```

3. **Start using**:
   ```bash
   cursor-agent -p "Help me understand the codebase structure"
   ```

That's it! You now have AI-powered code assistance from your terminal.


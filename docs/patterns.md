# hermex - Pattern Detection Reference

Comprehensive reference for all React component usage patterns detected by hermex.

## Table of Contents

- [Overview](#overview)
- [Import Patterns](#import-patterns)
- [JSX Usage Patterns](#jsx-usage-patterns)
- [Variable and Assignment Patterns](#variable-and-assignment-patterns)
- [Conditional Patterns](#conditional-patterns)
- [Collection Patterns](#collection-patterns)
- [Lazy and Dynamic Patterns](#lazy-and-dynamic-patterns)
- [Advanced React Patterns](#advanced-react-patterns)
- [Pattern Statistics](#pattern-statistics)

## Overview

hermex uses SWC's AST parser to detect over 10 distinct React component usage patterns. This guide documents all detectable patterns with code examples.

**Why Pattern Detection Matters:**
- Understand how components are used across your codebase
- Identify refactoring opportunities
- Track migration progress when moving between UI libraries
- Detect code complexity and potential code smells
- Generate usage analytics for component libraries

## Import Patterns

### Default Imports

Detects components imported as default exports.

**Code Example:**
```typescript
import Button from '@mui/material/Button';
import Card from '@company/design-system/Card';
```

**Detection:**
- Pattern name: `Default Imports`
- Tracks: Component name, source package, line number
- Use case: Common for packages that export components as default

### Named Imports

Detects components imported as named exports.

**Code Example:**
```typescript
import { Button, TextField, Card } from '@mui/material';
import { Typography, Avatar } from '@company/design-system';
```

**Detection:**
- Pattern name: `Named Imports`
- Tracks: Component name, source package, line number
- Use case: Most common import pattern for modern React libraries

### Namespace Imports

Detects components imported as a namespace.

**Code Example:**
```typescript
import * as MUI from '@mui/material';
import * as Foundation from '@company/foundation';

// Used as: <MUI.Button>, <Foundation.Card>
```

**Detection:**
- Pattern name: `Namespace Imports`
- Tracks: Namespace name, source package, line number
- Use case: Common when importing entire libraries or avoiding name conflicts

### Aliased Imports

Detects components imported with aliases.

**Code Example:**
```typescript
import { Button as MUIButton } from '@mui/material';
import { Card as DesignCard } from '@company/design-system';
import { TextField as Input } from '@mui/material';
```

**Detection:**
- Pattern name: `Aliased Imports`
- Tracks: Original name, alias, source package, line number
- Use case: Avoiding name conflicts or improving code clarity

## JSX Usage Patterns

### JSX Element Usage

Detects actual usage of components in JSX.

**Code Example:**
```tsx
function MyComponent() {
  return (
    <div>
      <Button variant="primary">Click me</Button>
      <Card>
        <Typography>Hello World</Typography>
      </Card>
    </div>
  );
}
```

**Detection:**
- Pattern name: `JSX Usage`
- Tracks: Component name, props, line number, usage context
- Use case: Identifies where and how components are actually rendered

**Advanced JSX Detection:**
```tsx
// Namespace usage
<Foundation.Button />

// Nested components
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
</Card>

// Self-closing tags
<Input />
<Avatar />
```

## Variable and Assignment Patterns

### Variable Assignments

Detects components assigned to variables.

**Code Example:**
```typescript
const PrimaryButton = Button;
const MyCard = Card;
const StyledInput = styled(TextField);
```

**Detection:**
- Pattern name: `Variable Assignments`
- Tracks: Variable name, assigned component, line number
- Use case: Component aliases, styled-components, component composition

### Destructured Usage

Detects components destructured from objects or modules.

**Code Example:**
```typescript
import * as Foundation from '@company/foundation';

const { Button, Card, Input } = Foundation;
const { Typography } = Components;
```

**Detection:**
- Pattern name: `Destructured Usage`
- Tracks: Property name, source object, line number
- Use case: Extracting components from namespace imports or component libraries

## Conditional Patterns

### Conditional (Ternary) Usage

Detects components used in conditional expressions.

**Code Example:**
```tsx
function MyComponent({ isPrimary }) {
  // Component selection based on condition
  const ButtonComponent = isPrimary ? PrimaryButton : SecondaryButton;
  
  return (
    <div>
      {isLoading ? <Spinner /> : <Content />}
    </div>
  );
}
```

**Detection:**
- Pattern name: `Conditional Usage`
- Tracks: Both conditional branches, line number
- Use case: Dynamic component selection, conditional rendering patterns

## Collection Patterns

### Array Mappings

Detects components stored in arrays.

**Code Example:**
```typescript
const components = [Button, Card, Input, TextField];
const layouts = [HeaderLayout, FooterLayout, SidebarLayout];

// Often used with dynamic rendering
const Component = components[index];
```

**Detection:**
- Pattern name: `Array Mappings`
- Tracks: All components in array, line number
- Use case: Dynamic component rendering, component registries

### Object Mappings

Detects components mapped in objects.

**Code Example:**
```typescript
const componentMap = {
  button: Button,
  card: Card,
  input: Input,
  text: Typography
};

const iconMap = {
  user: UserIcon,
  settings: SettingsIcon,
  home: HomeIcon
};

// Used as: componentMap[type]
```

**Detection:**
- Pattern name: `Object Mappings`
- Tracks: Key-value pairs, component names, line number
- Use case: Component registries, dynamic rendering based on keys, icon maps

## Lazy and Dynamic Patterns

### Lazy Imports (React.lazy)

Detects React lazy-loaded components.

**Code Example:**
```typescript
import { lazy } from 'react';

const LazyButton = lazy(() => import('@mui/material/Button'));
const LazyCard = lazy(() => import('@company/design-system/Card'));
const Dashboard = lazy(() => import('./Dashboard'));
```

**Detection:**
- Pattern name: `Lazy Imports`
- Tracks: Import source path, line number
- Use case: Code splitting, performance optimization

### Dynamic Imports

Detects dynamic import() calls.

**Code Example:**
```typescript
// Dynamic import
const loadComponent = async () => {
  const { Button } = await import('@mui/material');
  return Button;
};

// Conditional dynamic import
if (condition) {
  const module = await import('@company/design-system');
}
```

**Detection:**
- Pattern name: `Dynamic Imports`
- Tracks: Import source path, line number
- Use case: Runtime code loading, conditional module loading

## Advanced React Patterns

### Higher-Order Components (HOC)

Detects HOC patterns where components are wrapped by functions.

**Code Example:**
```typescript
const EnhancedButton = withStyles(Button);
const ConnectedCard = connect(mapStateToProps)(Card);
const TrackedComponent = withAnalytics(MyComponent);
```

**Detection:**
- Pattern name: `HOC Usage`
- Tracks: HOC function name, wrapped component, line number
- Use case: Component enhancement, cross-cutting concerns

### Memoized Components (React.memo)

Detects components wrapped with React.memo.

**Code Example:**
```typescript
import { memo } from 'react';

const MemoizedButton = memo(Button);
const MemoizedCard = memo(Card);

// With custom comparison
const MemoizedComponent = memo(ExpensiveComponent, customCompare);
```

**Detection:**
- Pattern name: `Memoized Components`
- Tracks: Memoized component name, line number
- Use case: Performance optimization, preventing unnecessary re-renders

### Forward Refs (React.forwardRef)

Detects components using forwardRef.

**Code Example:**
```typescript
import { forwardRef } from 'react';

const FancyButton = forwardRef((props, ref) => (
  <button ref={ref} {...props}>
    Click me
  </button>
));

const CustomInput = forwardRef<HTMLInputElement, Props>(
  (props, ref) => <input ref={ref} {...props} />
);
```

**Detection:**
- Pattern name: `Forward Refs`
- Tracks: Line number
- Use case: Ref forwarding, imperative component APIs

### Portals (ReactDOM.createPortal)

Detects React portal usage.

**Code Example:**
```typescript
import { createPortal } from 'react-dom';

function Modal({ children }) {
  return createPortal(
    <div className="modal">{children}</div>,
    document.body
  );
}

function Tooltip({ content }) {
  return createPortal(
    <TooltipContent>{content}</TooltipContent>,
    document.getElementById('tooltip-root')
  );
}
```

**Detection:**
- Pattern name: `Portal Usage`
- Tracks: Line number
- Use case: Rendering outside component hierarchy, modals, tooltips

## Pattern Statistics

When you run `📦 Packages

  No packages found

⚛️ Components

  No external components found

🔍 Code Patterns

┌──────────────────────┬───────┐
│ Pattern              │ Count │
├──────────────────────┼───────┤
│ Named Imports        │ 126   │
├──────────────────────┼───────┤
│ Default Imports      │ 49    │
├──────────────────────┼───────┤
│ JSX Usage            │ 45    │
├──────────────────────┼───────┤
│ Object Mappings      │ 19    │
├──────────────────────┼───────┤
│ Variable Assignments │ 9     │
├──────────────────────┼───────┤
│ Conditional Usage    │ 7     │
├──────────────────────┼───────┤
│ Namespace Imports    │ 4     │
├──────────────────────┼───────┤
│ Aliased Imports      │ 4     │
├──────────────────────┼───────┤
│ Destructuring        │ 2     │
├──────────────────────┼───────┤
│ Portal Usage         │ 1     │
└──────────────────────┴───────┘

Total: 266 patterns detected

📊 Summary

┌─────────────────────┬───────┐
│ Metric              │ Count │
├─────────────────────┼───────┤
│ Files Analyzed      │ 45    │
├─────────────────────┼───────┤
│ External Packages   │ 0     │
├─────────────────────┼───────┤
│ External Components │ 0     │
├─────────────────────┼───────┤
│ Total Usages        │ 0     │
└─────────────────────┴───────┘`, the pattern statistics show you:

### What Gets Counted

1. **Import Patterns**: Every import statement (default, named, namespace, aliased)
2. **JSX Usage**: Every JSX element rendered
3. **Variable Assignments**: Every component assigned to a variable
4. **Conditional Usage**: Every ternary expression with components
5. **Array Mappings**: Every array containing components
6. **Object Mappings**: Every object with component values
7. **Lazy/Dynamic Imports**: Every lazy() or dynamic import() call
8. **Advanced Patterns**: HOC, memo, forwardRef, portal usages

### Reading Pattern Reports

**Example Pattern Output:**
```
🔍 Code Patterns

┌──────────────────────┬───────┐
│ Pattern              │ Count │
├──────────────────────┼───────┤
│ JSX Usage            │ 145   │  ← Components actually rendered
├──────────────────────┼───────┤
│ Named Imports        │ 89    │  ← import { Component } from '...'
├──────────────────────┼───────┤
│ Default Imports      │ 67    │  ← import Component from '...'
├──────────────────────┼───────┤
│ Variable Assignments │ 23    │  ← const MyComp = Component
├──────────────────────┼───────┤
│ Object Mappings      │ 15    │  ← { key: Component }
├──────────────────────┼───────┤
│ Conditional Usage    │ 12    │  ← condition ? Comp1 : Comp2
├──────────────────────┼───────┤
│ Lazy Imports         │ 8     │  ← lazy(() => import('...'))
├──────────────────────┼───────┤
│ Array Mappings       │ 5     │  ← [Comp1, Comp2, Comp3]
├──────────────────────┼───────┤
│ Memoized Components  │ 3     │  ← memo(Component)
├──────────────────────┼───────┤
│ Portal Usage         │ 2     │  ← createPortal(...)
└──────────────────────┴───────┘
```

## Pattern Complexity Analysis

Certain patterns indicate higher code complexity:

### Simple Patterns (Low Complexity)
- Named Imports
- Default Imports
- JSX Usage

### Moderate Patterns (Medium Complexity)
- Variable Assignments
- Namespace Imports
- Aliased Imports
- Lazy Imports

### Complex Patterns (High Complexity)
- Conditional Usage
- Object Mappings
- Array Mappings
- HOC Usage
- Dynamic Imports

**Tip:** High counts of complex patterns may indicate opportunities for refactoring.

## Use Cases by Pattern

| Pattern | Primary Use Case |
|---------|-----------------|
| Named Imports | Standard component imports from libraries |
| Default Imports | Single component per file, default exports |
| Namespace Imports | Importing entire libraries, avoiding conflicts |
| Aliased Imports | Resolving naming conflicts |
| JSX Usage | Actual component rendering |
| Variable Assignments | Component aliasing, composition |
| Destructured Usage | Extracting from namespace imports |
| Conditional Usage | Dynamic component selection |
| Array Mappings | Component registries, dynamic lists |
| Object Mappings | Type-based component selection |
| Lazy Imports | Code splitting, performance |
| Dynamic Imports | Runtime module loading |
| HOC Usage | Component enhancement |
| Memo Usage | Performance optimization |
| ForwardRef Usage | Ref forwarding |
| Portal Usage | Rendering outside hierarchy |

## Best Practices

1. **Import Patterns**: Prefer named imports for tree-shaking benefits
2. **JSX Usage**: Keep component usage straightforward and readable
3. **Conditional Usage**: Consider component composition over ternaries
4. **Object/Array Mappings**: Document component registries clearly
5. **Lazy Imports**: Use for large components and route-level code splitting
6. **Memo Usage**: Only memoize when performance profiling shows benefits
7. **HOC Usage**: Consider hooks as a modern alternative

## Pattern Detection Limitations

hermex detects patterns through static analysis, which means:

- **Runtime dynamics**: Cannot detect components created at runtime
- **String-based imports**: Cannot analyze dynamic import paths using variables
- **Complex transformations**: May not detect heavily transformed code
- **Build-time code**: Analyzes source code, not compiled output

## For More Information

- [Main README](./README.md) - Getting started and overview
- [Examples Guide](./EXAMPLES.md) - Practical command examples
- [GitHub Repository](https://github.com/Gallevy/hermex.git) - Source code and issues

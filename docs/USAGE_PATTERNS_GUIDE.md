# React Component Usage Patterns Analysis Guide

This guide documents all the different ways React components can be used in applications, particularly when analyzing library usage patterns. Our SWC-based parser can detect and analyze these patterns to provide insights into how components are being utilized.

## 📋 Pattern Categories Overview

Our analyzer detects 16 major usage patterns, ranked by complexity:

| Pattern | Complexity | Description | Detection Difficulty |
|---------|------------|-------------|-------------------|
| Direct Import & Usage | 1/10 | Simple import and JSX usage | Easy |
| Named Import with Alias | 2/10 | Renamed imports | Easy |
| Namespace Import | 2/10 | Wildcard imports | Easy |
| Variable Assignment | 3/10 | Component stored in variables | Medium |
| Destructuring Usage | 4/10 | Components from object destructuring | Medium |
| Conditional Assignment | 4/10 | Conditional component selection | Medium |
| Memoized Components | 5/10 | React.memo wrapped components | Medium |
| Object Mapping | 5/10 | Components stored in objects | Hard |
| Array Mapping | 5/10 | Components in arrays | Hard |
| Lazy Loading | 6/10 | React.lazy components | Hard |
| Forward Ref | 6/10 | forwardRef wrapped components | Hard |
| Dynamic Mapping | 6/10 | Runtime component selection | Hard |
| Context Integration | 7/10 | Components from React context | Very Hard |
| Dynamic Import | 7/10 | Runtime dynamic imports | Very Hard |
| HOC Wrapping | 7/10 | Higher-order component patterns | Very Hard |
| Portal Usage | 8/10 | Components rendered in portals | Very Hard |

## 🔍 Detailed Pattern Analysis

### 1. Direct Import & Usage (Complexity: 1/10)
**Most common and straightforward pattern**

```tsx
// Default import
import Button from "@library/button";
<Button>Click me</Button>

// Named import
import { Input } from "@library/components";
<Input placeholder="Enter text" />
```

**Parser Detection:**
- ✅ Import declarations
- ✅ JSX element usage
- ✅ Props analysis

### 2. Named Import with Alias (Complexity: 2/10)
**Renaming components during import**

```tsx
import { Button as MyButton, Input as MyInput } from "@library/components";

<MyButton>Aliased Button</MyButton>
<MyInput placeholder="Aliased Input" />
```

**Parser Detection:**
- ✅ Aliased import specifiers
- ✅ Original → alias name mapping
- ✅ JSX usage tracking

### 3. Namespace Import (Complexity: 2/10)
**Importing entire library namespace**

```tsx
import * as Foundation from "@library/foundation";

<Foundation.Button>Namespace Button</Foundation.Button>
<Foundation.Input placeholder="Namespace Input" />
```

**Parser Detection:**
- ✅ Namespace import declarations
- ✅ Member expression JSX elements
- ✅ Property access tracking

### 4. Variable Assignment (Complexity: 3/10)
**Storing components in variables**

```tsx
import { Button } from "@library/components";

const MyButton = Button;
const ConditionalComponent = condition ? Button : Input;

<MyButton>Assigned Button</MyButton>
<ConditionalComponent>Dynamic</ConditionalComponent>
```

**Parser Detection:**
- ✅ Variable declarations
- ✅ Assignment expression analysis
- ✅ Conditional assignment detection

### 5. Destructuring Usage (Complexity: 4/10)
**Components extracted from objects**

```tsx
import * as Foundation from "@library/foundation";

const { Button, Input } = Foundation;
const { Button: DestructuredButton } = someObject;

<Button>Destructured</Button>
<DestructuredButton>Aliased Destructured</DestructuredButton>
```

**Parser Detection:**
- ✅ Object pattern destructuring
- ✅ Property name tracking
- ✅ Alias detection in destructuring

### 6. Conditional Assignment (Complexity: 4/10)
**Runtime component selection**

```tsx
// Ternary conditional
const Component = isActive ? Button : Input;

// Switch-based selection
const getComponent = (type: string) => {
  switch (type) {
    case 'button': return Button;
    case 'input': return Input;
    default: return Card;
  }
};

<Component>Conditional Component</Component>
```

**Parser Detection:**
- ✅ Conditional expressions
- ✅ Switch statement analysis
- ✅ Function return value tracking

### 7. Object Mapping (Complexity: 5/10)
**Components organized in lookup objects**

```tsx
const componentMap = {
  button: Button,
  input: Input,
  card: Card
};

// Dynamic rendering
Object.entries(componentMap).map(([key, Component]) => (
  <Component key={key}>Mapped {key}</Component>
));

// Type-based selection
const Component = componentMap[componentType];
<Component>Selected Component</Component>
```

**Parser Detection:**
- ✅ Object expression analysis
- ✅ Component property detection
- ✅ Dynamic access patterns

### 8. Array Mapping (Complexity: 5/10)
**Components stored in arrays**

```tsx
const components = [Button, Input, Card];

// Render all components
components.map((Component, index) => (
  <Component key={index}>Array Component {index}</Component>
));

// Select by index
const FirstComponent = components[0];
<FirstComponent>First Component</FirstComponent>
```

**Parser Detection:**
- ✅ Array expression analysis
- ✅ Component element detection
- ✅ Index-based access

### 9. Lazy Loading (Complexity: 6/10)
**Code-split components with React.lazy**

```tsx
const LazyButton = lazy(() => import("@library/button"));
const LazyModal = lazy(() => import("@library/modal"));

// Conditional lazy loading
const LazyConditional = lazy(() => {
  return condition 
    ? import("@library/button")
    : import("@library/input");
});

<Suspense fallback={<div>Loading...</div>}>
  <LazyButton>Lazy Button</LazyButton>
  <LazyModal>Lazy Modal</LazyModal>
</Suspense>
```

**Parser Detection:**
- ✅ React.lazy call expressions
- ✅ Dynamic import analysis
- ✅ Conditional lazy loading
- ✅ Suspense boundary detection

### 10. Dynamic Import (Complexity: 7/10)
**Runtime component loading**

```tsx
const [DynamicComponent, setDynamicComponent] = useState(null);

useEffect(() => {
  const loadComponent = async () => {
    const module = await import("@library/button");
    setDynamicComponent(() => module.default);
  };
  loadComponent();
}, []);

{DynamicComponent && <DynamicComponent>Dynamic Import</DynamicComponent>}
```

**Parser Detection:**
- ✅ Dynamic import() calls
- ✅ Async component loading
- ✅ Module.default access
- ✅ State-based component storage

### 11. HOC Wrapping (Complexity: 7/10)
**Higher-order component patterns**

```tsx
// HOC that wraps library components
function withLibraryComponent<T>(WrappedComponent: React.ComponentType<T>) {
  return (props: T) => (
    <Card title="HOC Wrapper">
      <WrappedComponent {...props} />
    </Card>
  );
}

const EnhancedButton = withLibraryComponent(Button);
const EnhancedInput = withLibraryComponent(Input);

<EnhancedButton>HOC Button</EnhancedButton>
<EnhancedInput placeholder="HOC Input" />
```

**Parser Detection:**
- ✅ HOC function patterns
- ✅ Component parameter detection
- ✅ Wrapper component analysis
- ✅ Enhanced component usage

### 12. Memoized Components (Complexity: 5/10)
**React.memo optimization**

```tsx
const MemoizedButton = memo(Button);
const MemoizedInput = memo(Input);

// With custom comparison
const MemoizedCard = memo(Card, (prevProps, nextProps) => {
  return prevProps.title === nextProps.title;
});

<MemoizedButton>Memoized Button</MemoizedButton>
<MemoizedInput placeholder="Memoized Input" />
```

**Parser Detection:**
- ✅ React.memo call expressions
- ✅ Component argument analysis
- ✅ Custom comparison functions
- ✅ Memoized component usage

### 13. Forward Ref (Complexity: 6/10)
**Ref forwarding patterns**

```tsx
const ForwardedButton = forwardRef<HTMLButtonElement, ComponentProps<typeof Button>>(
  (props, ref) => <Button ref={ref} {...props} />
);

const ForwardedInput = forwardRef<HTMLInputElement, ComponentProps<typeof Input>>(
  (props, ref) => <Input ref={ref} {...props} />
);

const buttonRef = useRef<HTMLButtonElement>(null);
<ForwardedButton ref={buttonRef}>Forwarded Button</ForwardedButton>
```

**Parser Detection:**
- ✅ forwardRef call expressions
- ✅ Ref parameter analysis
- ✅ Component wrapping detection
- ✅ Ref usage tracking

### 14. Context Integration (Complexity: 7/10)
**Components provided through React context**

```tsx
const ComponentContext = createContext({
  Button,
  Input,
  Card
});

function ContextProvider({ children }) {
  return (
    <ComponentContext.Provider value={{ Button, Input, Card }}>
      {children}
    </ComponentContext.Provider>
  );
}

function ContextConsumer() {
  const { Button: ContextButton, Input: ContextInput } = useContext(ComponentContext);
  
  return (
    <>
      <ContextButton>Context Button</ContextButton>
      <ContextInput placeholder="Context Input" />
    </>
  );
}
```

**Parser Detection:**
- ✅ createContext calls
- ✅ Provider value analysis
- ✅ useContext hook usage
- ✅ Context destructuring

### 15. Portal Usage (Complexity: 8/10)
**Components rendered outside normal tree**

```tsx
function PortalModal() {
  return createPortal(
    <Modal>
      <Button>Portal Button</Button>
      <Input placeholder="Portal Input" />
    </Modal>,
    document.body
  );
}

// Conditional portal
{showPortal && createPortal(
  <Card title="Portal Card">
    <Button>Portaled Button</Button>
  </Card>,
  portalContainer
)}
```

**Parser Detection:**
- ✅ createPortal call expressions
- ✅ Portal content analysis
- ✅ Portal target detection
- ✅ Nested component tracking

### 16. Complex Nesting Patterns (Complexity: 8/10)
**Multi-level object/function nesting**

```tsx
const complexStructure = {
  level1: {
    level2: {
      level3: {
        component: Button,
        props: { variant: 'primary' }
      }
    }
  }
};

const DeepComponent = complexStructure.level1.level2.level3.component;
<DeepComponent>Deeply Nested</DeepComponent>

// Function-based selection
const getNestedComponent = () => components.forms.inputs.text;
const NestedComponent = getNestedComponent();
<NestedComponent>Function Selected</NestedComponent>
```

**Parser Detection:**
- ✅ Deep object property access
- ✅ Multi-level member expressions
- ✅ Function return analysis
- ✅ Complex assignment tracking

## 🎯 Analysis Metrics

### Complexity Scoring
Our analyzer assigns complexity scores based on:

- **Detection Difficulty**: How hard it is to identify the pattern in AST
- **Runtime Analysis**: Whether the pattern requires runtime resolution
- **Maintenance Impact**: How the pattern affects code maintainability
- **Performance Impact**: Potential performance implications

### Usage Intensity Levels
- **Light** (0-10 points): Simple, direct patterns
- **Moderate** (11-30 points): Mixed patterns with some complexity
- **Heavy** (31-60 points): Multiple complex patterns
- **Intensive** (61+ points): Highly complex usage with many advanced patterns

## 🔧 Parser Implementation Details

### AST Node Types Analyzed
- `ImportDeclaration` - All import patterns
- `VariableDeclaration` - Variable assignments
- `CallExpression` - Function calls (lazy, memo, etc.)
- `JSXElement` - Component usage
- `MemberExpression` - Property access
- `ObjectExpression` - Object literals
- `ArrayExpression` - Array literals
- `ConditionalExpression` - Ternary operators

### Detection Strategies

#### Static Analysis (Easy to Detect)
- Direct imports and usage
- Variable assignments
- Object/array literals with components

#### Dynamic Analysis (Medium Difficulty)
- Conditional expressions
- Function parameters and returns
- Destructuring patterns

#### Runtime Pattern Detection (Hard to Detect)
- Dynamic imports
- HOC patterns
- Context usage
- Portal rendering

## 📊 Usage Reports

### Summary Metrics
- **Total Imports**: Count of all library imports
- **Components Found**: Unique components identified
- **Usage Patterns**: Total pattern instances detected
- **Complexity Level**: Overall complexity assessment

### Pattern-Specific Reports
- **Import Analysis**: Types and sources of imports
- **JSX Usage**: Component usage frequency and contexts
- **Advanced Patterns**: Complex usage detection
- **Recommendations**: Suggested improvements

## 🎨 Best Practices

### For Library Authors
1. **Document Common Patterns**: Show examples of different usage styles
2. **TypeScript Support**: Provide strong types for all patterns
3. **Performance Guidelines**: Recommend efficient usage patterns
4. **Migration Guides**: Help users adopt better patterns

### For Application Developers
1. **Consistency**: Stick to 2-3 primary patterns
2. **Type Safety**: Use TypeScript for complex patterns
3. **Performance**: Prefer static over dynamic patterns
4. **Maintainability**: Document complex usage patterns

### For Analysis
1. **Regular Scanning**: Monitor pattern evolution over time
2. **Team Standards**: Establish preferred patterns
3. **Refactoring Targets**: Identify overly complex usage
4. **Training Needs**: Understand team pattern knowledge

## 🚀 Getting Started

### Running the Analyzer

```bash
# Basic analysis
npm run parse

# Focused analysis with complexity scoring
npm run analyze

# Custom library analysis
node parser.js path/to/file.tsx @your-library/components

# Bulk analysis
node analyze-usage.js bulk "src/**/*.tsx" "components/**/*.jsx"
```

### Output Files
- **Basic Report**: `analysis-report-[timestamp].json`
- **Focused Report**: `focused-analysis-[timestamp].json`
- **Console Output**: Real-time analysis feedback

## 📈 Evolution Tracking

### Pattern Adoption Over Time
Track how usage patterns evolve in your codebase:
- New pattern introduction
- Pattern complexity changes  
- Migration from old to new patterns
- Team adoption rates

### Complexity Trends
Monitor if your codebase is becoming more or less complex:
- Average complexity score changes
- Pattern diversity metrics
- Hotspot identification
- Refactoring opportunities

This comprehensive analysis helps teams understand how their components are being used and identify opportunities for improvement, optimization, and better developer experience.
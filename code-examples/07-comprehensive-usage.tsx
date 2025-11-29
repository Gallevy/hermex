import React, {
  lazy,
  Suspense,
  useState,
  useEffect,
  memo,
  forwardRef,
  createContext,
  useContext,
} from "react";
import { createPortal } from "react-dom";

// Example library imports - these would be your actual library components
import Button from "@design-system/foundation/button";
import Input from "@design-system/foundation/input";
import Modal from "@design-system/foundation/modal";
import Card from "@design-system/foundation/card";
import { Icon, Typography, Layout } from "@design-system/foundation";
import * as Foundation from "@design-system/foundation";
import {
  Button as AliasedButton,
  Input as AliasedInput,
} from "@design-system/foundation";

// 1. DIRECT USAGE PATTERNS
function DirectUsage() {
  return (
    <div>
      {/* Basic usage */}
      <Button>Click me</Button>

      {/* With props */}
      <Button
        variant="primary"
        size="large"
        onClick={() => console.log("clicked")}
      >
        Primary Button
      </Button>

      {/* Self-closing */}
      <Input placeholder="Enter text" />

      {/* With children and props */}
      <Card title="My Card" variant="elevated">
        <Typography>Content inside card</Typography>
      </Card>
    </div>
  );
}

// 2. VARIABLE ASSIGNMENT PATTERNS
function VariableAssignments() {
  // Direct assignment
  const MyButton = Button;
  const MyInput = Input;

  // Conditional assignment
  const ConditionalComponent = true ? Button : Input;

  // From object destructuring
  const { Button: DestructuredButton, Input: DestructuredInput } = Foundation;

  // From array (less common but possible)
  const components = [Button, Input, Card];
  const FirstComponent = components[0];

  // Dynamic assignment
  const getComponent = (type: string) => {
    switch (type) {
      case "button":
        return Button;
      case "input":
        return Input;
      default:
        return Card;
    }
  };
  const DynamicComponent = getComponent("button");

  return (
    <div>
      <MyButton>Assigned Button</MyButton>
      <MyInput placeholder="Assigned Input" />
      <ConditionalComponent>Conditional</ConditionalComponent>
      <DestructuredButton>Destructured</DestructuredButton>
      <DestructuredInput placeholder="Destructured Input" />
      <FirstComponent>First from array</FirstComponent>
      <DynamicComponent>Dynamic Component</DynamicComponent>
    </div>
  );
}

// 3. OBJECT MAPPING PATTERNS
function ObjectMappingUsage() {
  // Component mapping object
  const componentMap = {
    button: Button,
    input: Input,
    card: Card,
    modal: Modal,
  };

  // Array of component configs
  const componentConfigs = [
    { type: "button", props: { children: "Button 1", variant: "primary" } },
    { type: "input", props: { placeholder: "Input 1" } },
    { type: "card", props: { title: "Card 1", children: "Card content" } },
  ];

  // Object with nested components
  const nestedComponents = {
    form: {
      button: Button,
      input: Input,
    },
    display: {
      card: Card,
      modal: Modal,
    },
  };

  return (
    <div>
      {/* Render from mapping */}
      {Object.entries(componentMap).map(([key, Component]) => (
        <Component key={key}>Mapped {key}</Component>
      ))}

      {/* Render from config array */}
      {componentConfigs.map((config, index) => {
        const Component =
          componentMap[config.type as keyof typeof componentMap];
        return <Component key={index} {...config.props} />;
      })}

      {/* Nested mapping */}
      {Object.entries(nestedComponents.form).map(([key, Component]) => (
        <Component key={key}>Nested {key}</Component>
      ))}
    </div>
  );
}

// 4. LAZY LOADING PATTERNS
const LazyButton = lazy(() => import("@design-system/foundation/button"));
const LazyModal = lazy(() => import("@design-system/foundation/modal"));

// Lazy with dynamic import
const LazyDynamic = lazy(() => {
  return import("@design-system/foundation/card");
});

// Lazy with conditional loading
const LazyConditional = lazy(() => {
  const condition = true;
  return condition
    ? import("@design-system/foundation/button")
    : import("@design-system/foundation/input");
});

function LazyUsagePatterns() {
  const [showLazy, setShowLazy] = useState(false);

  return (
    <div>
      <button onClick={() => setShowLazy(!showLazy)}>
        Toggle Lazy Components
      </button>

      {showLazy && (
        <Suspense fallback={<div>Loading...</div>}>
          <LazyButton>Lazy Button</LazyButton>
          <LazyModal>Lazy Modal</LazyModal>
          <LazyDynamic title="Lazy Card">Dynamic lazy content</LazyDynamic>
          <LazyConditional>Conditional Lazy</LazyConditional>
        </Suspense>
      )}
    </div>
  );
}

// 5. HIGHER-ORDER COMPONENT PATTERNS
function withLibraryComponent<T extends {}>(
  WrappedComponent: React.ComponentType<T>,
) {
  return (props: T) => (
    <Card title="HOC Wrapper">
      <WrappedComponent {...props} />
    </Card>
  );
}

const EnhancedButton = withLibraryComponent(Button);
const EnhancedInput = withLibraryComponent(Input);

// 6. RENDER PROP PATTERNS
function RenderPropPattern() {
  const renderButton = (text: string) => <Button>{text}</Button>;
  const renderInput = (placeholder: string) => (
    <Input placeholder={placeholder} />
  );

  return (
    <div>
      {renderButton("Render prop button")}
      {renderInput("Render prop input")}
    </div>
  );
}

// 7. CONTEXT PATTERNS
const ComponentContext = createContext<{
  Button: typeof Button;
  Input: typeof Input;
  Card: typeof Card;
}>({
  Button,
  Input,
  Card,
});

function ContextProvider({ children }: { children: React.ReactNode }) {
  return (
    <ComponentContext.Provider value={{ Button, Input, Card }}>
      {children}
    </ComponentContext.Provider>
  );
}

function ContextConsumer() {
  const {
    Button: ContextButton,
    Input: ContextInput,
    Card: ContextCard,
  } = useContext(ComponentContext);

  return (
    <div>
      <ContextButton>Context Button</ContextButton>
      <ContextInput placeholder="Context Input" />
      <ContextCard title="Context Card">Context content</ContextCard>
    </div>
  );
}

// 8. FORWARDED REF PATTERNS
const ForwardedButton = forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>((props, ref) => <Button ref={ref} {...props} />);

const ForwardedInput = forwardRef<
  HTMLInputElement,
  React.ComponentProps<typeof Input>
>((props, ref) => <Input ref={ref} {...props} />);

// 9. MEMOIZED PATTERNS
const MemoizedButton = memo(Button);
const MemoizedInput = memo(Input);
const MemoizedCard = memo(Card);

// 10. CONDITIONAL RENDERING PATTERNS
function ConditionalPatterns() {
  const [condition, setCondition] = useState(true);
  const [componentType, setComponentType] = useState<
    "button" | "input" | "card"
  >("button");

  // Ternary conditional
  const ConditionalComponent = condition ? Button : Input;

  // Switch-based conditional
  const getSwitchComponent = () => {
    switch (componentType) {
      case "button":
        return Button;
      case "input":
        return Input;
      case "card":
        return Card;
      default:
        return Button;
    }
  };

  const SwitchComponent = getSwitchComponent();

  return (
    <div>
      <button onClick={() => setCondition(!condition)}>Toggle Condition</button>
      <button
        onClick={() =>
          setComponentType(
            componentType === "button"
              ? "input"
              : componentType === "input"
                ? "card"
                : "button",
          )
        }
      >
        Change Component Type
      </button>

      {/* Conditional rendering */}
      {condition && <Button>Conditional Button</Button>}
      {condition ? (
        <Button>Ternary Button</Button>
      ) : (
        <Input placeholder="Ternary Input" />
      )}

      <ConditionalComponent>Dynamic Conditional</ConditionalComponent>
      <SwitchComponent>Switch Component</SwitchComponent>
    </div>
  );
}

// 11. ARRAY ITERATION PATTERNS
function ArrayIterationPatterns() {
  const buttonTexts = ["First", "Second", "Third"];
  const inputPlaceholders = ["Name", "Email", "Phone"];

  const mixedComponents = [
    { Component: Button, props: { children: "Mixed Button" } },
    { Component: Input, props: { placeholder: "Mixed Input" } },
    {
      Component: Card,
      props: { title: "Mixed Card", children: "Mixed content" },
    },
  ];

  return (
    <div>
      {/* Simple array mapping */}
      {buttonTexts.map((text, index) => (
        <Button key={index}>{text}</Button>
      ))}

      {inputPlaceholders.map((placeholder, index) => (
        <Input key={index} placeholder={placeholder} />
      ))}

      {/* Mixed component array */}
      {mixedComponents.map(({ Component, props }, index) => (
        <Component key={index} {...props} />
      ))}
    </div>
  );
}

// 12. PORTAL PATTERNS
function PortalPatterns() {
  const [showPortal, setShowPortal] = useState(false);

  return (
    <div>
      <button onClick={() => setShowPortal(!showPortal)}>Toggle Portal</button>

      {showPortal &&
        createPortal(
          <Modal>
            <Button>Portal Button</Button>
            <Input placeholder="Portal Input" />
          </Modal>,
          document.body,
        )}
    </div>
  );
}

// 13. DYNAMIC IMPORT PATTERNS
function DynamicImportPatterns() {
  const [DynamicComponent, setDynamicComponent] =
    useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    // Dynamic import based on condition
    const loadComponent = async () => {
      const condition = Math.random() > 0.5;
      if (condition) {
        const module = await import("@design-system/foundation/button");
        setDynamicComponent(() => module.default);
      } else {
        const module = await import("@design-system/foundation/input");
        setDynamicComponent(() => module.default);
      }
    };

    loadComponent();
  }, []);

  return (
    <div>
      {DynamicComponent && <DynamicComponent>Dynamic Import</DynamicComponent>}
    </div>
  );
}

// 14. NAMESPACE PATTERNS
function NamespacePatterns() {
  // Using namespace imports
  const FoundationButton = Foundation.Button;
  const FoundationInput = Foundation.Input;

  return (
    <div>
      <Foundation.Button>Namespace Button</Foundation.Button>
      <Foundation.Input placeholder="Namespace Input" />
      <Foundation.Card title="Namespace Card">
        Namespace content
      </Foundation.Card>

      <FoundationButton>Assigned Namespace Button</FoundationButton>
      <FoundationInput placeholder="Assigned Namespace Input" />
    </div>
  );
}

// 15. ALIASED PATTERNS
function AliasedPatterns() {
  return (
    <div>
      <AliasedButton>Aliased Button</AliasedButton>
      <AliasedInput placeholder="Aliased Input" />
    </div>
  );
}

// Main App component demonstrating all patterns
export default function App() {
  return (
    <ContextProvider>
      <div>
        <h1>Comprehensive Component Usage Patterns</h1>

        <section>
          <h2>1. Direct Usage</h2>
          <DirectUsage />
        </section>

        <section>
          <h2>2. Variable Assignments</h2>
          <VariableAssignments />
        </section>

        <section>
          <h2>3. Object Mapping</h2>
          <ObjectMappingUsage />
        </section>

        <section>
          <h2>4. Lazy Loading</h2>
          <LazyUsagePatterns />
        </section>

        <section>
          <h2>5. HOC Patterns</h2>
          <EnhancedButton>HOC Button</EnhancedButton>
          <EnhancedInput placeholder="HOC Input" />
        </section>

        <section>
          <h2>6. Render Props</h2>
          <RenderPropPattern />
        </section>

        <section>
          <h2>7. Context Usage</h2>
          <ContextConsumer />
        </section>

        <section>
          <h2>8. Forwarded Refs</h2>
          <ForwardedButton>Forwarded Button</ForwardedButton>
          <ForwardedInput placeholder="Forwarded Input" />
        </section>

        <section>
          <h2>9. Memoized Components</h2>
          <MemoizedButton>Memoized Button</MemoizedButton>
          <MemoizedInput placeholder="Memoized Input" />
          <MemoizedCard title="Memoized Card">Memoized content</MemoizedCard>
        </section>

        <section>
          <h2>10. Conditional Rendering</h2>
          <ConditionalPatterns />
        </section>

        <section>
          <h2>11. Array Iteration</h2>
          <ArrayIterationPatterns />
        </section>

        <section>
          <h2>12. Portal Patterns</h2>
          <PortalPatterns />
        </section>

        <section>
          <h2>13. Dynamic Imports</h2>
          <DynamicImportPatterns />
        </section>

        <section>
          <h2>14. Namespace Patterns</h2>
          <NamespacePatterns />
        </section>

        <section>
          <h2>15. Aliased Patterns</h2>
          <AliasedPatterns />
        </section>
      </div>
    </ContextProvider>
  );
}

// 16. FUNCTION COMPONENT PATTERNS WITH LIBRARY COMPONENTS
const FunctionComponentWithProps = ({
  title,
  variant,
}: {
  title: string;
  variant: string;
}) => (
  <Card title={title}>
    <Button variant={variant}>{title} Button</Button>
  </Card>
);

// 17. CLASS COMPONENT PATTERNS (less common but still possible)
class ClassComponentWithLibrary extends React.Component<{ text: string }> {
  render() {
    const { text } = this.props;
    return (
      <div>
        <Button>{text}</Button>
        <Input placeholder={text} />
      </div>
    );
  }
}

// 18. COMPLEX NESTING PATTERNS
function ComplexNestingPatterns() {
  const nestedStructure = {
    level1: {
      level2: {
        level3: {
          component: Button,
          props: { children: "Deeply Nested" },
        },
      },
    },
  };

  const DeepComponent = nestedStructure.level1.level2.level3.component;

  return <DeepComponent {...nestedStructure.level1.level2.level3.props} />;
}

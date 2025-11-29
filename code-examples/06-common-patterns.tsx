import React, { lazy, Suspense, useState, useCallback } from "react";

// 1. Direct imports - most common pattern
import Button from "@design-system/foundation/button";
import Card from "@design-system/foundation/card";

// 2. Named imports with and without aliases
import { Input, Modal } from "@design-system/foundation";
import { Typography as Text, Icon as UIIcon } from "@design-system/foundation";

// 3. Namespace import
import * as Foundation from "@design-system/foundation";

// 4. Lazy loading
const LazyChart = lazy(() => import("@design-system/foundation/chart"));

// 5. Simple variable assignments
const PrimaryButton = Button;
const MainCard = Card;

// 6. Object mapping for component selection
const componentMap = {
  button: Button,
  input: Input,
  card: Card,
  text: Text,
};

// 7. Conditional component selection
function getComponentByType(type: "primary" | "secondary") {
  return type === "primary" ? Button : Input;
}

// Basic usage examples
function DirectUsageExample() {
  return (
    <div>
      <h2>Direct Usage Patterns</h2>

      {/* Simple direct usage */}
      <Button>Click Me</Button>
      <Button variant="primary" size="large">
        Primary Button
      </Button>

      {/* Self-closing components */}
      <Input placeholder="Enter your name" />
      <Input type="email" placeholder="Email" />

      {/* Components with children */}
      <Card title="User Profile">
        <Text>Welcome to your profile</Text>
        <Button>Edit Profile</Button>
      </Card>

      {/* Aliased components */}
      <Text variant="heading">This is aliased Typography</Text>
      <UIIcon name="home" size={24} />
    </div>
  );
}

// Variable assignment patterns
function VariableAssignmentExample() {
  // Simple assignment
  const SaveButton = Button;
  const UserCard = Card;

  // Conditional assignment
  const [isEditing, setIsEditing] = useState(false);
  const ActionComponent = isEditing ? Input : Text;

  return (
    <div>
      <h2>Variable Assignment Patterns</h2>

      <SaveButton onClick={() => console.log("Saved!")}>
        Save Changes
      </SaveButton>

      <UserCard title="Dynamic Card">
        <ActionComponent>
          {isEditing ? "Edit mode active" : "View mode"}
        </ActionComponent>

        <Button onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? "Cancel" : "Edit"}
        </Button>
      </UserCard>
    </div>
  );
}

// Namespace usage patterns
function NamespaceUsageExample() {
  return (
    <div>
      <h2>Namespace Usage Patterns</h2>

      {/* Direct namespace access */}
      <Foundation.Button variant="secondary">
        Namespace Button
      </Foundation.Button>

      <Foundation.Card title="Namespace Card">
        <Foundation.Typography>
          Content using namespace imports
        </Foundation.Typography>
      </Foundation.Card>

      {/* Mixed usage */}
      <Foundation.Input placeholder="Namespace input" />
    </div>
  );
}

// Object mapping patterns
function ObjectMappingExample() {
  const [selectedType, setSelectedType] =
    useState<keyof typeof componentMap>("button");
  const SelectedComponent = componentMap[selectedType];

  const componentConfigs = [
    { type: "button" as const, props: { children: "Mapped Button" } },
    { type: "input" as const, props: { placeholder: "Mapped Input" } },
    { type: "text" as const, props: { children: "Mapped Text" } },
  ];

  return (
    <div>
      <h2>Object Mapping Patterns</h2>

      {/* Dynamic component selection */}
      <div>
        <select
          value={selectedType}
          onChange={(e) =>
            setSelectedType(e.target.value as keyof typeof componentMap)
          }
        >
          <option value="button">Button</option>
          <option value="input">Input</option>
          <option value="card">Card</option>
          <option value="text">Text</option>
        </select>

        <SelectedComponent>Dynamic {selectedType}</SelectedComponent>
      </div>

      {/* Render from config array */}
      <div>
        {componentConfigs.map((config, index) => {
          const Component = componentMap[config.type];
          return <Component key={index} {...config.props} />;
        })}
      </div>
    </div>
  );
}

// Conditional patterns
function ConditionalPatternsExample() {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [componentType, setComponentType] = useState<"primary" | "secondary">(
    "primary",
  );

  // Ternary conditional
  const ModeComponent = mode === "edit" ? Input : Text;

  // Function-based conditional
  const TypeComponent = getComponentByType(componentType);

  return (
    <div>
      <h2>Conditional Patterns</h2>

      <div>
        <Button onClick={() => setMode(mode === "view" ? "edit" : "view")}>
          Switch to {mode === "view" ? "Edit" : "View"} Mode
        </Button>

        <Button
          onClick={() =>
            setComponentType(
              componentType === "primary" ? "secondary" : "primary",
            )
          }
        >
          Switch to {componentType === "primary" ? "Secondary" : "Primary"}
        </Button>
      </div>

      {/* Conditional rendering */}
      {mode === "edit" && <Button>Save</Button>}
      {mode === "view" && <Button>Edit</Button>}

      {/* Dynamic components */}
      <ModeComponent>Current mode: {mode}</ModeComponent>

      <TypeComponent>Current type: {componentType}</TypeComponent>
    </div>
  );
}

// Lazy loading patterns
function LazyLoadingExample() {
  const [showChart, setShowChart] = useState(false);

  return (
    <div>
      <h2>Lazy Loading Patterns</h2>

      <Button onClick={() => setShowChart(!showChart)}>
        {showChart ? "Hide" : "Show"} Chart
      </Button>

      {showChart && (
        <Card title="Analytics">
          <Suspense fallback={<Text>Loading chart...</Text>}>
            <LazyChart data={[1, 2, 3, 4, 5]} />
          </Suspense>
        </Card>
      )}
    </div>
  );
}

// Array patterns
function ArrayPatternsExample() {
  const buttons = ["Save", "Cancel", "Delete"];
  const inputs = [
    { placeholder: "First Name", type: "text" },
    { placeholder: "Last Name", type: "text" },
    { placeholder: "Email", type: "email" },
  ];

  const componentList = [
    {
      Component: Button,
      props: { children: "Array Button", variant: "primary" },
    },
    { Component: Input, props: { placeholder: "Array Input" } },
    { Component: Text, props: { children: "Array Text" } },
  ];

  return (
    <div>
      <h2>Array Patterns</h2>

      {/* Simple array mapping */}
      <div>
        {buttons.map((label, index) => (
          <Button key={index}>{label}</Button>
        ))}
      </div>

      {/* Object array mapping */}
      <div>
        {inputs.map((inputProps, index) => (
          <Input key={index} {...inputProps} />
        ))}
      </div>

      {/* Mixed component array */}
      <div>
        {componentList.map(({ Component, props }, index) => (
          <Component key={index} {...props} />
        ))}
      </div>
    </div>
  );
}

// Render prop pattern
function RenderPropExample() {
  const renderFormField = (
    label: string,
    type: "input" | "button" = "input",
  ) => {
    return type === "input" ? (
      <Input placeholder={label} />
    ) : (
      <Button>{label}</Button>
    );
  };

  return (
    <div>
      <h2>Render Prop Patterns</h2>

      <Card title="User Form">
        {renderFormField("Username")}
        {renderFormField("Password")}
        {renderFormField("Submit", "button")}
      </Card>
    </div>
  );
}

// Main app component
export default function CommonPatternsApp() {
  const [activeExample, setActiveExample] = useState("direct");

  const examples = {
    direct: <DirectUsageExample />,
    variables: <VariableAssignmentExample />,
    namespace: <NamespaceUsageExample />,
    mapping: <ObjectMappingExample />,
    conditional: <ConditionalPatternsExample />,
    lazy: <LazyLoadingExample />,
    arrays: <ArrayPatternsExample />,
    renderProp: <RenderPropExample />,
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Common React Component Usage Patterns</h1>

      {/* Navigation */}
      <div style={{ marginBottom: "20px" }}>
        <Text variant="subtitle">Select a pattern to explore:</Text>
        <div>
          {Object.keys(examples).map((key) => (
            <Button
              key={key}
              variant={activeExample === key ? "primary" : "secondary"}
              onClick={() => setActiveExample(key)}
              style={{ margin: "5px" }}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Active example */}
      <div
        style={{
          border: "1px solid #ccc",
          padding: "20px",
          borderRadius: "8px",
        }}
      >
        {examples[activeExample as keyof typeof examples]}
      </div>
    </div>
  );
}

// Additional patterns for analysis
export const AdvancedPatterns = {
  // Component as prop
  withComponent: (Component: React.ComponentType<any>) => (
    <Card>
      <Component>Passed as prop</Component>
    </Card>
  ),

  // Nested object access
  nestedAccess: {
    form: {
      button: Button,
      input: Input,
    },
    display: {
      card: Card,
      text: Text,
    },
  },
};

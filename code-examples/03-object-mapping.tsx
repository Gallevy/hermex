import React, { useState } from "react";

// Example library imports
import Button from "@design-system/foundation/button";
import Input from "@design-system/foundation/input";
import Card from "@design-system/foundation/card";
import Modal from "@design-system/foundation/modal";
import { Typography } from "@design-system/foundation";

/**
 * PATTERN 3: OBJECT MAPPING
 * Complexity: 5/10
 *
 * Components are stored in objects and accessed dynamically.
 * This pattern is useful for component registries, dynamic rendering,
 * and configuration-driven UIs.
 */

export function ObjectMappingExample() {
  // Simple component mapping
  const componentMap = {
    button: Button,
    input: Input,
    card: Card,
    modal: Modal,
    typography: Typography,
  };

  // Component mapping with metadata
  const componentRegistry = {
    button: {
      component: Button,
      label: "Button",
      category: "action",
    },
    input: {
      component: Input,
      label: "Input Field",
      category: "form",
    },
    card: {
      component: Card,
      label: "Card",
      category: "layout",
    },
  };

  // Nested component mapping
  const nestedComponents = {
    form: {
      button: Button,
      input: Input,
    },
    display: {
      card: Card,
      modal: Modal,
      typography: Typography,
    },
  };

  // Component config array for dynamic rendering
  const componentConfigs = [
    {
      type: "button",
      props: { variant: "primary", children: "First Button" },
    },
    {
      type: "input",
      props: { placeholder: "First Input" },
    },
    {
      type: "card",
      props: { title: "First Card", children: "Card content here" },
    },
  ];

  // State for dynamic component selection
  const [selectedType, setSelectedType] =
    useState<keyof typeof componentMap>("button");
  const SelectedComponent = componentMap[selectedType];

  return (
    <div>
      <h2>Object Mapping Patterns</h2>

      {/* Render all components from map */}
      <section>
        <h3>Simple Object Mapping</h3>
        {Object.entries(componentMap).map(([key, Component]) => {
          if (key === "button") {
            return (
              <Component key={key} variant="primary">
                Mapped {key}
              </Component>
            );
          } else if (key === "input") {
            return <Component key={key} placeholder={`Mapped ${key}`} />;
          } else if (key === "typography") {
            return <Component key={key}>Mapped {key}</Component>;
          } else {
            return (
              <Component key={key} title={`Mapped ${key}`}>
                Content
              </Component>
            );
          }
        })}
      </section>

      {/* Render from registry with metadata */}
      <section>
        <h3>Component Registry</h3>
        {Object.entries(componentRegistry).map(([key, config]) => {
          const Component = config.component;
          return (
            <div key={key}>
              <label>
                {config.label} ({config.category})
              </label>
              {key === "button" && (
                <Component>Registry {config.label}</Component>
              )}
              {key === "input" && (
                <Component placeholder={`Enter ${config.label}`} />
              )}
              {key === "card" && (
                <Component title={config.label}>
                  This is a {config.label} from registry
                </Component>
              )}
            </div>
          );
        })}
      </section>

      {/* Nested mapping */}
      <section>
        <h3>Nested Component Mapping</h3>
        <div>
          <h4>Form Components</h4>
          {Object.entries(nestedComponents.form).map(([key, Component]) => {
            if (key === "button") {
              return <Component key={key}>Nested Form {key}</Component>;
            }
            return <Component key={key} placeholder={`Nested form ${key}`} />;
          })}
        </div>
        <div>
          <h4>Display Components</h4>
          {Object.entries(nestedComponents.display).map(([key, Component]) => {
            if (key === "typography") {
              return <Component key={key}>Nested Display {key}</Component>;
            }
            return (
              <Component key={key} title={`Nested ${key}`}>
                Content
              </Component>
            );
          })}
        </div>
      </section>

      {/* Config-driven rendering */}
      <section>
        <h3>Configuration-Driven Rendering</h3>
        {componentConfigs.map((config, index) => {
          const Component =
            componentMap[config.type as keyof typeof componentMap];
          return <Component key={index} {...config.props} />;
        })}
      </section>

      {/* Dynamic component selection */}
      <section>
        <h3>Dynamic Component Selection</h3>
        <select
          value={selectedType}
          onChange={(e) =>
            setSelectedType(e.target.value as keyof typeof componentMap)
          }
        >
          <option value="button">Button</option>
          <option value="input">Input</option>
          <option value="card">Card</option>
          <option value="modal">Modal</option>
          <option value="typography">Typography</option>
        </select>

        <div style={{ marginTop: "10px" }}>
          {selectedType === "button" && (
            <SelectedComponent>Dynamic Button</SelectedComponent>
          )}
          {selectedType === "input" && (
            <SelectedComponent placeholder="Dynamic Input" />
          )}
          {selectedType === "card" && (
            <SelectedComponent title="Dynamic Card">
              This card was selected dynamically
            </SelectedComponent>
          )}
          {selectedType === "typography" && (
            <SelectedComponent>Dynamic Typography</SelectedComponent>
          )}
        </div>
      </section>

      {/* Complex object with functions */}
      <section>
        <h3>Advanced: Object with Render Functions</h3>
        {(() => {
          const advancedMap = {
            renderButton: () => (
              <Button variant="primary">Function Rendered Button</Button>
            ),
            renderInput: () => <Input placeholder="Function Rendered Input" />,
            renderCard: () => (
              <Card title="Function Rendered">
                This card was rendered from a function in an object
              </Card>
            ),
          };

          return (
            <div>
              {advancedMap.renderButton()}
              {advancedMap.renderInput()}
              {advancedMap.renderCard()}
            </div>
          );
        })()}
      </section>
    </div>
  );
}

export default ObjectMappingExample;

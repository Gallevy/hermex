import React from 'react';

// Example library imports - Namespace patterns
import * as Foundation from '@design-system/foundation';
import * as FoundationComponents from '@design-system/foundation';

/**
 * PATTERN 5: NAMESPACE IMPORTS
 * Complexity: 2/10
 *
 * Importing entire module namespace with wildcard (*).
 * This pattern provides access to all exports through a namespace object.
 */

export function NamespaceImportsExample() {
  // Accessing components through namespace
  const ButtonComponent = Foundation.Button;
  const InputComponent = Foundation.Input;

  // Destructuring from namespace
  const { Card, Typography } = Foundation;

  return (
    <div>
      <h2>Namespace Import Patterns</h2>

      {/* Direct namespace access */}
      <section>
        <h3>Direct Namespace Access</h3>
        <Foundation.Button variant="primary">
          Namespace Button
        </Foundation.Button>

        <Foundation.Input placeholder="Namespace Input" />

        <Foundation.Card title="Namespace Card">
          <Foundation.Typography>
            All components accessed via namespace
          </Foundation.Typography>
        </Foundation.Card>
      </section>

      {/* Assigned from namespace */}
      <section>
        <h3>Assigned from Namespace</h3>
        <ButtonComponent variant="secondary">Assigned Button</ButtonComponent>

        <InputComponent placeholder="Assigned Input" />
      </section>

      {/* Destructured from namespace */}
      <section>
        <h3>Destructured from Namespace</h3>
        <Card title="Destructured Card">
          <Typography>Components destructured from namespace</Typography>
        </Card>
      </section>

      {/* Multiple namespace imports */}
      <section>
        <h3>Multiple Namespace Imports</h3>
        <FoundationComponents.Button variant="primary">
          From Second Namespace
        </FoundationComponents.Button>

        <Foundation.Button variant="secondary">
          From First Namespace
        </Foundation.Button>
      </section>

      {/* Namespace with computed access */}
      <section>
        <h3>Dynamic Namespace Access</h3>
        {['Button', 'Input', 'Card'].map((componentName, index) => {
          const Component =
            Foundation[componentName as keyof typeof Foundation];
          if (!Component) return null;

          if (componentName === 'Button') {
            return <Component key={index}>Dynamic {componentName}</Component>;
          } else if (componentName === 'Input') {
            return (
              <Component key={index} placeholder={`Dynamic ${componentName}`} />
            );
          } else {
            return (
              <Component key={index} title={`Dynamic ${componentName}`}>
                Content for {componentName}
              </Component>
            );
          }
        })}
      </section>

      {/* Namespace in object mapping */}
      <section>
        <h3>Namespace in Object Mapping</h3>
        {(() => {
          const componentMap = {
            button: Foundation.Button,
            input: Foundation.Input,
            card: Foundation.Card,
          };

          return Object.entries(componentMap).map(([key, Component]) => {
            if (key === 'button') {
              return <Component key={key}>Mapped from Namespace</Component>;
            } else if (key === 'input') {
              return (
                <Component key={key} placeholder="Mapped from namespace" />
              );
            } else {
              return (
                <Component key={key} title="Mapped Card">
                  From namespace mapping
                </Component>
              );
            }
          });
        })()}
      </section>

      {/* Nested namespace access */}
      <section>
        <h3>Nested Namespace Usage</h3>
        <Foundation.Card title="Outer Card">
          <Foundation.Typography variant="h3">
            Nested Title
          </Foundation.Typography>
          <Foundation.Button onClick={() => alert('Nested click')}>
            Nested Button
          </Foundation.Button>
          <Foundation.Input placeholder="Nested input" />
        </Foundation.Card>
      </section>
    </div>
  );
}

export default NamespaceImportsExample;

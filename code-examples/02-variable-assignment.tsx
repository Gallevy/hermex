import React, { useState } from 'react';

// Example library imports
import Button from '@design-system/foundation/button';
import Input from '@design-system/foundation/input';
import Card from '@design-system/foundation/card';
import Modal from '@design-system/foundation/modal';

/**
 * PATTERN 2: VARIABLE ASSIGNMENT
 * Complexity: 3/10
 *
 * Components are assigned to variables before being used.
 * This pattern is useful for aliasing, conditional selection, or
 * creating component variants.
 */

export function VariableAssignmentExample() {
  // Simple assignment - aliasing components
  const PrimaryButton = Button;
  const UserInput = Input;
  const InfoCard = Card;

  // Conditional assignment based on state
  const [isEditing, setIsEditing] = useState(false);
  const ActionComponent = isEditing ? Input : Button;

  // Conditional assignment based on props
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');
  const AdminButton = userRole === 'admin' ? Button : null;

  // Assignment from array
  const components = [Button, Input, Card];
  const FirstComponent = components[0];
  const SecondComponent = components[1];

  // Assignment with multiple conditions
  const getComponent = () => {
    if (isEditing) return Input;
    if (userRole === 'admin') return Button;
    return Card;
  };
  const DynamicComponent = getComponent();

  return (
    <div>
      <h2>Variable Assignment Patterns</h2>

      {/* Using aliased components */}
      <section>
        <h3>Simple Aliases</h3>
        <PrimaryButton variant="primary">Primary Action</PrimaryButton>
        <UserInput placeholder="Enter username" />
        <InfoCard title="Information">
          This card uses an aliased component
        </InfoCard>
      </section>

      {/* Using conditionally assigned components */}
      <section>
        <h3>Conditional Components</h3>
        <button onClick={() => setIsEditing(!isEditing)}>
          Toggle Editing ({isEditing ? 'ON' : 'OFF'})
        </button>

        <ActionComponent>{isEditing ? 'Save Changes' : 'Edit'}</ActionComponent>

        {AdminButton && (
          <AdminButton variant="danger">Admin Only Button</AdminButton>
        )}
      </section>

      {/* Using components from array */}
      <section>
        <h3>Array-Based Assignment</h3>
        <FirstComponent variant="primary">First from Array</FirstComponent>
        <SecondComponent placeholder="Second from Array" />
      </section>

      {/* Using dynamically assigned components */}
      <section>
        <h3>Dynamic Assignment</h3>
        <button
          onClick={() => setUserRole(userRole === 'admin' ? 'user' : 'admin')}
        >
          Toggle Role: {userRole}
        </button>

        {DynamicComponent && (
          <DynamicComponent>Dynamic Component Based on State</DynamicComponent>
        )}
      </section>
    </div>
  );
}

export default VariableAssignmentExample;

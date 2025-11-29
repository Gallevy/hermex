import React, { lazy, useState, useContext, createContext } from 'react';

// === Material-UI Examples ===
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { Card, CardContent, Typography } from '@mui/material';
import * as MUI from '@mui/material';

// === Ant Design Examples ===
import { Button as AntButton, Input as AntInput, Card as AntCard } from 'antd';
import { Typography as AntTypography } from 'antd';

// === Chakra UI Examples ===
import {
  Button as ChakraButton,
  Input as ChakraInput,
  Box,
} from '@chakra-ui/react';

// === React Bootstrap Examples ===
import { Button as BSButton, Form, Card as BSCard } from 'react-bootstrap';

// === Custom Library Examples ===
import { Button as MyButton, Input as MyInput } from '@mycompany/ui-kit';
import * as UIKit from '@mycompany/ui-kit';

// === Multiple Pattern Examples ===

// 1. Material-UI Patterns
function MaterialUIExamples() {
  // Direct usage
  const SaveButton = Button;

  // Conditional usage
  const [variant, setVariant] = useState<'contained' | 'outlined'>('contained');
  const DynamicButton = variant === 'contained' ? Button : AntButton;

  // Object mapping
  const muiComponents = {
    button: Button,
    textField: TextField,
    card: Card,
  };

  return (
    <div>
      <h2>Material-UI Usage Patterns</h2>

      {/* Direct usage */}
      <Button variant="contained" color="primary">
        MUI Button
      </Button>

      <TextField label="Username" variant="outlined" />

      <Card>
        <CardContent>
          <Typography variant="h5">MUI Card</Typography>
        </CardContent>
      </Card>

      {/* Variable assignment */}
      <SaveButton variant="contained">Save</SaveButton>

      {/* Namespace usage */}
      <MUI.Button variant="text">Namespace Button</MUI.Button>
      <MUI.TextField label="Namespace Input" />

      {/* Dynamic usage */}
      <DynamicButton>Dynamic Button</DynamicButton>

      {/* Object mapping */}
      {Object.entries(muiComponents).map(([key, Component]) => {
        if (key === 'button') {
          return (
            <Component key={key} variant="outlined">
              {key}
            </Component>
          );
        } else if (key === 'textField') {
          return <Component key={key} label={`Mapped ${key}`} />;
        } else {
          return (
            <Component key={key}>
              <CardContent>Mapped {key}</CardContent>
            </Component>
          );
        }
      })}
    </div>
  );
}

// 2. Ant Design Patterns
function AntDesignExamples() {
  const components = [AntButton, AntInput, AntCard];
  const [selectedComponent, setSelectedComponent] = useState(AntButton);

  const antConfig = {
    button: { children: 'Ant Button', type: 'primary' as const },
    input: { placeholder: 'Ant Input' },
    card: { title: 'Ant Card', children: 'Card content' },
  };

  return (
    <div>
      <h2>Ant Design Usage Patterns</h2>

      {/* Direct usage */}
      <AntButton type="primary">Primary Button</AntButton>
      <AntInput placeholder="Enter text" />

      <AntCard title="User Info">
        <AntTypography.Text>User details here</AntTypography.Text>
      </AntCard>

      {/* Array mapping */}
      {components.map((Component, index) => {
        if (Component === AntButton) {
          return (
            <Component key={index} type="default">
              Array Button {index}
            </Component>
          );
        } else if (Component === AntInput) {
          return <Component key={index} placeholder={`Array Input ${index}`} />;
        } else {
          return (
            <Component key={index} title={`Array Card ${index}`}>
              Content
            </Component>
          );
        }
      })}

      {/* Configuration-based rendering */}
      {Object.entries(antConfig).map(([key, config]) => {
        if (key === 'button') return <AntButton key={key} {...config} />;
        if (key === 'input') return <AntInput key={key} {...config} />;
        if (key === 'card') return <AntCard key={key} {...config} />;
        return null;
      })}
    </div>
  );
}

// 3. Mixed Libraries Pattern
function MixedLibrariesExample() {
  const [library, setLibrary] = useState<'mui' | 'antd' | 'chakra'>('mui');

  const libraryComponents = {
    mui: { Button, TextField, Card },
    antd: { Button: AntButton, TextField: AntInput, Card: AntCard },
    chakra: { Button: ChakraButton, TextField: ChakraInput, Card: Box },
  };

  const ActiveComponents = libraryComponents[library];

  return (
    <div>
      <h2>Mixed Libraries Pattern</h2>

      <div>
        <label>Select Library: </label>
        <select
          value={library}
          onChange={(e) => setLibrary(e.target.value as any)}
        >
          <option value="mui">Material-UI</option>
          <option value="antd">Ant Design</option>
          <option value="chakra">Chakra UI</option>
        </select>
      </div>

      {/* Dynamic library component usage */}
      <ActiveComponents.Button>
        {library.toUpperCase()} Button
      </ActiveComponents.Button>

      {/* Fallback patterns */}
      {library === 'mui' && <TextField label="MUI Input" />}
      {library === 'antd' && <AntInput placeholder="Ant Input" />}
      {library === 'chakra' && <ChakraInput placeholder="Chakra Input" />}
    </div>
  );
}

// 4. Context-Based Component Selection
const ComponentContext = createContext({
  Button: Button,
  Input: TextField,
  Card: Card,
});

function ContextProvider({ children }: { children: React.ReactNode }) {
  return (
    <ComponentContext.Provider value={{ Button, Input: TextField, Card }}>
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
      <h2>Context-Based Components</h2>
      <ContextButton variant="contained">Context Button</ContextButton>
      <ContextInput label="Context Input" />
      <ContextCard>
        <CardContent>Context Card</CardContent>
      </ContextCard>
    </div>
  );
}

// 5. HOC Patterns with Multiple Libraries
function withLibraryWrapper<T extends {}>(
  WrappedComponent: React.ComponentType<T>,
  wrapperProps?: any,
) {
  return function WrappedWithLibrary(props: T) {
    return (
      <Card {...wrapperProps}>
        <CardContent>
          <WrappedComponent {...props} />
        </CardContent>
      </Card>
    );
  };
}

// Enhanced components
const EnhancedMUIButton = withLibraryWrapper(Button, { elevation: 2 });
const EnhancedAntButton = withLibraryWrapper(AntButton, {
  title: 'Enhanced Ant',
});
const EnhancedMyButton = withLibraryWrapper(MyButton, {
  title: 'Enhanced Custom',
});

// 6. Lazy Loading with Different Libraries
const LazyMUIChart = lazy(() => import('@mui/x-charts/LineChart'));
const LazyAntTable = lazy(() => import('antd/es/table'));
const LazyCustomWidget = lazy(() => import('@mycompany/ui-kit/widget'));

function LazyComponentsExample() {
  const [showComponents, setShowComponents] = useState(false);

  return (
    <div>
      <h2>Lazy Loading Multiple Libraries</h2>

      <Button onClick={() => setShowComponents(!showComponents)}>
        {showComponents ? 'Hide' : 'Show'} Lazy Components
      </Button>

      {showComponents && (
        <React.Suspense
          fallback={<Typography>Loading components...</Typography>}
        >
          <LazyMUIChart width={300} height={200} series={[]} />
          <LazyAntTable dataSource={[]} columns={[]} />
          <LazyCustomWidget title="Custom Widget" />
        </React.Suspense>
      )}
    </div>
  );
}

// 7. Complex Nested Library Usage
const complexLibraryStructure = {
  ui: {
    material: {
      forms: { Button, TextField },
      display: { Card, Typography },
    },
    antd: {
      forms: { Button: AntButton, Input: AntInput },
      display: { Card: AntCard, Text: AntTypography.Text },
    },
  },
  custom: {
    forms: { Button: MyButton, Input: MyInput },
    namespace: UIKit,
  },
};

function ComplexNestedExample() {
  // Deep property access
  const MaterialButton = complexLibraryStructure.ui.material.forms.Button;
  const AntCard = complexLibraryStructure.ui.antd.display.Card;
  const CustomNamespace = complexLibraryStructure.custom.namespace;

  // Function-based selection
  const getFormComponent = (
    library: 'material' | 'antd',
    type: 'Button' | 'Input',
  ) => {
    return library === 'material'
      ? complexLibraryStructure.ui.material.forms[
          type === 'Button' ? 'Button' : 'TextField'
        ]
      : complexLibraryStructure.ui.antd.forms[
          type === 'Button' ? 'Button' : 'Input'
        ];
  };

  const DynamicFormButton = getFormComponent('material', 'Button');

  return (
    <div>
      <h2>Complex Nested Library Structure</h2>

      {/* Deeply nested access */}
      <MaterialButton variant="contained">Deep Material Button</MaterialButton>
      <AntCard title="Deep Ant Card">Nested structure content</AntCard>

      {/* Namespace from nested structure */}
      <CustomNamespace.Button>Namespace from nested</CustomNamespace.Button>

      {/* Function-selected components */}
      <DynamicFormButton variant="outlined">
        Function Selected
      </DynamicFormButton>
    </div>
  );
}

// 8. Library Migration Patterns
function LibraryMigrationExample() {
  // Feature flag for gradual migration
  const [useLegacyComponents, setUseLegacyComponents] = useState(false);

  // Component mapping for migration
  const componentMapping = {
    Button: useLegacyComponents ? MyButton : Button,
    Input: useLegacyComponents ? MyInput : TextField,
    Card: useLegacyComponents ? UIKit.Card : Card,
  };

  return (
    <div>
      <h2>Library Migration Pattern</h2>

      <label>
        <input
          type="checkbox"
          checked={useLegacyComponents}
          onChange={(e) => setUseLegacyComponents(e.target.checked)}
        />
        Use Legacy Components
      </label>

      {/* Components switch based on feature flag */}
      <componentMapping.Button variant="contained">
        {useLegacyComponents ? 'Legacy' : 'New'} Button
      </componentMapping.Button>

      <componentMapping.Input
        {...(useLegacyComponents
          ? { placeholder: 'Legacy Input' }
          : { label: 'New Input' })}
      />

      <componentMapping.Card>
        <CardContent>
          Migration Example - {useLegacyComponents ? 'Old' : 'New'} Library
        </CardContent>
      </componentMapping.Card>
    </div>
  );
}

// Main App
export default function DifferentLibrariesApp() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Multi-Library Component Usage Analysis</h1>

      <ContextProvider>
        <MaterialUIExamples />
        <hr />

        <AntDesignExamples />
        <hr />

        <MixedLibrariesExample />
        <hr />

        <ContextConsumer />
        <hr />

        <div>
          <h2>HOC Enhanced Components</h2>
          <EnhancedMUIButton variant="contained">
            Enhanced MUI
          </EnhancedMUIButton>
          <EnhancedAntButton type="primary">Enhanced Ant</EnhancedAntButton>
          <EnhancedMyButton>Enhanced Custom</EnhancedMyButton>
        </div>
        <hr />

        <LazyComponentsExample />
        <hr />

        <ComplexNestedExample />
        <hr />

        <LibraryMigrationExample />
      </ContextProvider>
    </div>
  );
}

// Export patterns for analysis
export const AnalysisPatterns = {
  directImports: { Button, TextField, Card },
  aliasedImports: { AntButton, AntInput, AntCard },
  namespaceImports: { MUI, UIKit },
  variableAssignments: { EnhancedMUIButton, EnhancedAntButton },
  objectMappings: { complexLibraryStructure },
  conditionalUsage: { library: 'multiple patterns detected' },
  lazyLoading: { LazyMUIChart, LazyAntTable, LazyCustomWidget },
  contextUsage: { ComponentContext },
  hocPatterns: { withLibraryWrapper },
  migrationPatterns: { componentMapping: 'dynamic based on feature flags' },
};

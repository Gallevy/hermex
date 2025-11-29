import React, { lazy, Suspense, useState } from 'react';

// Example library imports - Lazy loading patterns
import Button from '@design-system/foundation/button';
import { Typography } from '@design-system/foundation';

/**
 * PATTERN 4: LAZY LOADING
 * Complexity: 6/10
 *
 * Components are loaded dynamically using React.lazy and Suspense.
 * This pattern is useful for code splitting and improving initial load times.
 */

// Basic lazy loading
const LazyCard = lazy(() => import('@design-system/foundation/card'));
const LazyModal = lazy(() => import('@design-system/foundation/modal'));
const LazyInput = lazy(() => import('@design-system/foundation/input'));

// Lazy loading with dynamic path
const LazyDynamic = lazy(() => {
  const componentPath = '@design-system/foundation/card';
  return import(componentPath);
});

// Conditional lazy loading
const LazyConditional = lazy(() => {
  const condition = Math.random() > 0.5;
  return condition
    ? import('@design-system/foundation/button')
    : import('@design-system/foundation/input');
});

// Lazy loading with error handling
const LazyWithRetry = lazy(() =>
  import('@design-system/foundation/card').catch(() => {
    return import('@design-system/foundation/button');
  }),
);

export function LazyLoadingExample() {
  const [showLazy, setShowLazy] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showConditional, setShowConditional] = useState(false);
  const [lazyType, setLazyType] = useState<'card' | 'input' | 'button'>('card');

  // Dynamic lazy loading based on type
  const [DynamicLazyComponent, setDynamicLazyComponent] =
    useState<React.ComponentType<any> | null>(null);

  const loadDynamicComponent = async (type: string) => {
    try {
      let module;
      switch (type) {
        case 'card':
          module = await import('@design-system/foundation/card');
          break;
        case 'input':
          module = await import('@design-system/foundation/input');
          break;
        case 'button':
          module = await import('@design-system/foundation/button');
          break;
        default:
          return;
      }
      setDynamicLazyComponent(() => module.default);
    } catch (error) {
      console.error('Failed to load component:', error);
    }
  };

  return (
    <div>
      <h2>Lazy Loading Patterns</h2>

      {/* Basic lazy loading */}
      <section>
        <h3>Basic Lazy Loading</h3>
        <Button onClick={() => setShowLazy(!showLazy)}>
          {showLazy ? 'Hide' : 'Show'} Lazy Components
        </Button>

        {showLazy && (
          <Suspense fallback={<Typography>Loading components...</Typography>}>
            <LazyCard title="Lazy Loaded Card">
              This card was loaded lazily
            </LazyCard>
            <LazyInput placeholder="Lazy loaded input" />
          </Suspense>
        )}
      </section>

      {/* Lazy loading with separate suspense boundaries */}
      <section>
        <h3>Separate Suspense Boundaries</h3>
        <Button onClick={() => setShowModal(!showModal)}>
          {showModal ? 'Hide' : 'Show'} Modal
        </Button>

        {showModal && (
          <Suspense fallback={<div>Loading modal...</div>}>
            <LazyModal>
              <Typography>This is a lazily loaded modal</Typography>
              <Button onClick={() => setShowModal(false)}>Close</Button>
            </LazyModal>
          </Suspense>
        )}
      </section>

      {/* Conditional lazy loading */}
      <section>
        <h3>Conditional Lazy Loading</h3>
        <Button onClick={() => setShowConditional(!showConditional)}>
          Toggle Conditional Lazy Component
        </Button>

        {showConditional && (
          <Suspense
            fallback={<Typography>Loading conditional component...</Typography>}
          >
            <LazyConditional>
              This component was conditionally lazy loaded
            </LazyConditional>
          </Suspense>
        )}
      </section>

      {/* Dynamic lazy loading with state */}
      <section>
        <h3>Dynamic Lazy Loading</h3>
        <select
          value={lazyType}
          onChange={(e) => setLazyType(e.target.value as any)}
        >
          <option value="card">Card</option>
          <option value="input">Input</option>
          <option value="button">Button</option>
        </select>
        <Button onClick={() => loadDynamicComponent(lazyType)}>
          Load {lazyType}
        </Button>

        {DynamicLazyComponent && (
          <Suspense fallback={<Typography>Loading...</Typography>}>
            <DynamicLazyComponent>Dynamic Lazy Component</DynamicLazyComponent>
          </Suspense>
        )}
      </section>

      {/* Lazy loading with retry */}
      <section>
        <h3>Lazy Loading with Error Handling</h3>
        <Suspense fallback={<Typography>Loading with retry...</Typography>}>
          <LazyWithRetry title="Retry Card">
            This component has fallback loading logic
          </LazyWithRetry>
        </Suspense>
      </section>

      {/* Multiple lazy components in array */}
      <section>
        <h3>Multiple Lazy Components</h3>
        <Suspense
          fallback={<Typography>Loading multiple components...</Typography>}
        >
          {[LazyCard, LazyInput].map((Component, index) => (
            <Component key={index} title={`Lazy ${index}`}>
              Component {index} from array
            </Component>
          ))}
        </Suspense>
      </section>

      {/* Nested lazy loading */}
      <section>
        <h3>Nested Lazy Loading</h3>
        <Suspense fallback={<Typography>Loading outer...</Typography>}>
          <LazyCard title="Outer Lazy Card">
            <Suspense fallback={<Typography>Loading inner...</Typography>}>
              <LazyInput placeholder="Nested lazy input" />
            </Suspense>
          </LazyCard>
        </Suspense>
      </section>
    </div>
  );
}

export default LazyLoadingExample;

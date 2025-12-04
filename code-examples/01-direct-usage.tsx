// Example library imports - Direct usage patterns
import Button from "@design-system/foundation/button";
import Input from "@design-system/foundation/input";
import Card from "@design-system/foundation/card";
import { Typography } from "@design-system/foundation";

/**
 * PATTERN 1: DIRECT IMPORT & USAGE
 * Complexity: 1/10
 *
 * This is the most straightforward pattern where components are imported
 * and used directly in JSX without any intermediate steps.
 */

export function DirectUsageExample() {
  return (
    <div>
      <h2>Direct Usage Patterns</h2>

      {/* Basic usage without props */}
      <Button>Click me</Button>

      {/* With simple props */}
      <Button variant="primary" size="large">
        Primary Button
      </Button>

      {/* With event handlers */}
      <Button variant="secondary" onClick={() => console.log("clicked")}>
        Secondary Button
      </Button>

      {/* Self-closing components */}
      <Input placeholder="Enter text" />
      <Input type="email" placeholder="Email" required />

      {/* With multiple props */}
      <Input
        type="text"
        placeholder="Username"
        value=""
        onChange={() => {}}
        disabled={false}
      />

      {/* Components with children */}
      <Card title="User Profile" variant="elevated">
        <Typography>Welcome to your profile</Typography>
        <Button>Edit Profile</Button>
      </Card>

      {/* Nested children */}
      <Card title="Dashboard">
        <Typography variant="h2">Dashboard Title</Typography>
        <div>
          <Button variant="primary">Action 1</Button>
          <Button variant="secondary">Action 2</Button>
        </div>
        <Input placeholder="Search..." />
      </Card>

      {/* With spread props */}
      <Button {...{ variant: "primary", size: "large" }}>
        Button with spread
      </Button>

      {/* With dynamic props */}
      <Button
        variant="primary"
        disabled={false}
        onClick={() => alert("Clicked!")}
      >
        Dynamic Props Button
      </Button>
    </div>
  );
}

export default DirectUsageExample;

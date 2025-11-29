const { ReactComponentUsageAnalyzer } = require("./parser");
const { FocusedUsageAnalyzer } = require("./analyze-usage");
const fs = require("fs");

console.log("🧪 Running SWC Parser Tests");
console.log("=".repeat(50));

// Test 1: Basic Parser Test
console.log("\n🔬 Test 1: Basic Parser Analysis");
const basicAnalyzer = new ReactComponentUsageAnalyzer(
  "@design-system/foundation",
);
const basicReport = basicAnalyzer.analyzeFile(
  "code-examples/comprehensive-usage.tsx",
);

if (basicReport) {
  console.log("✅ Basic parser test passed");
  console.log(`   Found ${basicReport.summary.totalComponents} components`);
  console.log(
    `   Detected ${basicReport.summary.totalUsagePatterns} usage patterns`,
  );
} else {
  console.log("❌ Basic parser test failed");
}

// Test 2: Focused Analysis Test
console.log("\n🎯 Test 2: Focused Analysis");
const focusedAnalyzer = new FocusedUsageAnalyzer("@design-system/foundation");
const focusedReport = focusedAnalyzer.analyzeFile(
  "code-examples/comprehensive-usage.tsx",
);

if (focusedReport) {
  const analysis = focusedAnalyzer.printFocusedReport(focusedReport);
  console.log("✅ Focused analysis test passed");
  console.log(`   Complexity Level: ${analysis.complexity.level}`);
  console.log(`   Patterns Found: ${analysis.foundPatterns.size}`);
  console.log(`   Recommendations: ${analysis.recommendations.length}`);
} else {
  console.log("❌ Focused analysis test failed");
}

// Test 3: Simple React App Test
console.log("\n📱 Test 3: Simple React App Analysis");
const simpleReport = basicAnalyzer.analyzeFile("code-examples/react-app.tsx");

if (simpleReport) {
  console.log("✅ Simple app analysis passed");
  basicAnalyzer.printReport(simpleReport);
} else {
  console.log("❌ Simple app analysis failed");
}

console.log("\n" + "=".repeat(50));
console.log("🎉 All tests completed!");
console.log("\nTo run individual analysis:");
console.log("  npm run parse                    - Run basic parser");
console.log("  npm run analyze                  - Run focused analysis");
console.log("  node parser.js [file] [library]  - Custom analysis");

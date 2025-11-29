import { parseSync } from "@swc/core";
import fs from "fs";
import path from "path";

class ReactComponentUsageAnalyzer {
  constructor(libraryName = "@design-system/foundation") {
    this.libraryName = libraryName;
    this.usagePatterns = {
      directImports: new Set(),
      namedImports: new Set(),
      namespaceImports: new Set(),
      defaultImports: new Set(),
      aliasedImports: new Map(),
      variableAssignments: new Map(),
      componentMappings: new Set(),
      lazyImports: new Set(),
      dynamicImports: new Set(),
      conditionalUsage: new Set(),
      arrayMappings: new Set(),
      objectMappings: new Set(),
      hocUsage: new Set(),
      renderProps: new Set(),
      contextUsage: new Set(),
      forwardedRefs: new Set(),
      memoizedComponents: new Set(),
      portalUsage: new Set(),
      jsxUsage: new Map(),
      destructuredUsage: new Set(),
      propsAnalysis: new Map(),
    };
    this.componentNames = new Set();
    this.allIdentifiers = new Set();
  }

  analyzeFile(filePath) {
    console.log(`\n📁 Analyzing: ${filePath}`);

    try {
      const code = fs.readFileSync(filePath, "utf8");
      const ast = parseSync(code, {
        syntax: "typescript",
        tsx: true,
        decorators: true,
        dynamicImport: true,
      });

      this.visitNode(ast);
      return this.generateReport();
    } catch (error) {
      console.error(`❌ Error parsing ${filePath}:`, error.message);
      return null;
    }
  }

  visitNode(node, parent = null) {
    if (!node) return;

    switch (node.type) {
      case "Module":
        node.body.forEach((item) => this.visitNode(item, node));
        break;

      case "ImportDeclaration":
        this.analyzeImport(node);
        break;

      case "CallExpression":
        this.analyzeCallExpression(node, parent);
        break;

      case "VariableDeclaration":
        this.analyzeVariableDeclaration(node);
        break;

      case "JSXElement":
      case "JSXFragment":
        this.analyzeJSXElement(node, parent);
        break;

      case "JSXOpeningElement":
        this.analyzeJSXOpeningElement(node, parent);
        break;

      case "ArrayExpression":
        this.analyzeArrayExpression(node, parent);
        break;

      case "ObjectExpression":
        this.analyzeObjectExpression(node, parent);
        break;

      case "MemberExpression":
        this.analyzeMemberExpression(node, parent);
        break;

      case "ConditionalExpression":
        this.analyzeConditionalExpression(node, parent);
        break;

      case "FunctionDeclaration":
      case "FunctionExpression":
      case "ArrowFunctionExpression":
        this.analyzeFunctionDeclaration(node);
        break;

      case "ClassDeclaration":
        this.analyzeClassDeclaration(node);
        break;

      default:
        // Recursively visit child nodes
        this.visitChildren(node);
        break;
    }
  }

  visitChildren(node) {
    if (!node || typeof node !== "object") return;

    for (const key in node) {
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.visitNode(child, node));
      } else if (value && typeof value === "object" && value.type) {
        this.visitNode(value, node);
      }
    }
  }

  analyzeImport(node) {
    const source = node.source.value;

    if (!this.isLibraryImport(source)) return;

    console.log(`📦 Found library import: ${source}`);

    node.specifiers.forEach((spec) => {
      switch (spec.type) {
        case "ImportDefaultSpecifier":
          this.usagePatterns.defaultImports.add({
            name: spec.local.value,
            source: source,
            line: node.span?.start || 0,
          });
          this.componentNames.add(spec.local.value);
          break;

        case "ImportNamespaceSpecifier":
          this.usagePatterns.namespaceImports.add({
            name: spec.local.value,
            source: source,
            line: node.span?.start || 0,
          });
          this.allIdentifiers.add(spec.local.value);
          break;

        case "ImportSpecifier":
          const importedName = spec.imported
            ? spec.imported.value
            : spec.local.value;
          const localName = spec.local.value;

          this.usagePatterns.namedImports.add({
            imported: importedName,
            local: localName,
            source: source,
            line: node.span?.start || 0,
          });

          if (importedName !== localName) {
            this.usagePatterns.aliasedImports.set(localName, {
              original: importedName,
              source: source,
              line: node.span?.start || 0,
            });
          }

          this.componentNames.add(localName);
          break;
      }
    });
  }

  analyzeCallExpression(node, parent) {
    // Analyze lazy imports
    if (
      node.callee?.value === "lazy" ||
      (node.callee?.object?.value === "React" &&
        node.callee?.property?.value === "lazy")
    ) {
      this.analyzeLazyImport(node);
    }

    // Analyze dynamic imports
    if (node.callee?.type === "Import") {
      this.analyzeDynamicImport(node);
    }

    // Analyze HOC patterns
    if (this.isHOCPattern(node)) {
      this.analyzeHOCUsage(node);
    }

    // Analyze React.memo, React.forwardRef
    if (node.callee?.object?.value === "React") {
      if (node.callee?.property?.value === "memo") {
        this.analyzeMemoUsage(node);
      } else if (node.callee?.property?.value === "forwardRef") {
        this.analyzeForwardRefUsage(node);
      }
    }

    // Analyze createPortal
    if (
      node.callee?.property?.value === "createPortal" ||
      node.callee?.value === "createPortal"
    ) {
      this.analyzePortalUsage(node);
    }

    this.visitChildren(node);
  }

  analyzeLazyImport(node) {
    const arg = node.arguments?.[0];
    if (
      arg?.type === "ArrowFunctionExpression" &&
      arg.body?.type === "CallExpression"
    ) {
      const importCall = arg.body;
      if (importCall.callee?.type === "Import") {
        const source = importCall.arguments?.[0]?.value;
        if (this.isLibraryImport(source)) {
          this.usagePatterns.lazyImports.add({
            source: source,
            line: node.span?.start || 0,
          });
          console.log(`🔄 Found lazy import: ${source}`);
        }
      }
    }
  }

  analyzeDynamicImport(node) {
    const source = node.arguments?.[0]?.value;
    if (this.isLibraryImport(source)) {
      this.usagePatterns.dynamicImports.add({
        source: source,
        line: node.span?.start || 0,
      });
      console.log(`⚡ Found dynamic import: ${source}`);
    }
  }

  analyzeVariableDeclaration(node) {
    node.declarations?.forEach((decl) => {
      if (decl.id?.type === "Identifier") {
        const varName = decl.id.value;

        // Check if it's assigning a component
        if (decl.init) {
          const assignment = this.extractAssignmentInfo(decl.init);
          if (assignment && this.isLibraryComponent(assignment)) {
            this.usagePatterns.variableAssignments.set(varName, {
              assignment: assignment,
              line: node.span?.start || 0,
            });
            this.componentNames.add(varName);
            console.log(`📝 Variable assignment: ${varName} = ${assignment}`);
          }
        }
      }

      // Handle destructuring assignments
      if (decl.id?.type === "ObjectPattern") {
        this.analyzeDestructuringPattern(decl.id, decl.init);
      }
    });

    this.visitChildren(node);
  }

  analyzeDestructuringPattern(pattern, init) {
    pattern.properties?.forEach((prop) => {
      if (
        prop.type === "AssignmentPatternProperty" &&
        prop.key?.type === "Identifier"
      ) {
        const propName = prop.key.value;

        if (
          init?.type === "Identifier" &&
          this.allIdentifiers.has(init.value)
        ) {
          this.usagePatterns.destructuredUsage.add({
            property: propName,
            source: init.value,
            line: pattern.span?.start || 0,
          });
          this.componentNames.add(propName);
          console.log(`🔧 Destructuring: ${propName} from ${init.value}`);
        }
      }
    });
  }

  analyzeJSXElement(node, parent) {
    if (node.opening) {
      this.analyzeJSXOpeningElement(node.opening, node);
    }
    this.visitChildren(node);
  }

  analyzeJSXOpeningElement(node, parent) {
    const elementName = this.getJSXElementName(node.name);

    if (
      this.componentNames.has(elementName) ||
      this.isMemberExpressionComponent(node.name)
    ) {
      const propsAnalysis = this.analyzePropsInDetail(node.attributes);
      const usage = {
        component: elementName,
        props: this.extractJSXProps(node.attributes),
        propsAnalysis: propsAnalysis,
        line: node.span?.start || 0,
        context: this.getUsageContext(parent),
      };

      if (!this.usagePatterns.jsxUsage.has(elementName)) {
        this.usagePatterns.jsxUsage.set(elementName, []);
      }
      this.usagePatterns.jsxUsage.get(elementName).push(usage);

      // Track props analysis for reporting
      if (!this.usagePatterns.propsAnalysis.has(elementName)) {
        this.usagePatterns.propsAnalysis.set(elementName, {
          namedProps: new Set(),
          spreadProps: 0,
          totalUsages: 0,
          complexProps: 0,
        });
      }
      const componentPropsStats =
        this.usagePatterns.propsAnalysis.get(elementName);
      componentPropsStats.totalUsages++;
      propsAnalysis.namedProps.forEach((prop) =>
        componentPropsStats.namedProps.add(prop),
      );
      if (propsAnalysis.hasSpread) componentPropsStats.spreadProps++;
      if (propsAnalysis.hasComplexProps) componentPropsStats.complexProps++;

      console.log(`🎨 JSX Usage: <${elementName}>`);
    }
  }

  getJSXElementName(nameNode) {
    if (!nameNode) return "";

    switch (nameNode.type) {
      case "Identifier":
        return nameNode.value;
      case "JSXMemberExpression":
        return `${this.getJSXElementName(nameNode.object)}.${nameNode.property.value}`;
      default:
        return "";
    }
  }

  isMemberExpressionComponent(nameNode) {
    if (nameNode?.type === "JSXMemberExpression") {
      const objectName = this.getJSXElementName(nameNode.object);
      return this.allIdentifiers.has(objectName);
    }
    return false;
  }

  extractJSXProps(attributes) {
    if (!attributes) return [];

    return attributes
      .map((attr) => {
        if (attr.type === "JSXAttribute") {
          return {
            name: attr.name?.value || attr.name?.name?.value,
            value: this.extractJSXAttributeValue(attr.value),
          };
        } else if (attr.type === "SpreadElement") {
          return {
            name: "...",
            value: "[spread]",
            isSpread: true,
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  extractJSXAttributeValue(value) {
    if (!value) return true; // boolean attribute

    switch (value.type) {
      case "StringLiteral":
        return value.value;
      case "JSXExpressionContainer":
        return this.extractExpressionValue(value.expression);
      default:
        return "[complex]";
    }
  }

  extractExpressionValue(expr) {
    if (!expr) return "[unknown]";

    switch (expr.type) {
      case "StringLiteral":
      case "NumericLiteral":
      case "BooleanLiteral":
        return expr.value;
      case "Identifier":
        return `{${expr.value}}`;
      case "ArrowFunctionExpression":
      case "FunctionExpression":
        return "[function]";
      case "ObjectExpression":
        return "[object]";
      case "ArrayExpression":
        return "[array]";
      default:
        return "[expression]";
    }
  }

  analyzePropsInDetail(attributes) {
    const analysis = {
      namedProps: new Set(),
      hasSpread: false,
      hasComplexProps: false,
      hasEventHandlers: false,
      propDetails: [],
    };

    if (!attributes) return analysis;

    attributes.forEach((attr) => {
      if (attr.type === "JSXAttribute") {
        const propName = attr.name?.value || attr.name?.name?.value;
        if (propName) {
          analysis.namedProps.add(propName);

          const propDetail = {
            name: propName,
            type: this.getPropType(attr.value),
            isEventHandler: propName.startsWith("on"),
            isComplex: this.isComplexProp(attr.value),
          };

          if (propDetail.isEventHandler) {
            analysis.hasEventHandlers = true;
          }
          if (propDetail.isComplex) {
            analysis.hasComplexProps = true;
          }

          analysis.propDetails.push(propDetail);
        }
      } else if (attr.type === "SpreadElement") {
        analysis.hasSpread = true;
        analysis.propDetails.push({
          name: "...",
          type: "spread",
          isSpread: true,
          isComplex: true,
          warning: "Spread props cannot be statically analyzed",
        });
        analysis.hasComplexProps = true;
      }
    });

    return analysis;
  }

  getPropType(value) {
    if (!value) return "boolean";

    switch (value.type) {
      case "StringLiteral":
        return "string";
      case "JSXExpressionContainer":
        const expr = value.expression;
        if (!expr) return "unknown";
        switch (expr.type) {
          case "NumericLiteral":
            return "number";
          case "BooleanLiteral":
            return "boolean";
          case "StringLiteral":
            return "string";
          case "ArrowFunctionExpression":
          case "FunctionExpression":
            return "function";
          case "ObjectExpression":
            return "object";
          case "ArrayExpression":
            return "array";
          case "Identifier":
            return "variable";
          default:
            return "expression";
        }
      default:
        return "unknown";
    }
  }

  isComplexProp(value) {
    if (!value) return false;
    if (value.type === "JSXExpressionContainer") {
      const expr = value.expression;
      if (!expr) return false;
      return (
        expr.type === "ObjectExpression" ||
        expr.type === "ArrayExpression" ||
        expr.type === "CallExpression" ||
        expr.type === "ConditionalExpression"
      );
    }
    return false;
  }

  analyzeArrayExpression(node, parent) {
    // Check if array contains components
    const hasComponents = node.elements?.some((elem) => {
      if (elem?.type === "Identifier") {
        return this.componentNames.has(elem.value);
      }
      return false;
    });

    if (hasComponents) {
      this.usagePatterns.arrayMappings.add({
        components: node.elements?.map((elem) => elem?.value).filter(Boolean),
        line: node.span?.start || 0,
      });
      console.log(`📋 Array with components found`);
    }

    this.visitChildren(node);
  }

  analyzeObjectExpression(node, parent) {
    // Check if object contains component mappings
    const componentProps = node.properties?.filter((prop) => {
      if (
        prop.type === "KeyValueProperty" &&
        prop.value?.type === "Identifier"
      ) {
        return this.componentNames.has(prop.value.value);
      }
      return false;
    });

    if (componentProps?.length > 0) {
      this.usagePatterns.objectMappings.add({
        mappings: componentProps.map((prop) => ({
          key: prop.key?.value || "[computed]",
          component: prop.value?.value,
        })),
        line: node.span?.start || 0,
      });
      console.log(`🗺️  Object mapping with components found`);
    }

    this.visitChildren(node);
  }

  analyzeConditionalExpression(node, parent) {
    const consequent =
      node.consequent?.type === "Identifier" ? node.consequent.value : null;
    const alternate =
      node.alternate?.type === "Identifier" ? node.alternate.value : null;

    if (
      (consequent && this.componentNames.has(consequent)) ||
      (alternate && this.componentNames.has(alternate))
    ) {
      this.usagePatterns.conditionalUsage.add({
        consequent: consequent,
        alternate: alternate,
        line: node.span?.start || 0,
      });
      console.log(`🔀 Conditional component usage found`);
    }

    this.visitChildren(node);
  }

  analyzeFunctionDeclaration(node) {
    // Analyze function for HOC patterns
    if (this.isHOCFunction(node)) {
      this.usagePatterns.hocUsage.add({
        name: node.identifier?.value || "[anonymous]",
        line: node.span?.start || 0,
      });
      console.log(`🔧 HOC function found: ${node.identifier?.value}`);
    }

    this.visitChildren(node);
  }

  analyzeClassDeclaration(node) {
    // Check if class component uses library components
    this.visitChildren(node);
  }

  isHOCPattern(node) {
    // Simple heuristic: function that returns a component-like structure
    return (
      node.callee?.type === "Identifier" &&
      node.arguments?.some(
        (arg) =>
          arg.type === "Identifier" && this.componentNames.has(arg.value),
      )
    );
  }

  isHOCFunction(node) {
    // Check if function takes a component as parameter and returns JSX
    const params = node.params || [];
    return params.some((param) => param.pat?.type === "Identifier");
  }

  analyzeHOCUsage(node) {
    this.usagePatterns.hocUsage.add({
      function: node.callee?.value,
      component: node.arguments?.[0]?.value,
      line: node.span?.start || 0,
    });
  }

  analyzeMemoUsage(node) {
    const component = node.arguments?.[0];
    if (
      component?.type === "Identifier" &&
      this.componentNames.has(component.value)
    ) {
      this.usagePatterns.memoizedComponents.add({
        component: component.value,
        line: node.span?.start || 0,
      });
      console.log(`🧠 Memoized component: ${component.value}`);
    }
  }

  analyzeForwardRefUsage(node) {
    this.usagePatterns.forwardedRefs.add({
      line: node.span?.start || 0,
    });
    console.log(`↗️  ForwardRef usage found`);
  }

  analyzePortalUsage(node) {
    this.usagePatterns.portalUsage.add({
      line: node.span?.start || 0,
    });
    console.log(`🌀 Portal usage found`);
  }

  analyzeMemberExpression(node, parent) {
    // Check if this is a namespace access like Foundation.Button
    if (
      node.object?.type === "Identifier" &&
      this.allIdentifiers.has(node.object.value)
    ) {
      const namespaceName = node.object.value;
      const propertyName = node.property?.value;

      if (propertyName) {
        // Track namespace property access
        this.componentNames.add(propertyName);
        console.log(`🔗 Namespace access: ${namespaceName}.${propertyName}`);
      }
    }

    this.visitChildren(node);
  }

  extractAssignmentInfo(node) {
    switch (node.type) {
      case "Identifier":
        return node.value;
      case "MemberExpression":
        return `${this.extractAssignmentInfo(node.object)}.${node.property.value}`;
      case "ConditionalExpression":
        return `${this.extractAssignmentInfo(node.consequent)} | ${this.extractAssignmentInfo(node.alternate)}`;
      default:
        return null;
    }
  }

  getUsageContext(parent) {
    if (!parent) return "unknown";

    switch (parent.type) {
      case "JSXElement":
        return "jsx";
      case "CallExpression":
        return "function-call";
      case "ArrayExpression":
        return "array";
      case "ConditionalExpression":
        return "conditional";
      default:
        return "other";
    }
  }

  isLibraryImport(source) {
    return (
      source &&
      (source.startsWith(this.libraryName) || source.includes(this.libraryName))
    );
  }

  isLibraryComponent(name) {
    return this.componentNames.has(name) || this.allIdentifiers.has(name);
  }

  generateReport() {
    const report = {
      summary: {
        totalImports:
          this.usagePatterns.defaultImports.size +
          this.usagePatterns.namedImports.size +
          this.usagePatterns.namespaceImports.size,
        totalComponents: this.componentNames.size,
        totalUsagePatterns: Object.keys(this.usagePatterns).reduce(
          (sum, key) => {
            const pattern = this.usagePatterns[key];
            if (pattern instanceof Set) return sum + pattern.size;
            if (pattern instanceof Map) return sum + pattern.size;
            return sum;
          },
          0,
        ),
      },
      patterns: {
        imports: {
          default: Array.from(this.usagePatterns.defaultImports),
          named: Array.from(this.usagePatterns.namedImports),
          namespace: Array.from(this.usagePatterns.namespaceImports),
          aliased: Array.from(this.usagePatterns.aliasedImports.entries()).map(
            ([key, value]) => ({
              alias: key,
              ...value,
            }),
          ),
        },
        usage: {
          jsx: Array.from(this.usagePatterns.jsxUsage.entries()).map(
            ([component, usages]) => ({
              component,
              count: usages.length,
              usages,
            }),
          ),
          variables: Array.from(
            this.usagePatterns.variableAssignments.entries(),
          ).map(([key, value]) => ({
            variable: key,
            ...value,
          })),
          destructuring: Array.from(this.usagePatterns.destructuredUsage),
          conditional: Array.from(this.usagePatterns.conditionalUsage),
          arrays: Array.from(this.usagePatterns.arrayMappings),
          objects: Array.from(this.usagePatterns.objectMappings),
        },
        advanced: {
          lazy: Array.from(this.usagePatterns.lazyImports),
          dynamic: Array.from(this.usagePatterns.dynamicImports),
          hoc: Array.from(this.usagePatterns.hocUsage),
          memo: Array.from(this.usagePatterns.memoizedComponents),
          forwardRef: Array.from(this.usagePatterns.forwardedRefs),
          portal: Array.from(this.usagePatterns.portalUsage),
        },
        props: Array.from(this.usagePatterns.propsAnalysis.entries()).map(
          ([component, stats]) => ({
            component,
            namedProps: Array.from(stats.namedProps),
            spreadPropsCount: stats.spreadProps,
            totalUsages: stats.totalUsages,
            complexPropsCount: stats.complexProps,
            spreadWarning:
              stats.spreadProps > 0
                ? `${stats.spreadProps} usage(s) with spread props - cannot analyze statically`
                : null,
          }),
        ),
      },
      components: Array.from(this.componentNames).sort(),
    };

    return report;
  }

  printReport(report) {
    console.log("\n" + "=".repeat(80));
    console.log("📊 REACT COMPONENT USAGE ANALYSIS REPORT");
    console.log("=".repeat(80));

    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total Imports: ${report.summary.totalImports}`);
    console.log(`   Components Found: ${report.summary.totalComponents}`);
    console.log(`   Usage Patterns: ${report.summary.totalUsagePatterns}`);

    console.log(`\n📦 IMPORT PATTERNS:`);
    if (report.patterns.imports.default.length > 0) {
      console.log(
        `   Default Imports (${report.patterns.imports.default.length}):`,
      );
      report.patterns.imports.default.forEach((imp) => {
        console.log(`     - ${imp.name} from "${imp.source}"`);
      });
    }

    if (report.patterns.imports.named.length > 0) {
      console.log(
        `   Named Imports (${report.patterns.imports.named.length}):`,
      );
      report.patterns.imports.named.forEach((imp) => {
        console.log(
          `     - {${imp.imported}${imp.imported !== imp.local ? ` as ${imp.local}` : ""}} from "${imp.source}"`,
        );
      });
    }

    if (report.patterns.imports.namespace.length > 0) {
      console.log(
        `   Namespace Imports (${report.patterns.imports.namespace.length}):`,
      );
      report.patterns.imports.namespace.forEach((imp) => {
        console.log(`     - * as ${imp.name} from "${imp.source}"`);
      });
    }

    if (report.patterns.imports.aliased.length > 0) {
      console.log(
        `   Aliased Imports (${report.patterns.imports.aliased.length}):`,
      );
      report.patterns.imports.aliased.forEach((imp) => {
        console.log(
          `     - ${imp.alias} (originally ${imp.original}) from "${imp.source}"`,
        );
      });
    }

    console.log(`\n🎨 JSX USAGE PATTERNS:`);
    report.patterns.usage.jsx.forEach((usage) => {
      console.log(
        `   Component: ${usage.component} (used ${usage.count} times)`,
      );
      usage.usages.slice(0, 3).forEach((use, idx) => {
        const props =
          use.props.length > 0 ? ` with ${use.props.length} props` : "";
        console.log(
          `     ${idx + 1}. <${usage.component}${props}> (line ~${use.line})`,
        );
      });
      if (usage.usages.length > 3) {
        console.log(`     ... and ${usage.usages.length - 3} more`);
      }
    });

    if (report.patterns.usage.variables.length > 0) {
      console.log(`\n📝 VARIABLE ASSIGNMENTS:`);
      report.patterns.usage.variables.forEach((variable) => {
        console.log(`   ${variable.variable} = ${variable.assignment}`);
      });
    }

    if (report.patterns.advanced.lazy.length > 0) {
      console.log(`\n🔄 LAZY LOADING:`);
      report.patterns.advanced.lazy.forEach((lazy) => {
        console.log(`   - Lazy import from "${lazy.source}"`);
      });
    }

    if (report.patterns.advanced.dynamic.length > 0) {
      console.log(`\n⚡ DYNAMIC IMPORTS:`);
      report.patterns.advanced.dynamic.forEach((dynamic) => {
        console.log(`   - Dynamic import from "${dynamic.source}"`);
      });
    }

    if (report.patterns.usage.conditional.length > 0) {
      console.log(`\n🔀 CONDITIONAL USAGE:`);
      report.patterns.usage.conditional.forEach((cond) => {
        console.log(
          `   - ${cond.consequent || "null"} ? ${cond.alternate || "null"}`,
        );
      });
    }

    console.log(`\n🧩 COMPONENTS IDENTIFIED:`);
    report.components.forEach((comp) => {
      console.log(`   - ${comp}`);
    });

    console.log("\n" + "=".repeat(80));
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const filePath = args[0] || "code-examples/comprehensive-usage.tsx";
  const libraryName = args[1] || "@design-system/foundation";

  console.log(`🔍 Starting analysis with library: ${libraryName}`);
  console.log(`📁 Target file: ${filePath}`);

  const analyzer = new ReactComponentUsageAnalyzer(libraryName);

  if (fs.existsSync(filePath)) {
    const report = analyzer.analyzeFile(filePath);
    if (report) {
      analyzer.printReport(report);

      // Save detailed report to JSON
      const outputPath = `analysis-report-${Date.now()}.json`;
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
      console.log(`\n💾 Detailed report saved to: ${outputPath}`);
    }
  } else {
    console.error(`❌ File not found: ${filePath}`);
    console.log("\nUsage: node parser.js <file-path> [library-name]");
    console.log(
      "Example: node parser.js code-examples/comprehensive-usage.tsx @design-system/foundation",
    );
  }
}

// Export for use as module
export { ReactComponentUsageAnalyzer };

// Run if called directly - Note: This works in CommonJS output from tsup
// In ESM, you'd use import.meta.url === `file://${process.argv[1]}`

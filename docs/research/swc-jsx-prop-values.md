# SWC JSX prop values: what is statically knowable

Research for hermex v3 prop-and-prop-value tracking (wayfinder ticket #119).

**Versions under test:** `@swc/core@1.15.46`, `@swc/types@0.1.27` (as installed in this repo).
**Parser options used for every example below:** `parseSync(src, { syntax: 'typescript', tsx: true })`.

All node shapes in this document were produced by parsing real source with the installed
`@swc/core` and printing the resulting AST (`span` / `ctxt` elided for readability). Type claims are
cited to `node_modules` paths with line numbers, and cross-checked against the SWC Rust AST, which
is the actual source of truth — the JS AST is a serde serialization of it.

---

## 1. The shape, top to bottom

### 1.1 Attributes live on `JSXOpeningElement.attributes`

```ts
export interface JSXOpeningElement extends Node, HasSpan {
    type: "JSXOpeningElement";
    name: JSXElementName;
    attributes: JSXAttributeOrSpread[];
    selfClosing: boolean;
    typeArguments?: TsTypeParameterInstantiation;
}
export type JSXAttributeOrSpread = JSXAttribute | SpreadElement;
```

— `node_modules/@swc/types/index.d.ts:1472-1479`

Rust source ([`swc_ecma_ast/src/jsx.rs`](https://github.com/swc-project/swc/blob/main/crates/swc_ecma_ast/src/jsx.rs)):

```rust
pub enum JSXAttrOrSpread {
    #[tag("JSXAttribute")]
    JSXAttr(JSXAttr),
    #[tag("SpreadElement")]
    SpreadElement(SpreadElement),
}
```

The `#[tag(...)]` attributes matter: this enum is **internally tagged**, so every element of
`attributes` carries a `type` discriminant. That is the structural difference from `ExprOrSpread`
(see §4) and it is why the attributes array is *not* subject to the same class of bug.

### 1.2 `JSXAttribute`

```ts
export interface JSXAttribute extends Node, HasSpan {
    type: "JSXAttribute";
    name: JSXAttributeName;
    value?: JSXAttrValue;
}
export type JSXAttributeName = Identifier | JSXNamespacedName;
export type JSXAttrValue = StringLiteral | JSXExpressionContainer | JSXElement | JSXFragment;
```

— `node_modules/@swc/types/index.d.ts:1484-1490`

Printed keys, empirically: `["type", "span", "name", "value"]`. `value` is **always present as a
key**; for a shorthand boolean it is `null`, not `undefined` (see §4.2).

Attribute names:

| Source | `attr.name` |
| --- | --- |
| `a="x"` | `{ type: "Identifier", value: "a" }` |
| `data-test="x"` | `{ type: "Identifier", value: "data-test" }` — dashes stay in `value` |
| `xlink:href="x"` | `{ type: "JSXNamespacedName", namespace: { type: "Identifier", value: "xlink" }, name: { type: "Identifier", value: "href" } }` |

`JSXNamespacedName` has **no `.value`** — reading `attr.name.value` on a namespaced attribute
returns `undefined`. The prop name has to be reassembled as `namespace.value + ':' + name.value`.

Duplicate attribute names are *not* deduplicated or rejected by the parser: `<C a="1" a="2" />`
yields two `JSXAttribute` nodes. Last-wins is a React runtime semantic, not a parser one, so any
prop map hermex builds has to decide the collision policy itself.

### 1.3 `JSXExpressionContainer` — the `{...}` wrapper

```ts
export interface JSXExpressionContainer extends Node, HasSpan {
    type: "JSXExpressionContainer";
    expression: JSXExpression;
}
export type JSXExpression = JSXEmptyExpression | Expression;
```

— `node_modules/@swc/types/index.d.ts:1462-1466`

Rust: the field is `expr`, serde-renamed to `expression`
(`#[cfg_attr(feature = "serde-impl", serde(rename = "expression"))]`).

Anything written as `prop={...}` is wrapped in exactly one of these. It is a *tagged* node
(`type: "JSXExpressionContainer"`), so it cannot be mistaken for the expression itself as long as
code switches on `type` — but code that reaches for `attr.value.value` will silently read
`undefined` (§4.1).

`JSXEmptyExpression` is in the union but is **unreachable for attribute values**: SWC rejects both
`<C a={} />` (`Expression expected`) and `<C a={/* c */} />` (`JSX attributes must only be assigned
a non-empty expression`). It only appears in *children* (`<C>{/* c */}</C>` parses fine and yields
one `JSXEmptyExpression`). So for prop-value work the union is effectively `Expression`.

### 1.4 Spread attributes are `SpreadElement`, and its payload field is called `arguments`

```rust
pub struct SpreadElement {
    #[cfg_attr(feature = "serde-impl", serde(rename = "spread"))]
    #[span(lo)]
    pub dot3_token: Span,

    #[cfg_attr(feature = "serde-impl", serde(rename = "arguments"))]
    #[span(hi)]
    pub expr: Box<Expr>,
}
```

— [`swc_ecma_ast/src/expr.rs`](https://github.com/swc-project/swc/blob/main/crates/swc_ecma_ast/src/expr.rs); mirrored at `node_modules/@swc/types/index.d.ts:1313-1317`:

```ts
export interface SpreadElement extends Node {
    type: "SpreadElement";
    spread: Span;
    arguments: Expression;
}
```

Printed, for `<C {...spread} />`:

```json
{
  "type": "SpreadElement",
  "spread": { "start": 15, "end": 18 },
  "arguments": { "type": "Identifier", "value": "spread", "optional": false }
}
```

Three things to internalize:

1. `arguments` is **singular** — one `Expression`, despite the plural name and despite
   `CallExpression.arguments` being an array right next door. `attr.arguments[0]` is `undefined`.
2. `spread` is the `Span` of the literal `...` token, not a boolean and not the payload.
3. `SpreadElement` extends `Node`, **not** `HasSpan` — the printed keys are exactly
   `["type", "spread", "arguments"]` with **no `span`**. Any location reporting for a spread
   attribute must fall back to `spread.start` and `arguments.span.end`, or it reports `undefined`.

The same `SpreadElement` node is reused inside object literals
(`ObjectExpression.properties: (SpreadElement | Property)[]`, `index.d.ts:1305-1308`), so `{...rest}`
inside an object-valued prop has this identical shape.

---

## 2. What is statically resolvable

"Resolvable" here means: hermex can compute the actual runtime value from the AST of a single file,
with no type checker and no cross-module constant folding.

### 2.1 Fully resolvable to a concrete value

| Source | Value node | Resolved |
| --- | --- | --- |
| `<C a="hello" />` | `value: { type: "StringLiteral", value: "hello", raw: "\"hello\"" }` | `"hello"` |
| `<C b={"hello"} />` | container → `StringLiteral` | `"hello"` |
| `<C c={42} />` | container → `{ type: "NumericLiteral", value: 42, raw: "42" }` | `42` |
| `<C e={true} />` | container → `{ type: "BooleanLiteral", value: true }` | `true` |
| `<C f />` | `value: null` | `true` (JSX shorthand semantics) |
| `<C g={null} />` | container → `{ type: "NullLiteral" }` — **no `value` field** | `null` |
| `<C j={\`static only\`} />` | `TemplateLiteral`, `expressions: []`, one `TemplateElement` | `"static only"` |
| `<C cc={/re/g} />` | `{ type: "RegExpLiteral", pattern: "re", flags: "g" }` | source-level regex |

Notes that bite:

- **`NullLiteral` has no `value` key at all.** A `switch` that lumps it in with the other literals
  and reads `.value` yields `undefined`, which is not the same as `null`.
- **String attribute values are HTML-entity-decoded by the parser.** `<C t="a &amp; b" />` gives
  `value: "a & b"`, `raw: "\"a &amp; b\""`; `<C t="&#169;" />` gives `value: "©"`. `raw` **includes
  the surrounding quote characters** and preserves the original quote style
  (`<C a='it&apos;s' />` → `value: "it's"`, `raw: "'it&apos;s'"`). Use `.value` for semantics,
  `.raw` only for display.
- **Strings inside `{...}` follow JS escape rules instead**: `<C s={"a&b"} />` → `value: "a&b"`,
  `raw: "\"a\\u0026b\""`. Two different decoding regimes for what looks like the same prop.
- **Negative numbers are not literals.** `<C d={-1} />` is a `UnaryExpression`:
  ```json
  { "type": "UnaryExpression", "operator": "-",
    "argument": { "type": "NumericLiteral", "value": 1, "raw": "1" } }
  ```
  A "numeric literal prop" check that only matches `NumericLiteral` misses every negative number.
  The same applies to `+1`, `!0`, and `void 0`.
- **`undefined` is an `Identifier`, not a literal**: `<C h={undefined} />` →
  `{ type: "Identifier", value: "undefined", optional: false }`. It is resolvable only by
  convention (nothing in the AST rules out a local shadowing binding).
- **`BigIntLiteral.value` is not a JS bigint at runtime.** `@swc/types` declares
  `value: bigint` (`index.d.ts:1538-1542`), but `<C bb={1n} />` actually prints
  `"value": [1, [1]]` — `typeof === "object"`, `Array.isArray === true` (a sign + digit-limbs pair
  from the napi bridge). Use `raw` (`"1n"`) for bigint props; do not trust the declared type.

### 2.2 Resolvable in *shape*, not in value

These are statically classifiable — hermex can record "this prop is an object literal with keys
`a`, `b` and an unknown spread" — but the concrete runtime value is not knowable.

**Template literal with interpolation** — `<C i={\`hi ${name}\`} />`:

```json
{ "type": "TemplateLiteral",
  "expressions": [ { "type": "Identifier", "value": "name", "optional": false } ],
  "quasis": [
    { "type": "TemplateElement", "tail": false, "cooked": "hi ", "raw": "hi " },
    { "type": "TemplateElement", "tail": true,  "cooked": "",    "raw": ""    } ] }
```

`quasis.length === expressions.length + 1` always; interleave `quasis[i].cooked` with
`expressions[i]` to render a pattern like `` `hi ${name}` ``. Zero-interpolation templates are fully
resolvable (§2.1). `cooked` is optional in the types (`index.d.ts:1420-1425`) and is `undefined` for
invalid escape sequences in tagged templates — fall back to `raw`.

**Object literal** — `<C o={{ a: 1, b: two, ...rest }} />` → `ObjectExpression`. The `properties`
array is heterogeneous and this is where the second real trap lives (§4.3):

| Source property | Node `type` | Keys |
| --- | --- | --- |
| `a: 1` | `KeyValueProperty` | `type, key, value` |
| `[k]: 1` | `KeyValueProperty` | `key` is `{ type: "Computed", expression: ... }` |
| `short` (shorthand) | **`Identifier`** | `type, span, ctxt, value, optional` — **no `key`, no expression `value`** |
| `m() {}` | `MethodProperty` | `type, key, params, body, ...` |
| `get g() {}` | `GetterProperty` | `type, span, key, typeAnnotation, body` |
| `...rest` | `SpreadElement` | `type, spread, arguments` |
| `"q-str": 2` | `KeyValueProperty` | `key` is `StringLiteral` |
| `3: four` | `KeyValueProperty` | `key` is `NumericLiteral` |

**Array literal** — `<C p={[1, "two", three, ...rest]} />` → `ArrayExpression`, whose `elements` are
`ExprOrSpread` wrappers. This is the exact node family from the `d3d2656` bug; see §4.

**Conditional** — `<C n={cond ? "x" : "y"} />` → `ConditionalExpression` with `test` / `consequent` /
`alternate`, each a plain `Expression`. Both branches are statically enumerable even though which
one runs is not; a prop-value model can record `"x" | "y"` as the candidate set. The same holds for
`BinaryExpression` with `&&` / `||` / `??` — note SWC classes logical operators as
`BinaryExpression`, not a separate `LogicalExpression` node the way ESTree does:
`<C v={a ?? "fallback"} />` → `{ type: "BinaryExpression", operator: "??", left, right }`.

**Static string concatenation** — `<C p={"a" + "b"} />` → `BinaryExpression` with `operator: "+"`
and two `StringLiteral` operands. Foldable if hermex chooses to, but it requires an explicit
constant-folding pass; SWC's parser does no folding.

**JSX-element-valued props** — `<C q={<Icon name="x" />} />` gives
`JSXExpressionContainer → JSXElement`, fully walkable (its own `opening.attributes` carry the
nested props). The **non-standard unwrapped forms also parse**: `<C icon=<Icon/> />` yields
`value: { type: "JSXElement", ... }` *directly* — no container — and `<C p=<>hi</> />` yields
`value: { type: "JSXFragment", ... }`. This is why `JSXAttrValue` includes `JSXElement | JSXFragment`.
Rare in real code, but a `switch` on `value.type` with only `StringLiteral` and
`JSXExpressionContainer` arms drops these into the default branch.

**TS-only wrappers**, which matter a great deal in a TypeScript codebase — each adds a layer that
must be peeled before the value is visible:

| Source | Node | Unwrap via |
| --- | --- | --- |
| `{"x" as const}` | `TsConstAssertion` | `.expression` |
| `{v as Foo}` | `TsAsExpression` | `.expression` (plus `.typeAnnotation`) |
| `{val satisfies string}` | `TsSatisfiesExpression` | `.expression` |
| `{v!}` | `TsNonNullExpression` | `.expression` |
| `{("paren")}` | `ParenthesisExpression` | `.expression` |

SWC **preserves parentheses as AST nodes** — `ParenthesisExpression` is not elided the way Babel
elides it. `<C y={("paren")} />` is a `ParenthesisExpression` wrapping a `StringLiteral`, so a
literal check fails on parenthesized literals unless there is a normalizing unwrap step. `(a, b)`
also surfaces as `ParenthesisExpression` at the top, with the `SequenceExpression` inside.

Recommendation: a single `unwrapExpression()` that loops over
`ParenthesisExpression | TsAsExpression | TsConstAssertion | TsSatisfiesExpression |
TsNonNullExpression | TsTypeAssertion | TsInstantiation` (all of which expose `.expression`) before
any type dispatch.

### 2.3 Not statically resolvable without information hermex does not have

| Source | Node | What is missing |
| --- | --- | --- |
| `<C k={ident} />` | `Identifier` | Binding resolution. The AST gives the *name* only; the value requires scope analysis, and cross-file if imported. `import { SIZE } from "./c"; <C size={SIZE} />` prints an `Identifier` indistinguishable from a local `let`. |
| `<C l={obj.deep.field} />` | `MemberExpression` | The object's value. The *access path* (`obj.deep.field`) is fully reconstructable and is the useful static artifact. |
| `<C m={obj[key]} />` | `MemberExpression` with `property: { type: "Computed", expression: ... }` | The key. The path degrades to `obj[<expr>]`. |
| `<C aa={obj?.maybe} />` | `OptionalChainingExpression` with `.base` (not `.expression`) | Same as member access, plus a different field name to reach the payload. |
| `<C t={fn()} />` | `CallExpression` | Return value — needs interprocedural analysis. |
| `<C s={() => go()} />` | `ArrowFunctionExpression` | Nothing to resolve; record as "handler". |
| `<C {...spread} />` | `SpreadElement` with `arguments: Identifier` | **Which props it contributes.** This is the hard boundary: unless the spread is an inline object (`{...{ inline: 1 }}`, whose `arguments` is an `ObjectExpression` and *is* enumerable), the prop set of the element is open. |
| Any prop's *declared* type | — | Not in the AST at all. `<C<string> a="1" />` does expose `JSXOpeningElement.typeArguments` (a `TsTypeParameterInstantiation`), but that is the component's type args, not per-prop types. Mapping a prop to its declared type needs a type checker. |
| Default prop values | — | Live in the component's parameter destructuring or `defaultProps`, in another file. A call site that omits a prop tells you nothing about its effective value. |

**The boundary in one sentence:** SWC gives hermex the complete *syntactic* value expression for
every prop, so literals and literal-composed structures resolve exactly and everything else resolves
to a shape plus an identifier/access path — but the moment a value depends on a binding, a call, or
a non-inline spread, resolution requires scope or type information that a single-file SWC parse does
not contain.

---

## 3. Reference table: `attr.value` by source form

Every row verified by parsing with `@swc/core@1.15.46`.

| Source | `attr.value` | Payload reached via |
| --- | --- | --- |
| `a` (shorthand) | `null` | — (implicitly `true`) |
| `a="s"` | `StringLiteral` | `.value` (entity-decoded), `.raw` (quoted) |
| `a={expr}` | `JSXExpressionContainer` | `.expression` |
| `a=<X/>` | `JSXElement` | `.opening`, `.children` |
| `a=<>x</>` | `JSXFragment` | `.opening`, `.children` |
| `{...x}` | *(the attribute itself is `SpreadElement`)* | `.arguments` |

---

## 4. Wrapper-shape traps

### 4.1 The `ExprOrSpread` trap does NOT recur on JSX attributes — for a structural reason

The bug fixed in `d3d2656` came from this pair of definitions
(`node_modules/@swc/types/index.d.ts:1289-1303`):

```ts
export interface CallExpression extends ExpressionBase {
    ...
    arguments: ExprOrSpread[];
}
export interface ArrayExpression extends ExpressionBase {
    type: "ArrayExpression";
    elements: (ExprOrSpread | undefined)[];
}
export interface ExprOrSpread {
    spread?: Span;
    expression: Expression;
}
```

`ExprOrSpread` is the one shape in this neighbourhood that is **not** an AST node: in Rust it is a
plain `struct` without `#[ast_node]`, so it has no `#[tag]` and serializes with **no `type` field at
all**. Empirically, for `f(a, ...b)` and `[a, ...b, , c]`:

```
CallExpression  [["spread","expression"],["spread","expression"]]
ArrayExpression [["spread","expression"],["spread","expression"],null,["spread","expression"]]
```

Reading `.type` off one yields `undefined` — which fails every `switch`/`=== 'Identifier'` check
silently, with no crash and no type error when the value is typed `any`. That is why the detection
was dead code on all input rather than merely wrong sometimes.

**JSX attributes do not have this shape.** `JSXAttrOrSpread` is a `#[tag]`ged enum, so
`attributes[i].type` is always either `"JSXAttribute"` or `"SpreadElement"`, and
`JSXAttribute.value` is a real tagged node too. Verified: printed top-level keys for every attribute
in a 30-attribute element were `["type","span","name","value"]` or `["type","spread","arguments"]` —
never `["spread","expression"]`, and `'spread' in attr` was `false` for every `JSXAttribute`.

**But the equivalent-class bugs reachable from a prop-value walk are these:**

### 4.2 `attr.value` is `null`, not `undefined`, for shorthand booleans

`@swc/types` declares `value?: JSXAttrValue` (`index.d.ts:1484-1488`) and Rust declares
`Option<JSXAttrValue>`, which reads as "absent". Serde emits `null`, so the key is always present:

```json
{ "hasKey": true, "isNull": true, "isUndefined": false }
```

`if (attr.value === undefined)` and `attr.value ?? defaultFor(name)` behave the same for `null`, but
`'value' in attr` is `true` even for shorthand props, and TypeScript's optional-property narrowing
will not warn about the `null` case unless `strictNullChecks` sees the real shape. Treat missing
value as `attr.value == null`.

### 4.3 Object shorthand properties are bare `Identifier` nodes, and `.value` is a *string*

This is the closest true analogue to the `ExprOrSpread` bug, and it is reachable from any
object-valued prop. From `node_modules/@swc/types/index.d.ts:1696-1703`:

```ts
export type Property = Identifier | KeyValueProperty | AssignmentProperty | GetterProperty | SetterProperty | MethodProperty;
```

For `<C o={{ short }} />`, `properties[0]` prints as:

```json
{ "type": "Identifier", "keys": ["type","span","ctxt","value","optional"],
  "typeofValue": "string", "value": "short", "hasKey": false }
```

So generic property-walking code that does `prop.value` to get the value *expression* gets the
**string `"short"`** instead of a node — truthy, no crash, no `type` field, and it will flow into
downstream `.type` reads as `undefined`. And `prop.key` is absent entirely, so a key extractor
returns `undefined` for exactly the shorthand properties that are most common in React props.
Guard with `prop.type === 'Identifier'` *before* touching `key`/`value`.

### 4.4 `SpreadElement.arguments` is a single expression, and the node has no `span`

Covered in §1.4. The plural name invites `attr.arguments[0]` (→ `undefined`) or
`attr.arguments.map(...)` (→ `TypeError`), and `attr.span.start` throws or reports `undefined`
because `SpreadElement extends Node` only. The `spread` field is a `Span`, so `if (attr.spread)` is
truthy on spreads — but it is *also* truthy-looking on `ExprOrSpread` entries where `spread` may be
`null`, so do not use `spread` as a cross-context boolean.

### 4.5 `ExprOrSpread.spread` is `null`, and array holes are `null`

Declared as `spread?: Span` and `(ExprOrSpread | undefined)[]` (`index.d.ts:1297-1303`), but the
serialized reality for `[a, , b]` is:

```
["ExprOrSpread","null","ExprOrSpread"]
spread key on non-spread element: null
```

The hole is `null`, not `undefined`, and non-spread elements carry `spread: null` rather than
omitting the key. `elements.filter(Boolean)` is fine; `elements.filter(e => e !== undefined)` is not.

### 4.6 `OptionalChainingExpression` uses `.base`, not `.expression`

`node_modules/@swc/types/index.d.ts:1280-1287` — the payload field is `base: MemberExpression |
OptionalChainingCall`. A generic unwrapper that assumes every wrapper exposes `.expression` silently
stops at `obj?.maybe` and never sees the member access underneath.

### 4.7 `NullLiteral` has no `value`; `BigIntLiteral.value` is not a bigint

Both covered in §2.1. Both are cases where the declared type and the printed value disagree or where
a uniform `.value` read produces `undefined` for a node that is genuinely a literal.

---

## 5. Practical shape of a prop-value extractor

Consequences of the above, stated as requirements rather than code:

1. Dispatch on `attr.type` first (`JSXAttribute` vs `SpreadElement`) — safe, both are tagged.
2. For `SpreadElement`, read `attr.arguments` (singular) and source location from `attr.spread.start`
   / `attr.arguments.span.end`; if `arguments` is an `ObjectExpression`, its keys are enumerable,
   otherwise the element's prop set is open and should be marked as such.
3. Reassemble namespaced prop names from `JSXNamespacedName`; do not assume `attr.name.value`.
4. Treat `attr.value == null` as the boolean-shorthand `true`.
5. Unwrap `JSXExpressionContainer` → `.expression`, then loop-unwrap the TS/paren wrappers
   (§2.2) before any type dispatch.
6. Handle `UnaryExpression` over `NumericLiteral` to catch negative numbers; special-case
   `NullLiteral` (no `.value`) and `BigIntLiteral` (use `.raw`).
7. When walking into object/array-valued props, apply the `ExprOrSpread` rule
   (`elements[i].expression`) and the shorthand-`Identifier` rule (§4.3).
8. Record identifiers and member expressions as *paths*, not values, and mark them unresolved —
   that is the honest static answer, and the boundary hermex should document to users.

---

## Sources

- `node_modules/@swc/types/index.d.ts` (v0.1.27) — lines cited inline throughout; JSX section at
  1445-1520, `ExprOrSpread` / `SpreadElement` at 1297-1317, `Property` at 1696-1703.
- SWC Rust AST, [`crates/swc_ecma_ast/src/jsx.rs`](https://github.com/swc-project/swc/blob/main/crates/swc_ecma_ast/src/jsx.rs) — `JSXAttr`, `JSXAttrValue`, `JSXAttrName`,
  `JSXAttrOrSpread`, `JSXExprContainer`, `JSXExpr` and their `#[tag]` / `serde(rename)` attributes.
- SWC Rust AST, [`crates/swc_ecma_ast/src/expr.rs`](https://github.com/swc-project/swc/blob/main/crates/swc_ecma_ast/src/expr.rs) — `SpreadElement` (`dot3_token` → `spread`,
  `expr` → `arguments`) and `ExprOrSpread` (untagged struct, `expr` → `expression`).
- Empirical: `@swc/core@1.15.46` `parseSync` with `{ syntax: 'typescript', tsx: true }`, this repo's
  installed copy. Every printed shape in this document is verbatim parser output with `span`/`ctxt`
  elided.

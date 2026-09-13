/**
 * Normalizes oxc-parser's ESTree AST into the SWC node vocabulary that
 * hermex's analyzers already speak.
 *
 * hermex has exactly one implementation of the analysis itself — the visitor
 * in `src/swc-parser/core` plus every module under `src/swc-parser/patterns`.
 * Those modules read SWC-shaped nodes (`Identifier.value`, `StringLiteral`,
 * `CallExpression.arguments[i].expression`, `node.span.start`, ...). Rather
 * than fork them for a second dialect — which is how two parsers silently
 * drift apart — the experimental oxc front-end translates its ESTree output
 * into that same vocabulary and hands it to the same analyzers. Parity is
 * therefore a property of this translation, and `tests/oxc-parser/parity.test.ts`
 * asserts it report-for-report against SWC over the whole fixture corpus.
 *
 * The translation is deliberately faithful to SWC rather than to ESTree in
 * three ways:
 *
 *  - Where SWC loses information (a computed member access exposes no
 *    `.value`, a shorthand object property collapses to a bare `Identifier`),
 *    this mirrors the loss so both parsers reach the same conclusions.
 *  - Key *order* is preserved, because `visitChildren` walks nodes with
 *    `for (const key in node)`. Several analyzers are order-sensitive —
 *    `jsxUsage` keeps the first entry per component while `propsAnalysis`
 *    keeps the last — so renamed keys are renamed in place rather than
 *    re-appended at the end.
 *  - Positions are converted to SWC's coordinate system (see
 *    `createPositionMapper`).
 *
 * Cost: this is an eager deep copy, and it is what makes `oxc-experimental`
 * slower end to end than the default front-end despite oxc parsing faster.
 * On the fixture corpus the clone costs ~7.0 ms/pass against a ~4.0 ms parse
 * saving, and the copy it produces carries more fields than SWC's native AST
 * (63.3k vs 51.9k), which costs the `visitChildren` walk a further ~1.3 ms.
 * Closing that gap means teaching the analyzers to read oxc's AST directly
 * rather than making this function cheaper.
 */

type AnyNode = Record<string, unknown> & { type: string };

/** Maps an oxc UTF-16 offset onto the SWC `BytePos` for the same location. */
type PositionMapper = (offset: number) => number;

/** ESTree node types whose SWC counterpart is simply named differently. */
const TYPE_RENAMES: Record<string, string> = {
  Program: 'Module',
  PropertyDefinition: 'ClassProperty',
  JSXIdentifier: 'Identifier',
};

/**
 * Per-type field renames, applied in place so the child-visit order matches
 * SWC's — `<Card subtitle={<Button />}>{children}</Card>` must reach the
 * opening element before the children either way.
 */
const KEY_RENAMES: Record<string, Record<string, string>> = {
  Identifier: { name: 'value' },
  JSXIdentifier: { name: 'value' },
  JSXElement: { openingElement: 'opening', closingElement: 'closing' },
  JSXFragment: { openingFragment: 'opening', closingFragment: 'closing' },
};

function isNode(value: unknown): value is AnyNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

/**
 * oxc reports UTF-16 offsets (plain JS string indices); SWC reports 1-based
 * UTF-8 byte offsets. For an all-ASCII source the two differ by exactly one,
 * but each non-ASCII character shifts everything after it by the extra bytes
 * it occupies — one em-dash in a comment is enough to move every subsequent
 * `line` by two.
 */
function createPositionMapper(code: string): PositionMapper {
  if (Buffer.byteLength(code, 'utf8') === code.length) {
    return (offset) => offset + 1;
  }

  // One breakpoint per multi-byte code point: the UTF-16 index just past it,
  // and the extra bytes accumulated through it. AST boundaries never fall
  // inside a code point, so a binary search over these is exact.
  const boundaries: number[] = [];
  const extraBytes: number[] = [];
  let extra = 0;

  for (let i = 0; i < code.length; i++) {
    const unit = code.charCodeAt(i);
    if (unit < 0x80) continue;
    if (unit < 0x800) {
      extra += 1; // 2 UTF-8 bytes over 1 UTF-16 unit
    } else if (unit >= 0xd800 && unit <= 0xdbff) {
      extra += 2; // surrogate pair: 4 UTF-8 bytes over 2 UTF-16 units
      i++;
    } else {
      extra += 2; // 3 UTF-8 bytes over 1 UTF-16 unit
    }
    boundaries.push(i + 1);
    extraBytes.push(extra);
  }

  return (offset) => {
    let low = 0;
    let high = boundaries.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (boundaries[mid] <= offset) low = mid + 1;
      else high = mid;
    }
    return offset + (low > 0 ? extraBytes[low - 1] : 0) + 1;
  };
}

function spanOf(
  node: unknown,
  pos: PositionMapper,
): { start: number; end: number; ctxt: number } {
  const start = isNode(node)
    ? (node['start'] as number | undefined)
    : undefined;
  const end = isNode(node) ? (node['end'] as number | undefined) : undefined;
  return { start: pos(start ?? 0), end: pos(end ?? 0), ctxt: 0 };
}

function normalizeValue(value: unknown, pos: PositionMapper): unknown {
  if (Array.isArray(value))
    return value.map((item) => normalizeValue(item, pos));
  if (isNode(value)) return normalizeNode(value, pos);
  return value;
}

/**
 * Copies every key across in its original position, applying the type/key
 * renames and swapping oxc's `start`/`end` offsets for an SWC-style `span`.
 */
function generic(node: AnyNode, pos: PositionMapper): AnyNode {
  const keyRenames = KEY_RENAMES[node.type];
  const out = { type: TYPE_RENAMES[node.type] ?? node.type } as AnyNode;

  for (const [key, value] of Object.entries(node)) {
    if (key === 'type' || key === 'start' || key === 'end') continue;
    out[keyRenames?.[key] ?? key] = normalizeValue(value, pos);
  }

  out['span'] = spanOf(node, pos);
  return out;
}

/** ESTree's single `Literal` node fans back out into SWC's literal types. */
function normalizeLiteral(node: AnyNode, pos: PositionMapper): AnyNode {
  const value = node['value'];
  let type = 'NullLiteral';
  if (node['regex']) type = 'RegExpLiteral';
  else if (node['bigint']) type = 'BigIntLiteral';
  else if (typeof value === 'string') type = 'StringLiteral';
  else if (typeof value === 'number') type = 'NumericLiteral';
  else if (typeof value === 'boolean') type = 'BooleanLiteral';

  return { type, value, raw: node['raw'], span: spanOf(node, pos) } as AnyNode;
}

/** SWC wraps every call argument and array element in an `ExprOrSpread`. */
function toExprOrSpread(
  node: AnyNode,
  pos: PositionMapper,
): Record<string, unknown> {
  if (node.type === 'SpreadElement') {
    return {
      spread: spanOf(node, pos),
      expression: normalizeValue(node['argument'], pos),
    };
  }
  return { expression: normalizeNode(node, pos) };
}

/**
 * SWC exposes a computed key/member only as `{ type: 'Computed', expression }`,
 * so `.value` reads back `undefined` — which is what the collections and
 * member-expression analyzers rely on to skip them.
 */
function normalizeKey(node: AnyNode, pos: PositionMapper): unknown {
  const key = node['key'];
  if (!node['computed'] || !isNode(key)) return normalizeValue(key, pos);
  return {
    type: 'Computed',
    expression: normalizeNode(key, pos),
    span: spanOf(key, pos),
  };
}

function normalizeObjectProperty(prop: unknown, pos: PositionMapper): unknown {
  if (!isNode(prop) || prop.type !== 'Property')
    return normalizeValue(prop, pos);

  const value = prop['value'];

  // `{ Button }` — SWC keeps the bare `Identifier` in `properties` rather than
  // synthesizing a key/value pair, so component-map detection never sees it.
  if (prop['shorthand'] && isNode(value) && value.type === 'Identifier') {
    return normalizeNode(value, pos);
  }

  const type = prop['method']
    ? 'MethodProperty'
    : prop['kind'] === 'get'
      ? 'GetterProperty'
      : prop['kind'] === 'set'
        ? 'SetterProperty'
        : 'KeyValueProperty';

  return {
    type,
    key: normalizeKey(prop, pos),
    value: normalizeValue(value, pos),
    span: spanOf(prop, pos),
  };
}

function normalizePatternProperty(prop: unknown, pos: PositionMapper): unknown {
  if (!isNode(prop) || prop.type !== 'Property')
    return normalizeValue(prop, pos);

  const value = prop['value'];

  // `const { Icon } = Foundation` / `const { Icon = Fallback } = Foundation`
  if (prop['shorthand']) {
    return {
      type: 'AssignmentPatternProperty',
      key: normalizeValue(prop['key'], pos),
      value:
        isNode(value) && value.type === 'AssignmentPattern'
          ? normalizeValue(value['right'], pos)
          : undefined,
      span: spanOf(prop, pos),
    };
  }

  return {
    type: 'KeyValuePatternProperty',
    key: normalizeKey(prop, pos),
    value: normalizeValue(value, pos),
    span: spanOf(prop, pos),
  };
}

function normalizeNode(node: AnyNode, pos: PositionMapper): AnyNode {
  switch (node.type) {
    case 'Literal':
      return normalizeLiteral(node, pos);

    // SWC models `import('x')` as a call against a synthetic `Import` callee,
    // which is what the dynamic- and lazy-import analyzers match on.
    case 'ImportExpression': {
      const args: Array<{ expression: unknown }> = [
        { expression: normalizeValue(node['source'], pos) },
      ];
      if (node['options']) {
        args.push({ expression: normalizeValue(node['options'], pos) });
      }
      return {
        type: 'CallExpression',
        callee: { type: 'Import', span: spanOf(node, pos) },
        arguments: args,
        span: spanOf(node, pos),
      } as AnyNode;
    }

    case 'CallExpression':
    case 'NewExpression': {
      const out = generic(node, pos);
      const args = node['arguments'];
      out['arguments'] = Array.isArray(args)
        ? args.filter(isNode).map((arg) => toExprOrSpread(arg, pos))
        : [];
      return out;
    }

    case 'ArrayExpression': {
      const out = generic(node, pos);
      const elements = node['elements'];
      out['elements'] = Array.isArray(elements)
        ? elements.map((el) =>
            isNode(el) ? toExprOrSpread(el, pos) : undefined,
          )
        : [];
      return out;
    }

    case 'ObjectExpression': {
      const out = generic(node, pos);
      const properties = node['properties'];
      out['properties'] = Array.isArray(properties)
        ? properties.map((prop) => normalizeObjectProperty(prop, pos))
        : [];
      return out;
    }

    case 'ObjectPattern': {
      const out = generic(node, pos);
      const properties = node['properties'];
      out['properties'] = Array.isArray(properties)
        ? properties.map((prop) => normalizePatternProperty(prop, pos))
        : [];
      return out;
    }

    case 'MemberExpression': {
      const out = generic(node, pos);
      if (node['computed'] && isNode(node['property'])) {
        out['property'] = {
          type: 'Computed',
          expression: out['property'],
          span: spanOf(node['property'], pos),
        };
      }
      return out;
    }

    // SWC keeps a class method's function in an *untyped* `function` object,
    // which `visitChildren` skips over — so nothing inside a class method body
    // is analyzed on the SWC path today (a constructor, whose `body` SWC does
    // type, is the exception). Mirroring the blind spot keeps the two
    // front-ends in lockstep; widening it is a change to the analysis itself,
    // not to a parser, and belongs in its own change.
    case 'MethodDefinition': {
      const fn = normalizeValue(node['value'], pos);

      if (node['kind'] === 'constructor' && isNode(fn)) {
        return {
          type: 'Constructor',
          key: normalizeKey(node, pos),
          params: fn['params'],
          body: fn['body'],
          span: spanOf(node, pos),
        } as AnyNode;
      }

      if (isNode(fn)) delete (fn as Record<string, unknown>)['type'];
      return {
        type: 'ClassMethod',
        key: normalizeKey(node, pos),
        function: fn,
        kind: node['kind'],
        isStatic: node['static'],
        span: spanOf(node, pos),
      } as AnyNode;
    }

    case 'JSXSpreadAttribute':
      return {
        type: 'SpreadElement',
        spread: spanOf(node, pos),
        arguments: normalizeValue(node['argument'], pos),
        span: spanOf(node, pos),
      } as AnyNode;

    default:
      return generic(node, pos);
  }
}

/**
 * Translates an oxc `Program` into the SWC-shaped `Module` the visitor expects.
 * `code` is the source the program was parsed from — needed to put positions
 * back into SWC's byte-offset coordinate system.
 */
export function normalizeProgram(program: unknown, code: string): unknown {
  const pos = createPositionMapper(code);
  return isNode(program) ? normalizeNode(program, pos) : program;
}

import { describe, it, expect } from 'vitest';
import { HermexConfigSchema } from '../../src/config/schema';

/** A minimal valid plugin — `name` plus one known hook. */
const valid = { name: 'oxlint', hooks: { onRunComplete() {} } };

function parse(plugins: unknown) {
  return HermexConfigSchema.safeParse({ plugins });
}

function errorFor(plugins: unknown): string {
  const result = parse(plugins);
  if (result.success) throw new Error('expected parse to fail');
  return result.error.issues.map((i) => i.message).join('\n');
}

describe('config schema: plugins', () => {
  it('defaults to an empty array', () => {
    const config = HermexConfigSchema.parse({});
    expect(config.plugins).toEqual([]);
  });

  it('accepts a plugin declared inline', () => {
    const result = parse([valid]);
    expect(result.success).toBe(true);
  });

  it('accepts several plugins with distinct names', () => {
    expect(parse([valid, { ...valid, name: 'other' }]).success).toBe(true);
  });

  it('rejects a plugin that is not an object', () => {
    expect(errorFor(['oxlint'])).toMatch(/must be an object/);
  });

  it('rejects a missing or empty name', () => {
    expect(errorFor([{ hooks: { onRunComplete() {} } }])).toMatch(
      /`name` must be a non-empty string/,
    );
    expect(errorFor([{ ...valid, name: '   ' }])).toMatch(
      /`name` must be a non-empty string/,
    );
  });

  it('rejects a plugin with no hooks object', () => {
    expect(errorFor([{ name: 'x' }])).toMatch(/`hooks` must be an object/);
  });

  it('rejects a plugin that declares no hooks at all', () => {
    // It could never run, so accepting it would be a silent no-op.
    expect(errorFor([{ name: 'x', hooks: {} }])).toMatch(/declares no hooks/);
  });

  it('rejects an unknown hook rather than ignoring it', () => {
    // A plugin written against a newer hermex must fail loudly — the Vite
    // trap of hooks that silently never fire is what this prevents (#102).
    const message = errorFor([
      { name: 'x', hooks: { onFileParsed() {}, onRunComplete() {} } },
    ]);
    expect(message).toMatch(/Unknown hook `onFileParsed`/);
    expect(message).toMatch(/onRunComplete/); // lists what is supported
    expect(message).toMatch(/upgrade rather than removing the hook/);
  });

  it('rejects a hook that is not a function', () => {
    expect(errorFor([{ name: 'x', hooks: { onRunComplete: true } }])).toMatch(
      /`onRunComplete` must be a function/,
    );
  });

  it('rejects two plugins sharing a name', () => {
    // Identity is the plugin's declared name, so a duplicate is ambiguous
    // rather than silently merged — ESLint's identity-by-object-reference
    // is the cautionary tale here.
    expect(errorFor([valid, { ...valid }])).toMatch(
      /Duplicate plugin name "oxlint"/,
    );
  });

  it('still rejects unknown top-level config keys', () => {
    // `plugins` loosens one branch of the schema; the rest stays strict.
    expect(HermexConfigSchema.safeParse({ plugin: [] }).success).toBe(false);
  });
});

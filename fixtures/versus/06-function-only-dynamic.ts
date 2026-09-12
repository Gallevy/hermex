// Reached only through a dynamic `import()`, on a code-split path. Still a
// real dependency, so it counts: `collectImportedPackages` folds in lazy and
// dynamic sources alongside the three static import forms.
export async function formatOnDemand(value: unknown): Promise<string> {
  const { default: lodash } = await import('lodash');
  return lodash.toString(value);
}

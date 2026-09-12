// A subpath import (`lodash/debounce`), which resolves back to the `lodash`
// package rather than being dropped as an unknown source.
import debounce from 'lodash/debounce';

export const save = debounce((value: string) => {
  globalThis.console.log(value);
}, 250);

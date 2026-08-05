// Example library imports - JSX nested inside attribute values
import Child from "@design-system/foundation/child";
import CaseChild from "@design-system/foundation/case-child";
import CaseCond from "@design-system/foundation/case-cond";
import CaseMap from "@design-system/foundation/case-map";
import CaseVar from "@design-system/foundation/case-var";
import CaseReturn from "@design-system/foundation/case-return";
import CaseAttr from "@design-system/foundation/case-attr";
import CaseAttrSelfClosing from "@design-system/foundation/case-attr-self-closing";
import CaseAttrCond from "@design-system/foundation/case-attr-cond";
import CaseAttrHost from "@design-system/foundation/case-attr-host";
import CaseAttrFragment from "@design-system/foundation/case-attr-fragment";
import CaseBoth from "@design-system/foundation/case-both";
import CaseUnused from "@design-system/foundation/case-unused";

/**
 * PATTERN 9: JSX NESTED IN ATTRIBUTE VALUES
 * Complexity: 4/10
 *
 * Regression fixture for https://github.com/Gallevy/hermex/issues/64
 *
 * The AST visitor must descend into JSXOpeningElement.attributes so that
 * components rendered inside prop values (title=, subtitle=, icon=, ...)
 * are counted the same way as components rendered as children.
 */

export function JsxInAttributesExample({ cond }: { cond: boolean }) {
  return (
    <div>
      {/* child element - detected before the fix */}
      <div>
        <CaseChild>x</CaseChild>
      </div>

      {/* conditional child - detected before the fix */}
      {cond && <CaseCond>x</CaseCond>}

      {/* child via .map() - detected before the fix */}
      {[1].map((i) => (
        <CaseMap key={i} />
      ))}

      {/* variable-assigned - detected before the fix */}
      {(() => {
        const el = <CaseVar />;
        return <div>{el}</div>;
      })()}

      {/* direct return - detected before the fix */}
      {(() => {
        return <CaseReturn>x</CaseReturn>;
      })()}

      {/* prop value - NOT detected before the fix */}
      <Child subtitle={<CaseAttr>x</CaseAttr>} />

      {/* prop value, self-closing - NOT detected before the fix */}
      <Child subtitle={<CaseAttrSelfClosing />} />

      {/* prop value, conditional - NOT detected before the fix */}
      <Child subtitle={cond && <CaseAttrCond />} />

      {/* prop value on a host element - NOT detected before the fix */}
      <div title={<CaseAttrHost />}>x</div>

      {/* prop value, fragment-wrapped - NOT detected before the fix */}
      <Child
        subtitle={
          <>
            <CaseAttrFragment />
          </>
        }
      />

      {/* both positions in the same file - the child usage alone made this pass before the fix */}
      <div>
        <CaseBoth />
        <Child subtitle={<CaseBoth />} />
      </div>

      {/* imported, never used - correctly absent either way */}
    </div>
  );
}

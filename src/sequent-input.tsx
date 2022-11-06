import katex from 'katex';
import React from 'react';
import { useState } from 'react';

import { Expr, ReductionTree, exprToString, theKatexOptions } from './common';

function exprsToString(exprs: Expr[]): string {
  return exprs
    .map((expr, i) => {
      const s = exprToString(expr);
      return (i === 0) ? s : ", " + s;
    })
    .reduce((a, b) => a + b, "");
}

const buttonSpecs: {label: string, onClick: (es: Expr[]) => Expr[]}[] = [
  { label: "A", onClick: (es) => (es.concat([{me: "A", precedence: "atom", associative: "none", operands: []}])) },
  { label: "B", onClick: (es) => (es.concat([{me: "B", precedence: "atom", associative: "none", operands: []}])) },
  { label: "C", onClick: (es) => (es.concat([{me: "C", precedence: "atom", associative: "none", operands: []}])) },
  { label: "D", onClick: (es) => (es.concat([{me: "D", precedence: "atom", associative: "none", operands: []}])) },
  { label: "\\Gamma", onClick: (es) => (es.concat([{me: "\\Gamma", precedence: "atom", associative: "none", operands: []}])) },
  { label: "\\Delta", onClick: (es) => (es.concat([{me: "\\Delta", precedence: "atom", associative: "none", operands: []}])) },
  { label: "\\Sigma", onClick: (es) => (es.concat([{me: "\\Sigma", precedence: "atom", associative: "none", operands: []}])) },
  { label: "\\Pi", onClick: (es) => (es.concat([{me: "\\Pi", precedence: "atom", associative: "none", operands: []}])) },
  { label: "\\land", onClick: (es) => {
    const [e1, e2] = es.slice(-2);
    if (e1 && e2) {
      return es.slice(0, -2).concat([{me: "\\land", precedence: 3, associative: "none", operands: [e1, e2]}]);
    } else {
      return es;
    }
  }},
  { label: "\\lor", onClick: (es) => {
    const [e1, e2] = es.slice(-2);
    if (e1 && e2) {
      return es.slice(0, -2).concat([{me: "\\lor", precedence: 2, associative: "none", operands: [e1, e2]}]);
    } else {
      return es;
    }
  }},
  { label: "\\to", onClick: (es) => {
    const [e1, e2] = es.slice(-2);
    if (e1 && e2) {
      return es.slice(0, -2).concat([{me: "\\to", precedence: 1, associative: "right", operands: [e1, e2]}]);
    } else {
      return es;
    }
  }},
  { label: "\\neg", onClick: (es) => {
    const [e1] = es.slice(-1);
    if (e1) {
      return es.slice(0, -1).concat([{me: "\\neg", precedence: 9, associative: "right", operands: [e1]}]);
    } else {
      return es;
    }
  }},
  { label: "\\bot", onClick: (es) => (es.concat([{me: "\\bot", precedence: "atom", associative: "none", operands: []}])) },
];

// `indexes == []` means the root node (sequent) is focused
type TreeFocus = {indexes: number[], side: "lhs" | "rhs"}

function appliedLensOf(
  tree: ReductionTree,
  focus: TreeFocus,
): [Expr[] | null, (es: Expr[]) => ReductionTree] {
  const [index] = focus.indexes;
  if (index) {
    const up = tree.upper[index];
    if (up) {
      const [getter, subSetter] = appliedLensOf(up, {indexes: focus.indexes.slice(1), side: focus.side});
      const setter = (es: Expr[]) => ({
        sequent: tree.sequent,
        upper: tree.upper.slice(0, index).concat([subSetter(es)]).concat(tree.upper.slice(index + 1)),
      });
      return [getter, setter];
    } else {
      // a lens that points to nothing
      return [null, (_) => tree];
    }
  } else {
    if (focus.side === "lhs") {
      return [tree.sequent.lhs, (es) => ({sequent: {lhs: es, rhs: tree.sequent.rhs}, upper: tree.upper})];
    } else if (focus.side === "rhs") {
      return [tree.sequent.rhs, (es) => ({sequent: {lhs: tree.sequent.lhs, rhs: es}, upper: tree.upper})];
    } else {
      const n: never = focus.side;
      return n;
    }
  }
}

export type SequentInputProps = {
  lhs: Expr[],
  setLhs: (es: Expr[]) => void,
  rhs: Expr[],
  setRhs: (es: Expr[]) => void,
}

export const SequentInput = (props: SequentInputProps) => {
  const {lhs, setLhs, rhs, setRhs} = props;
  const [focused, setFocused] = useState(null as "lhs" | "rhs" | null);

  const [focusedExprs, setFocusedExprs] = (() => {
    if (focused === "lhs")
      return [lhs, setLhs];
    else if (focused === "rhs")
      return [rhs, setRhs];
    else
      return [null, () => {}];
  })();

  const sequentDisplay = (
    <div>
      <span
        id="lhs"
        className={"input" + (focused === "lhs" ? " focused" : "")}
        tabIndex={0}
        onFocus={() => { setFocused("lhs"); }}
        ref={me => { me && katex.render(lhs.length > 0 ? exprsToString(lhs) : "\\quad", me, theKatexOptions); }}
        />
      <span ref={me => { me && katex.render("\\; \\vdash \\;", me, theKatexOptions); }} />
      <span
        id="rhs"
        className={"input" + (focused === "rhs" ? " focused" : "")}
        tabIndex={0}
        onFocus={() => { setFocused("rhs"); }}
        ref={me => { me && katex.render(rhs.length > 0 ? exprsToString(rhs) : "\\quad", me, theKatexOptions); }}
        />
    </div>
  );

  const buttons = (
    <div>
      {buttonSpecs.map(buttonSpec => (
        <button
          key={buttonSpec.label}
          ref={me => { me && katex.render(buttonSpec.label, me, theKatexOptions); }}
          onClick={() => {
            const exprs = focusedExprs;
            if (exprs) {
              setFocusedExprs(buttonSpec.onClick(exprs));
            }
          }}
          >
        </button>
      ))}
      <button onClick={() => {
        const exprs = focusedExprs;
        if (exprs) {
          const [e] = exprs.slice(-1);
          if (e) {
            setFocusedExprs(exprs.slice(0, -1).concat(e.operands));
          }
        }
      }}>
        undo
      </button>
    </div>
  );

  return (
    <div>
      {buttons}
      {sequentDisplay}
    </div>
  );
};

import katex from 'katex';
import React from 'react';
import { useState } from 'react';

import { Expr, ReductionTree, TreeFocus, exprsAtFocus, exprsToString, theKatexOptions, treeToComponent } from './common';

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

function eqNumbers(xs: number[], ys: number[]): boolean {
  return xs.length == ys.length && xs.every((x, i) => x == ys[i]);
}

export type SequentInputProps = {
  tree: ReductionTree,
  setTree: (tree: ReductionTree) => void,
}

export const SequentInput = (props: SequentInputProps) => {
  const {tree, setTree} = props;
  // TODO reset focus when the tree structure has changed (e.g. a new sequent is added in the infer mode)
  const [focus, setFocus] = useState(null as TreeFocus | null);

  const sequentDisplay = treeToComponent(tree, (leaf: ReductionTree, indexes: number[]) => {
    // only leaf nodes should be able to have focus
    const katexRender = (es: Expr[], me: HTMLElement) => katex.render(es.length > 0 ? exprsToString(es) : "\\quad", me, theKatexOptions);
    return (
      <div className="katex-container">
        <span
          id="lhs"
          className={"input" + ((focus && eqNumbers(focus.indexes, indexes) && focus.side === "lhs") ? " focused" : "")}
          tabIndex={0}
          onFocus={() => { setFocus({indexes, side: "lhs"}); }}
          ref={me => { me && katexRender(leaf.sequent.lhs, me); }}
          />
        <span ref={me => { me && katex.render("\\; \\vdash \\;", me, theKatexOptions); }} />
        <span
          id="rhs"
          className={"input" + ((focus && eqNumbers(focus.indexes, indexes) && focus.side === "rhs") ? " focused" : "")}
          tabIndex={0}
          onFocus={() => { setFocus({indexes, side: "rhs"}); }}
          ref={me => { me && katexRender(leaf.sequent.rhs, me); }}
          />
      </div>
    );
  });

  const buttons = (
    <div>
      {buttonSpecs.map(buttonSpec => (
        <button
          key={buttonSpec.label}
          ref={me => { me && katex.render(buttonSpec.label, me, theKatexOptions); }}
          onClick={() => {
            if (focus != null) {
              setTree(exprsAtFocus(focus).modify(exprs => buttonSpec.onClick(exprs), tree));
            }
          }}
          >
        </button>
      ))}
      <button onClick={() => {
        if (focus != null) {
          setTree(exprsAtFocus(focus).modify(
            exprs => {
              const [e] = exprs.slice(-1);
              return (e == null) ? exprs : exprs.slice(0, -1).concat(e.operands);
            },
            tree,
          ));
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

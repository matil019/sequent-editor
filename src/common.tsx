import katex from 'katex';
import { KatexOptions } from 'katex';
import React from 'react';

import Optional from './optional';

export const theKatexOptions: KatexOptions = {
  throwOnError: false,
  trust: (context) => context.command === '\\htmlId',
  strict: (errorCode: string) => {
    if (errorCode === "htmlExtension")
      return "ignore";
    else
      return "warn";
  },
};

export type Expr = {
  me: string,
  // Lower values mean lower precedences i.e. more likely to require parentheses
  // (example: + would have a lower precedence than *)
  // "atom" indicates it never requires parentheses (equivalent to +Inf)
  precedence: number | "atom",
  associative: "none" | "left" | "right",
  operands: Expr[],
}

function paren(s: string): string {
  return "(" + s + ")";
}

export function exprToString(expr: Expr): string {
  // We assume that `expr.operands.length` is correct i.e. for "\\land", it's 2, for "A", it's 0, etc.
  const [op0, op1] = expr.operands;
  if (op0 == null) {
    return expr.me;
  } else if (op1 == null) {
    const sop0 = exprToString(op0);
    return expr.me + " " + (op0.precedence < expr.precedence ? paren(sop0) : sop0);
  } else {
    // we assume expr.operands.length === 2 i.e. `expr` is an infix operator
    // we also assume that the fixity is correct i.e. if the precedences are the same, left- and right- associativities don't mix
    const sop0 = exprToString(op0);
    const sop1 = exprToString(op1);
    return ((op0.precedence < expr.precedence || op0.precedence === expr.precedence && op0.associative === "right") ? paren(sop0) : sop0)
      + " " + expr.me + " "
      + ((op1.precedence < expr.precedence || op1.precedence === expr.precedence && op1.associative === "left") ? paren(sop1) : sop1);
  }
}

export function exprsToString(exprs: Expr[]): string {
  if (exprs.length > 0) {
    return exprs
      .map(expr => exprToString(expr))
      .reduce((acc, s) => acc + ", " + s);
  } else {
    return "";
  }
}

export type Sequent = {lhs: Expr[], rhs: Expr[]}

export type ReductionTree = { sequent: Sequent, upper: ReductionTree[] }

export const ReductionTree = {
  sequent: new Optional<ReductionTree, Sequent>(x => x.sequent, (sequent, x) => ({...x, sequent})),
  upper: new Optional<ReductionTree, ReductionTree[]>(x => x.upper, (upper, x) => ({...x, upper})),
};

// `indexes == []` means the root node (sequent) is focused
export type TreeFocus = {indexes: number[], side: "lhs" | "rhs"}

export function sequentAtIndexes(indexes: number[]): Optional<ReductionTree, Sequent> {
  return subtreeAtIndexes(indexes).compose(ReductionTree.sequent);
}

export function subtreeAtIndexes(indexes: number[]): Optional<ReductionTree, ReductionTree> {
  const [index] = indexes;
  if (index == null) {
    // point to self
    return new Optional(x => x, (y, _) => y);
  } else {
    return ReductionTree.upper.compose(Optional.index(index)).compose(subtreeAtIndexes(indexes.slice(1)));
  }
}

export function exprsAtSide(side: "lhs" | "rhs"): Optional<Sequent, Expr[]> {
  if (side === "lhs") {
    return new Optional(x => x.lhs, (lhs, x) => ({...x, lhs}));
  } else if (side === "rhs") {
    return new Optional(x => x.rhs, (rhs, x) => ({...x, rhs}));
  } else {
    const n: never = side;
    return n;
  }
}

export function exprsAtFocus(focus: TreeFocus): Optional<ReductionTree, Expr[]> {
  return sequentAtIndexes(focus.indexes).compose(exprsAtSide(focus.side));
}

export function treeToComponent(tree: ReductionTree, leafToComponent: (leaf: ReductionTree, indexes: number[]) => JSX.Element): JSX.Element {
  function recurse(subtree: ReductionTree, indexes: number[]): JSX.Element {
    if (subtree.upper.length > 0) {
      return (
        <>
          {subtree.upper.map((u, idx) => {
            const newIndexes = indexes.concat([idx]);
            return (
              <div className="sequent-lines" key={newIndexes.map(i => i.toString()).reduce((acc, s) => acc + "-" + s)}>
                {recurse(u, newIndexes)}
              </div>
            );
          })}
          <div className="inference-line" />
          <div className="katex-container" ref={me => {
            if (me) {
              const {sequent: {lhs, rhs}} = subtree;
              const s = exprsToString(lhs) + " \\vdash " + exprsToString(rhs);
              katex.render(s, me, theKatexOptions);
            }
          }} />
        </>
      );
    } else {
      return leafToComponent(subtree, indexes);
    }
  }
  return recurse(tree, []);
}

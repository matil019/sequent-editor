import katex from 'katex';
import { KatexOptions } from 'katex';
import React from 'react';

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
  const n = expr.operands.length;
  if (n === 0) {
    return expr.me;
  } else if (n === 1) {
    const op0 = expr.operands[0];
    const sop0 = exprToString(op0);
    return expr.me + " " + (op0.precedence < expr.precedence ? paren(sop0) : sop0);
  } else {
    // we assume n === 2 i.e. `expr` is an infix operator
    // we also assume that the fixity is correct i.e. if the precedences are the same, left- and right- associativities don't mix
    const op0 = expr.operands[0];
    const sop0 = exprToString(op0);
    const op1 = expr.operands[1];
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

// `indexes == []` means the root node (sequent) is focused
export type TreeFocus = {indexes: number[], side: "lhs" | "rhs"}

// A poor-man's lens which is already applied to its focus.
//
// *Note* this is technically an `AppliedOptional` because it may points to nothing (`emptyAppliedLens`).
export type AppliedLens<S, A> = [A | null, (b: A) => S]

// An applied lens that points to nothing
export function emptyAppliedLens<S, A>(s: S): AppliedLens<S, A> {
  return [null, (_) => s];
}

export function appliedLensOfSequent(
  tree: ReductionTree,
  indexes: number[],
): AppliedLens<ReductionTree, Sequent> {
  const [subtree, replaceSubtree] = appliedLensOfSubtree(tree, indexes);
  if (subtree) {
    return [subtree.sequent, (sequent) => replaceSubtree({...subtree, sequent})];
  } else {
    return emptyAppliedLens(tree);
  }
}

// Like `appliedLensOfSequent`, but returns a sub-`ReductionTree` instead of its `Sequent`.
export function appliedLensOfSubtree(
  tree: ReductionTree,
  indexes: number[],
): AppliedLens<ReductionTree, ReductionTree> {
  const [index] = indexes;
  if (index != null) {
    const up = tree.upper[index];
    if (up) {
      const [getter, subSetter] = appliedLensOfSubtree(up, indexes.slice(1));
      const setter = (subtree: ReductionTree) => ({
        ...tree,
        upper: tree.upper.slice(0, index).concat([subSetter(subtree)]).concat(tree.upper.slice(index + 1)),
      });
      return [getter, setter];
    } else {
      return emptyAppliedLens(tree);
    }
  } else {
    return [tree, (subtree) => subtree];
  }
}

export function appliedLensOfExprs(
  sequent: Sequent,
  side: "lhs" | "rhs",
): AppliedLens<Sequent, Expr[]> {
  if (side === "lhs") {
    return [sequent.lhs, (es) => ({...sequent, lhs: es})];
  } else if (side === "rhs") {
    return [sequent.rhs, (es) => ({...sequent, rhs: es})];
  } else {
    const n: never = side;
    return n;
  }
}

export function appliedLensOf(
  tree: ReductionTree,
  focus: TreeFocus,
): AppliedLens<ReductionTree, Expr[]> {
  const [sequent, replaceSequent] = appliedLensOfSequent(tree, focus.indexes);
  if (sequent) {
    const [exprs, replaceExprs] = appliedLensOfExprs(sequent, focus.side);
    return [exprs, (es) => replaceSequent(replaceExprs(es))];
  } else {
    return emptyAppliedLens(tree);
  }
}

export function treeToComponent(tree: ReductionTree, leafToComponent: (leaf: ReductionTree, indexes: number[]) => JSX.Element): JSX.Element {
  function recurse(subtree: ReductionTree, indexes: number[]): JSX.Element {
    if (subtree.upper.length > 0) {
      // TODO rename .separator to .inference-line
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
          <div className="separator" />
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

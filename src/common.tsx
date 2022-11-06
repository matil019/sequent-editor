import { KatexOptions } from 'katex';

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
  return exprs
    .map(expr => exprToString(expr))
    .reduce((acc, s) => acc + ", " + s);
}

export type ReductionTree = { sequent: {lhs: Expr[], rhs: Expr[]}, upper: ReductionTree[] }

// `indexes == []` means the root node (sequent) is focused
export type TreeFocus = {indexes: number[], side: "lhs" | "rhs"}

// An applied lens that points to nothing
export function emptyAppliedLens(tree: ReductionTree): [Expr[] | null, (es: Expr[]) => ReductionTree] {
  return [null, (_: Expr[]) => tree];
}

export function appliedLensOf(
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
      return emptyAppliedLens(tree);
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

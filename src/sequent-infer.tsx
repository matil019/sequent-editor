import katex from 'katex';
import React from 'react';
import { useId } from 'react';
import { Expr, ReductionTree, Sequent, TreeFocus, exprsAtSide, exprToString, subtreeAtIndexes, theKatexOptions, treeToComponent } from './common';

interface OpConj {
  kind: "conj";
  op1: Expr;
  op2: Expr;
}

interface OpDisj {
  kind: "disj";
  op1: Expr;
  op2: Expr;
}

interface OpImply {
  kind: "imply";
  op1: Expr;
  op2: Expr;
}

interface OpNeg {
  kind: "neg";
  op1: Expr;
}

// "Discriminated unions"
// https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
type Operator = OpConj | OpDisj | OpImply | OpNeg

function exprToOperator(expr: Expr): Operator | null {
  if (expr.me === "\\land") {
    const op1 = expr.operands[0];
    const op2 = expr.operands[1];
    return (op1 != null && op2 != null) ? ({ kind: "conj", op1, op2 }) : null;
  } else if (expr.me === "\\lor") {
    const op1 = expr.operands[0];
    const op2 = expr.operands[1];
    return (op1 != null && op2 != null) ? ({ kind: "disj", op1, op2 }) : null;
  } else if (expr.me === "\\to") {
    const op1 = expr.operands[0];
    const op2 = expr.operands[1];
    return (op1 != null && op2 != null) ? ({ kind: "imply", op1, op2 }) : null;
  } else if (expr.me === "\\neg") {
    const op1 = expr.operands[0];
    return (op1 != null) ? ({ kind: "neg", op1 }) : null;
  } else {
    return null;
  }
}

function renderClickableSequent(
  target: HTMLElement,
  exprs: Expr[],
  idPrefix: string,
  handleClickWhole: (index: number) => void,
  handleClickRoot: (index: number, op: Operator) => void,
): void {
  // "whole" means the whole proposition (i.e. outermost HTML DOM node)
  // "root" means the root node of the Expr tree structure (i.e. outermost Expr node, not DOM)
  const wholeId = (index: number) => `${idPrefix}${index.toString()}whole`;
  const rootId = (index: number) => `${idPrefix}${index.toString()}root`;
  const rootOpMap: Map<string, Operator> = new Map();
  const katexInput = exprs
    .map((expr, index) => {
      // Converts an Expr with a known operator to Operator.
      // Non-operators, malformed operators and unknown operators are ignored
      // (click event handlers won't be installed).
      const op = exprToOperator(expr);
      if (op != null) {
        rootOpMap.set(rootId(index), op);
        const exprWithId = {
          ...expr,
          me: `\\htmlId{${rootId(index)}}{${expr.me}}`,
        };
        return `\\htmlId{${wholeId(index)}}{${exprToString(exprWithId)}}`;
      } else {
        return `\\htmlId{${wholeId(index)}}{${exprToString(expr)}}`;
      }
    })
    .reduce(
      (acc, s, index) => ((index > 0) ? acc + ", " + s : s),
      // this value is used only when the array is empty. this is intentional
      "\\quad",
    );
  katex.render(katexInput, target, theKatexOptions);
  for (let index = 0; index < exprs.length; index++) {
    const wholeElem = document.getElementById(wholeId(index));
    if (wholeElem) {
      wholeElem.addEventListener("click", () => handleClickWhole(index));
    }
    const rootElem = document.getElementById(rootId(index));
    const rootOp = rootOpMap.get(rootId(index));
    if (rootElem != null && rootOp != null) {
      rootElem.addEventListener("click", (e) => {
        // Prevent the whole element from being triggered as well
        // (AFAIK root is always triggered before whole)
        e.stopPropagation();
        handleClickRoot(index, rootOp);
      });
    }
  }
}

// Inspired by Seq#patch from Scala
function patchArray<A>(arr: A[], start: number, newElems: A[], numReplace: number): A[] {
  return arr.slice(0, start).concat(newElems).concat(arr.slice(start + numReplace));
}

function doInfer(sequent: Sequent, side: "lhs" | "rhs", index: number, op: Operator): Sequent[] {
  // Since we don't know how to distribute unrelated exprs, we copy all of them to the upper
  // sequents. This makes the program incompatible with intuitionistic logic because one of the
  // RHS gets two exprs.
  // As a workaround, the user can apply WL/WR immediately.
  if (side === "lhs") {
    if (op.kind === "conj") {
      // ∧L
      return [exprsAtSide("lhs").modify(exprs => patchArray(exprs, index, [op.op1, op.op2], 1), sequent)];
    } else if (op.kind === "disj") {
      // ∨L
      return [
        exprsAtSide("lhs").modify(exprs => patchArray(exprs, index, [op.op1], 1), sequent),
        exprsAtSide("lhs").modify(exprs => patchArray(exprs, index, [op.op2], 1), sequent),
      ];
    } else if (op.kind === "imply") {
      // →L
      const sequent1 = exprsAtSide("lhs").modify(exprs => patchArray(exprs, index, [], 1), sequent);
      return [
        exprsAtSide("rhs").modify(exprs => [op.op1].concat(exprs), sequent1),
        exprsAtSide("lhs").modify(exprs => exprs.concat([op.op2]), sequent1),
      ];
    } else if (op.kind === "neg") {
      // ¬L
      return [
        exprsAtSide("lhs").modify(exprs => patchArray(exprs, index, [], 1),
          exprsAtSide("rhs").modify(exprs => [op.op1].concat(exprs), sequent)),
      ];
    } else {
      const n: never = op;
      return n;
    }
  } else if (side === "rhs") {
    if (op.kind === "conj") {
      // ∧R
      return [
        exprsAtSide("rhs").modify(exprs => patchArray(exprs, index, [op.op1], 1), sequent),
        exprsAtSide("rhs").modify(exprs => patchArray(exprs, index, [op.op2], 1), sequent),
      ];
    } else if (op.kind === "disj") {
      // ∨R
      return [exprsAtSide("rhs").modify(exprs => patchArray(exprs, index, [op.op1, op.op2], 1), sequent)];
    } else if (op.kind === "imply") {
      // →R
      return [
        exprsAtSide("lhs").modify(exprs => exprs.concat([op.op1]),
          exprsAtSide("rhs").modify(exprs => patchArray(exprs, index, [op.op2], 1), sequent)),
      ];
    } else if (op.kind === "neg") {
      // ¬R
      return [
        exprsAtSide("rhs").modify(exprs => patchArray(exprs, index, [], 1),
          exprsAtSide("lhs").modify(exprs => exprs.concat([op.op1]), sequent)),
      ];
    } else {
      const n: never = op;
      return n;
    }
  } else {
    const n: never = side;
    return n;
  }
}

export type SequentInferProps = {
  tree: ReductionTree,
  setTree: (tree: ReductionTree) => void,
}

export const SequentInfer = (props: SequentInferProps) => {
  const {tree, setTree} = props;
  const id = useId();

  // TODO implement actual behaviors
  const handleWhole = (index: number) => { console.log(index.toString() + " whole clicked!"); };
  const handleRoot = (index: number) => { console.log(index.toString() + " root clicked!"); };
  const handleRootLhs = (focus: TreeFocus) => (index: number, op: Operator) => {
    setTree(subtreeAtIndexes(focus.indexes).modify(
      subtree => {
        const newSequents = doInfer(subtree.sequent, focus.side, index, op);
        // Copy modified exprs to subtree.upper, instead of modifying subtree.sequent
        return ReductionTree.upper.replace(
          newSequents.map(s => ReductionTree.sequent.replace(s, subtree)),
          subtree,
        );
      },
      tree,
    ));
  };

  return treeToComponent(tree, (leaf: ReductionTree, indexes: number[]) => {
    // only leaf nodes should be modifiable
    const {sequent: {lhs, rhs}} = leaf;
    const leafId = indexes.reduce((acc, x) => acc + "-" + x.toString(), id);
    return (
      <div className="katex-container">
        <span ref={me => { me && renderClickableSequent(me, lhs, leafId + "lhs", handleWhole, handleRootLhs({indexes, side: "lhs"})); }} />
        <span ref={me => { me && katex.render("\\; \\vdash \\;", me, theKatexOptions); }} />
        <span ref={me => { me && renderClickableSequent(me, rhs, leafId + "rhs", handleWhole, handleRoot); }} />
      </div>
    );
  });
};

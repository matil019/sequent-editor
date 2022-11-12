import katex from 'katex';
import React from 'react';
import { useId } from 'react';
import { Expr, ReductionTree, Sequent, TreeFocus, exprsAtSide, exprToString, subtreeAtIndexes, theKatexOptions, treeToComponent } from './common';

function renderClickableSequent(
  target: HTMLElement,
  exprs: Expr[],
  idPrefix: string,
  handleClickWhole: (index: number) => void,
  handleClickRoot: (index: number) => void,
): void {
  // "whole" means the whole proposition (i.e. outermost HTML DOM node)
  // "root" means the root node of the Expr tree structure (i.e. outermost Expr node, not DOM)
  const wholeId = (index: number) => `${idPrefix}${index.toString()}whole`;
  const rootId = (index: number) => `${idPrefix}${index.toString()}root`;
  const katexInput = exprs
    .map((expr, index) => {
      if (expr.operands.length > 0) {
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
    if (rootElem) {
      rootElem.addEventListener("click", (e) => {
        // Prevent the whole element from being triggered as well
        // (AFAIK root is always triggered before whole)
        e.stopPropagation();
        handleClickRoot(index);
      });
    }
  }
}

export type SequentInferProps = {
  tree: ReductionTree,
  setTree: (tree: ReductionTree) => void,
}

// Inspired by Seq#patch from Scala
function patchArray<A>(arr: A[], start: number, newElems: A[], numReplace: number): A[] {
  return arr.slice(0, start).concat(newElems).concat(arr.slice(start + numReplace));
}

function doInfer(sequent: Sequent, side: "lhs" | "rhs", index: number): Sequent[] {
  if (side === "lhs") {
    const expr = sequent.lhs[index];
    // TODO use "Discriminated unions" to get rid of non-null assertions
    // https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
    if (expr?.me === "\\land") {
      // ∧L
      return [exprsAtSide("lhs").modify(exprs => patchArray(exprs, index, expr.operands, 1), sequent)];
    } else if (expr?.me === "\\lor") {
      // ∨L
      return [
        exprsAtSide("lhs").modify(exprs => patchArray(exprs, index, [expr.operands[0]!], 1), sequent),
        exprsAtSide("lhs").modify(exprs => patchArray(exprs, index, [expr.operands[1]!], 1), sequent),
      ];
    } else if (expr?.me === "\\to") {
      // →L
      // Since we don't know how to distribute unrelated exprs, we copy all of them to the upper
      // sequents. This makes the program incompatible with intuitionistic logic because one of the
      // RHS gets two exprs. As a workaround, the user can apply WR immediately.
      const sequent1 = exprsAtSide("lhs").modify(exprs => patchArray(exprs, index, [], 1), sequent);
      return [
        exprsAtSide("rhs").modify(exprs => [expr.operands[0]!].concat(exprs), sequent1),
        exprsAtSide("lhs").modify(exprs => exprs.concat([expr.operands[1]!]), sequent1),
      ];
    } else if (expr?.me === "\\neg") {
      // ¬L
      // This keeps the RHS, making it incompatible with intuitionistic logic.
      return [
        exprsAtSide("lhs").modify(exprs => patchArray(exprs, index, [], 1),
          exprsAtSide("rhs").modify(exprs => [expr.operands[0]!].concat(exprs), sequent)),
      ];
    } else {
      throw `Unknown expr: ${expr?.me}`;
    }
  } else if (side === "rhs") {
    throw `RHS inference not yet implemented`;
  } else {
    const n: never = side;
    return n;
  }
}

export const SequentInfer = (props: SequentInferProps) => {
  const {tree, setTree} = props;
  const id = useId();

  // TODO implement actual behaviors
  const handleWhole = (index: number) => { console.log(index.toString() + " whole clicked!"); };
  const handleRoot = (index: number) => { console.log(index.toString() + " root clicked!"); };
  const handleRootLhs = (focus: TreeFocus) => (index: number) => {
    setTree(subtreeAtIndexes(focus.indexes).modify(
      subtree => {
        const newSequents = doInfer(subtree.sequent, focus.side, index);
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

import katex from 'katex';
import React from 'react';
import { useId } from 'react';
import { Expr, ReductionTree, TreeFocus, appliedLensOf, appliedLensOfSubtree, exprToString, theKatexOptions, treeToComponent } from './common';

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

function patchArray<A>(arr: A[], start: number, newElems: A[], numReplace: number): A[] {
  return arr.slice(0, start).concat(newElems).concat(arr.slice(start + numReplace));
}

export const SequentInfer = (props: SequentInferProps) => {
  const {tree, setTree} = props;
  const id = useId();

  // TODO implement actual behaviors
  const handleWhole = (index: number) => { console.log(index.toString() + " whole clicked!"); };
  const handleRoot = (index: number) => { console.log(index.toString() + " root clicked!"); };
  const handleRootLhs = (focus: TreeFocus) => (index: number) => {
    const [subtree, replaceSubtree] = appliedLensOfSubtree(tree, focus.indexes);
    if (subtree) {
      // Here, it is assumed that `focus` points to a leaf of `ReductionTree`
      const [exprs, replaceExprs] = appliedLensOf(subtree, {...focus, indexes: []});
      if (exprs) {
        const expr = exprs[index];
        // TODO should `expr.me` be a union?
        if (expr.me === "\\land") {
          // ∧L
          // Add an upper sequent, instead of modifying this sequent
          setTree(replaceSubtree({
            ...subtree,
            upper: [replaceExprs(patchArray(exprs, index, expr.operands, 1))],
          }));
        } else if (expr.me === "\\lor") {
          // ∨L
          setTree(replaceSubtree({
            ...subtree,
            upper: [
              replaceExprs(patchArray(exprs, index, [expr.operands[0]], 1)),
              replaceExprs(patchArray(exprs, index, [expr.operands[1]], 1)),
            ],
          }));
        } else {
          throw `Unknown expr: ${expr.me}`;
        }
      }
    }
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

import katex from 'katex';
import React from 'react';
import { useId } from 'react';
import { Expr, exprToString, theKatexOptions } from './common';

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
  lhs: Expr[],
  rhs: Expr[],
}

export const SequentInfer = (props: SequentInferProps) => {
  const id = useId();
  const {lhs, rhs} = props;
  // TODO implement actual behaviors
  const handleWhole = (index: number) => { console.log(index.toString() + " whole clicked!"); };
  const handleRoot = (index: number) => { console.log(index.toString() + " root clicked!"); };
  return (
    <div>
      <span ref={me => { me && renderClickableSequent(me, lhs, id + "lhs", handleWhole, handleRoot); }} />
      <span ref={me => { me && katex.render("\\; \\vdash \\;", me, theKatexOptions); }} />
      <span ref={me => { me && renderClickableSequent(me, rhs, id + "rhs", handleWhole, handleRoot); }} />
    </div>
  );
};

import katex from 'katex';
import React from 'react';
import { Expr, theKatexOptions } from './common';

export type SequentInferProps = {
  lhs: Expr[],
  rhs: Expr[],
}

export const SequentInfer = (props: SequentInferProps) => {
  const {lhs, rhs} = props;
  const exprsToString = (x: any) => ""; // TODO put id attributes
  return (
    <div>
      <span ref={me => { me && katex.render(lhs.length > 0 ? exprsToString(lhs) : "\\quad", me, theKatexOptions); }} />
      <span ref={me => { me && katex.render("\\; \\vdash \\;", me, theKatexOptions); }} />
      <span ref={me => { me && katex.render(rhs.length > 0 ? exprsToString(rhs) : "\\quad", me, theKatexOptions); }} />
    </div>
  );
};

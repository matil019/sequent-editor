import katex from 'katex';
import React from 'react';

import { Expr, theKatexOptions } from './common';

// TODO expr -> {lhs: Expr[], rhs: Expr[]}
export type ReductionTree = { expr: string, upper: ReductionTree[] }

export const ReductionTree = ({tree}: {tree: ReductionTree}) => {
  if (tree.upper.length > 0) {
    return (
      <div className="sequent-lines">
        <div className="sequent-lines">
          {tree.upper.map(u => <ReductionTree tree={u} />)}
        </div>
        <div className="separator" /> // TODO rename to inference-line
        <div className="katex-container" ref={me => { me && katex.render(tree.expr, me, theKatexOptions); }} />
      </div>
    );
  } else {
    return (
      <div className="katex-container" ref={me => { me && katex.render(tree.expr, me, theKatexOptions); }} />
    );
  }
};

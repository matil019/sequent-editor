import katex from 'katex';

import { Expr, theKatexOptions } from './common';

// TODO expr -> {lhs: Expr[], rhs: Expr[]}
export type ReductionTree = { expr: string, upper: ReductionTree[] }

function makeKatexDiv(expr: string): HTMLDivElement {
  const div = document.createElement("div");
  katex.render(expr, div, theKatexOptions);
  div.className = "katex-container";
  return div;
}

export function renderReductionTree(tree: ReductionTree) {
  if (tree.upper.length > 0) {
    const containerUpper = document.createElement("div");
    containerUpper.className = "sequent-lines";
    tree.upper.map(u => renderReductionTree(u))
      .forEach(d => containerUpper.appendChild(d));

    const separator = document.createElement("div");
    separator.className = "separator";

    const sequentLower = makeKatexDiv(tree.expr);

    const containerWhole = document.createElement("div");
    containerWhole.className = "sequent-lines";
    containerWhole.appendChild(containerUpper);
    containerWhole.appendChild(separator);
    containerWhole.appendChild(sequentLower);

    return containerWhole;
  } else {
    return makeKatexDiv(tree.expr);
  }
}

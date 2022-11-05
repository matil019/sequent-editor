import katex from 'katex';
import { KatexOptions } from 'katex';

type Sequent = { expr: string, upper: Sequent[] }

const theKatexOptions: KatexOptions = {
  throwOnError: false,
  trust: (context) => context.command === '\\htmlId',
  strict: (errorCode: string) => {
    if (errorCode === "htmlExtension")
      return "ignore";
    else
      return "warn";
  },
};

function makeKatexDiv(expr: string): HTMLDivElement {
  const div = document.createElement("div");
  katex.render(expr, div, theKatexOptions);
  div.className = "katex-container";
  return div;
}

function renderSequent(s: Sequent) {
  if (s.upper.length > 0) {
    const containerUpper = document.createElement("div");
    containerUpper.className = "sequent-lines";
    s.upper.map(u => renderSequent(u))
      .forEach(d => containerUpper.appendChild(d));

    const separator = document.createElement("div");
    separator.className = "separator";

    const sequentLower = makeKatexDiv(s.expr);

    const containerWhole = document.createElement("div");
    containerWhole.className = "sequent-lines";
    containerWhole.appendChild(containerUpper);
    containerWhole.appendChild(separator);
    containerWhole.appendChild(sequentLower);

    return containerWhole;
  } else {
    return makeKatexDiv(s.expr);
  }
}

type Expr = {
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

function exprToString(expr: Expr): string {
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

function exprsToString(exprs: Expr[]): string {
  return exprs
    .map((expr, i) => {
      const s = exprToString(expr);
      return (i === 0) ? s : ", " + s;
    })
    .reduce((a, b) => a + b, "");
}

function exprsPairToString(lhs: Expr[], rhs: Expr[]): string {
  const slhs = exprsToString(lhs);
  const srhs = exprsToString(rhs);
  return slhs + " \\vdash " + srhs;
}

{
  let lhs: Expr[] = [];
  let rhs: Expr[] = [];

  const editDisplay = document.createElement("div");
  document.body.appendChild(editDisplay);

  const doRender = () => {
    const s = exprsPairToString(lhs, rhs);
    katex.render(s, editDisplay, theKatexOptions);
  };

  const buttonsDiv = document.createElement("div");

  const buttonSpecs: {label: string, onClick: (es: Expr[]) => void}[] = [
    { label: "A", onClick: (es) => { es.push({me: "A", precedence: "atom", associative: "none", operands: []}); } },
    { label: "B", onClick: (es) => { es.push({me: "B", precedence: "atom", associative: "none", operands: []}); } },
    { label: "C", onClick: (es) => { es.push({me: "C", precedence: "atom", associative: "none", operands: []}); } },
    { label: "D", onClick: (es) => { es.push({me: "D", precedence: "atom", associative: "none", operands: []}); } },
    { label: "\\Gamma", onClick: (es) => { es.push({me: "\\Gamma", precedence: "atom", associative: "none", operands: []}); } },
    { label: "\\Delta", onClick: (es) => { es.push({me: "\\Delta", precedence: "atom", associative: "none", operands: []}); } },
    { label: "\\Sigma", onClick: (es) => { es.push({me: "\\Sigma", precedence: "atom", associative: "none", operands: []}); } },
    { label: "\\Pi", onClick: (es) => { es.push({me: "\\Pi", precedence: "atom", associative: "none", operands: []}); } },
    { label: "\\land", onClick: (es) => {
      const e2 = es.pop();
      if (e2) {
        const e1 = es.pop();
        if (e1) {
          es.push({me: "\\land", precedence: 3, associative: "none", operands: [e1, e2]});
        } else {
          es.push(e2);
        }
      }
    }},
    { label: "\\lor", onClick: (es) => {
      const e2 = es.pop();
      if (e2) {
        const e1 = es.pop();
        if (e1) {
          es.push({me: "\\lor", precedence: 2, associative: "none", operands: [e1, e2]});
        } else {
          es.push(e2);
        }
      }
    }},
    { label: "\\to", onClick: (es) => {
      const e2 = es.pop();
      if (e2) {
        const e1 = es.pop();
        if (e1) {
          es.push({me: "\\to", precedence: 1, associative: "right", operands: [e1, e2]});
        } else {
          es.push(e2);
        }
      }
    }},
    { label: "\\neg", onClick: (es) => {
      const e1 = es.pop();
      if (e1) {
        es.push({me: "\\neg", precedence: 9, associative: "right", operands: [e1]});
      }
    }},
    { label: "\\bot", onClick: (es) => { es.push({me: "\\bot", precedence: "atom", associative: "none", operands: []}); } },
  ];

  for (const buttonSpec of buttonSpecs) {
    const button = document.createElement("button");
    katex.render(buttonSpec.label, button, theKatexOptions);
    button.addEventListener("click", () => {
      buttonSpec.onClick(lhs);
      doRender();
    });
    buttonsDiv.appendChild(button);
  }

  document.body.appendChild(buttonsDiv);
}

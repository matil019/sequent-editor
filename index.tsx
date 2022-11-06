import katex from 'katex';
import { KatexOptions } from 'katex';
import React from 'react';
import { useState } from 'react';
import ReactDOM from 'react-dom/client';

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

const buttonSpecs: {label: string, onClick: (es: Expr[]) => Expr[]}[] = [
  { label: "A", onClick: (es) => (es.concat([{me: "A", precedence: "atom", associative: "none", operands: []}])) },
  { label: "B", onClick: (es) => (es.concat([{me: "B", precedence: "atom", associative: "none", operands: []}])) },
  { label: "C", onClick: (es) => (es.concat([{me: "C", precedence: "atom", associative: "none", operands: []}])) },
  { label: "D", onClick: (es) => (es.concat([{me: "D", precedence: "atom", associative: "none", operands: []}])) },
  { label: "\\Gamma", onClick: (es) => (es.concat([{me: "\\Gamma", precedence: "atom", associative: "none", operands: []}])) },
  { label: "\\Delta", onClick: (es) => (es.concat([{me: "\\Delta", precedence: "atom", associative: "none", operands: []}])) },
  { label: "\\Sigma", onClick: (es) => (es.concat([{me: "\\Sigma", precedence: "atom", associative: "none", operands: []}])) },
  { label: "\\Pi", onClick: (es) => (es.concat([{me: "\\Pi", precedence: "atom", associative: "none", operands: []}])) },
  { label: "\\land", onClick: (es) => {
    const [e1, e2] = es.slice(-2);
    if (e1 && e2) {
      return es.slice(0, -2).concat([{me: "\\land", precedence: 3, associative: "none", operands: [e1, e2]}]);
    } else {
      return es;
    }
  }},
  { label: "\\lor", onClick: (es) => {
    const [e1, e2] = es.slice(-2);
    if (e1 && e2) {
      return es.slice(0, -2).concat([{me: "\\lor", precedence: 2, associative: "none", operands: [e1, e2]}]);
    } else {
      return es;
    }
  }},
  { label: "\\to", onClick: (es) => {
    const [e1, e2] = es.slice(-2);
    if (e1 && e2) {
      return es.slice(0, -2).concat([{me: "\\to", precedence: 1, associative: "right", operands: [e1, e2]}]);
    } else {
      return es;
    }
  }},
  { label: "\\neg", onClick: (es) => {
    const [e1] = es.slice(-1);
    if (e1) {
      return es.slice(0, -1).concat([{me: "\\neg", precedence: 9, associative: "right", operands: [e1]}]);
    } else {
      return es;
    }
  }},
  { label: "\\bot", onClick: (es) => (es.concat([{me: "\\bot", precedence: "atom", associative: "none", operands: []}])) },
];

const App = () => {
  const [lhs, setLhs] = useState([] as Expr[]);
  const [rhs, setRhs] = useState([] as Expr[]);
  const [focused, setFocused] = useState(null as "lhs" | "rhs" | null);

  const [focusedExprs, setFocusedExprs] = (() => {
    if (focused === "lhs")
      return [lhs, setLhs];
    else if (focused === "rhs")
      return [rhs, setRhs];
    else
      return [null, null];
  })();

  const sequentDisplay = (
    <div>
      <span
        id="lhs"
        className="input"
        tabIndex={0}
        onFocus={() => { setFocused("lhs"); }}
        ref={me => { me && katex.render(lhs.length > 0 ? exprsToString(lhs) : "\\quad", me, theKatexOptions) }}
        >
      </span>
      <span ref={me => { me && katex.render("\\; \\vdash \\;", me, theKatexOptions); }}>
      </span>
      <span
        id="rhs"
        className="input"
        tabIndex={0}
        onFocus={() => { setFocused("rhs"); }}
        ref={me => { me && katex.render(rhs.length > 0 ? exprsToString(rhs) : "\\quad", me, theKatexOptions) }}
        >
      </span>
    </div>
  );

  const buttons = (
    <div>
      {buttonSpecs.map(buttonSpec => (
        <button
          ref={me => { me && katex.render(buttonSpec.label, me, theKatexOptions); }}
          onClick={() => {
            const exprs = focusedExprs;
            if (exprs) {
              setFocusedExprs!(buttonSpec.onClick(exprs));
            }
          }}
          >
        </button>
      ))}
      <button onClick={() => {
        const exprs = focusedExprs;
        if (exprs) {
          const [e] = exprs.slice(-1);
          if (e) {
            setFocusedExprs!(exprs.slice(0, -1).concat(e.operands));
          }
        }
      }}>
        undo
      </button>
    </div>
  );

  return (
    <>
      {sequentDisplay}
      {buttons}
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);

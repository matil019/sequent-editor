import katex from 'katex';
import React from 'react';
import { useId, useState } from 'react';
import ReactDOM from 'react-dom/client';

import { Expr, theKatexOptions } from './common';
import { SequentInfer, SequentInferProps } from './sequent-infer';
import { SequentInput, SequentInputProps } from './sequent-input';

type Sequent = { expr: string, upper: Sequent[] }

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

const App = () => {
  const id = useId();
  const [mode, setMode] = useState("input" as "input" | "infer");
  const [lhs, setLhs] = useState([] as Expr[]);
  const [rhs, setRhs] = useState([] as Expr[]);

  return (
    <>
      <div>
        <input
          type="radio"
          id={id + "modeinput"}
          name="mode"
          checked={mode === "input"}
          onChange={e => { if (e.target.checked) setMode("input"); }}
          />
        <label htmlFor={id + "modeinput"}>Input</label>
        <input
          type="radio"
          id={id + "modeinfer"}
          name="mode"
          checked={mode === "infer"}
          onChange={e => { if (e.target.checked) setMode("infer"); }}
          />
        <label htmlFor={id + "modeinfer"}>Infer</label>
      </div>
      {(() => {
        if (mode === "input") {
          return <SequentInput lhs={lhs} setLhs={setLhs} rhs={rhs} setRhs={setRhs} />;
        } else {
          return <SequentInfer lhs={lhs} rhs={rhs} />;
        }
      })()}
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);

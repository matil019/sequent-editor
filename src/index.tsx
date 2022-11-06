import React from 'react';
import { useId, useState } from 'react';
import ReactDOM from 'react-dom/client';

import { Expr, ReductionTree } from './common';
import { SequentInfer } from './sequent-infer';
import { SequentInput } from './sequent-input';

const App = () => {
  const id = useId();
  const [mode, setMode] = useState("input" as "input" | "infer");
  const [tree, setTree] = useState({sequent: {lhs: [], rhs: []}, upper: []} as ReductionTree);

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
          return <SequentInput tree={tree} setTree={setTree} />;
        } else {
          // TODO pass tree and setTree themselves
          const {sequent: {lhs, rhs}, upper} = tree;
          const setLhs = (es: Expr[]) => ({sequent: {lhs: es, rhs}, upper});
          const setRhs = (es: Expr[]) => ({sequent: {lhs, rhs: es}, upper});
          return <SequentInfer lhs={lhs} setLhs={setLhs} rhs={rhs} setRhs={setRhs} />;
        }
      })()}
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);

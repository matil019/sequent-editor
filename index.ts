import katex from 'katex';

type Sequent = { expr: string, upper: Sequent[] }

function makeKatexDiv(expr: string): HTMLDivElement {
  const div = document.createElement("div");
  katex.render(expr, div, {
    throwOnError: false,
    trust: (context) => context.command === '\\htmlId',
    strict: (errorCode: string) => {
      if (errorCode === "htmlExtension")
        return "ignore";
      else
        return "warn";
    },
  });
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

const x = renderSequent(
  {
    upper: [
      {
        upper: [
          {
            upper: [
              {
                upper: [
                  { upper: [], expr: "\\neg (A \\lor \\neg A) \\vdash \\neg A" },
                ],
                expr: "\\neg (A \\lor \\neg A) \\vdash A \\lor \\neg A"
              },
              {
                upper: [{ upper: [], expr: "" }],
                expr: "\\bot \\vdash \\bot"
              },
            ],
            expr: "\\neg (A \\lor \\neg A), \\neg (A \\lor \\neg A) \\vdash \\bot"
          }
        ],
        expr: "\\neg (A \\lor \\neg A) \\vdash \\bot"
      },
    ],
    expr: "\\vdash \\neg \\neg (A \\lor \\neg A)",
  },
);
document.body.appendChild(x);

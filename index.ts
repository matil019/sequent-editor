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

function renderSequent(s: Sequent, dst: HTMLElement) {
  if (s.upper.length > 0) {
    const containerUpper = document.createElement("div");
    containerUpper.className = "sequent-line";
    s.upper.map(u => renderSequent(u, containerUpper));

    const containerLower = document.createElement("div");
    containerLower.className = "sequent-line";
    const div = makeKatexDiv(s.expr);
    containerLower.appendChild(div);

    const separator = document.createElement("div");
    separator.className = "separator";

    dst.appendChild(containerUpper);
    dst.appendChild(separator);
    dst.appendChild(containerLower);

    // bounding rects are calculated after appending
    separator.style.width = Math.max(containerUpper.getBoundingClientRect().width, containerLower.getBoundingClientRect().width).toString() + "px";
  } else {
    const div = makeKatexDiv(s.expr);
    dst.appendChild(div);
  }
}

renderSequent(
  {
    upper: [
      { upper: [], expr: "\\Gamma \\vdash A" },
      { upper: [], expr: "\\Delta, A \\vdash C" },
    ],
    expr: "\\Gamma, \\Delta \\vdash C",
  },
  document.body
);

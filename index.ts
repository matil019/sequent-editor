import katex from 'katex';

const s1a = "\\Gamma \\vdash A";
const s1b = "\\Delta, A \\vdash C";
const s2  = "\\Gamma, \\Delta \\vdash C";

function putKatex(expr: string, dst: HTMLElement): HTMLDivElement {
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
  dst.appendChild(div);
  return div;
}

const div1a = putKatex(s1a, document.getElementById("s1")!);
const div1b = putKatex(s1b, document.getElementById("s1")!);
const div2  = putKatex(s2,  document.getElementById("s2")!);

const sep = document.getElementById("sep")!;
sep.style.width = Math.max(div1a.getBoundingClientRect().width + div1b.getBoundingClientRect().width, div2.getBoundingClientRect().width).toString() + "px";

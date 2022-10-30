import katex from 'katex';

const whole = document.createElement("div");
// const expr = String.raw`c = \pm\sqrt{\htmlId{here}{a}^2 + b^2}`
// const expr = String.raw`c = \pm\sqrt{\htmlId{here}{a^2 + b^2}}`
// const expr = String.raw`\vdash \neg\neg(A \lor \htmlId{here}{\neg A})`
const expr = String.raw`\dfrac{}{\vdash \neg\neg(A \lor \htmlId{here}{\neg A})}`
katex.render(expr, whole, {
  throwOnError: false,
  trust: (context) => context.command === '\\htmlId',
  strict: (errorCode: string) => {
    if (errorCode === "htmlExtension")
      return "ignore";
    else
      return "warn";
  },
});
document.body.appendChild(whole);

// z-indexが効かないのでpointer-eventsでワークアラウンド
// KaTeX全体を一旦マウスを無視するように指定した上で、目的の要素だけマウスに反応するようにする
whole.style.setProperty('pointer-events', 'none');
const here = document.getElementById("here")!;
here.style.setProperty('pointer-events', 'initial');
here.addEventListener('mouseenter', () => {
  here.style.setProperty('color', 'red');
});
here.addEventListener('mouseleave', () => {
  here.style.removeProperty('color');
});
here.addEventListener('click', () => {
  alert("you clicked `not A`!");
});

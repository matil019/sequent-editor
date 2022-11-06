import { KatexOptions } from 'katex';

export const theKatexOptions: KatexOptions = {
  throwOnError: false,
  trust: (context) => context.command === '\\htmlId',
  strict: (errorCode: string) => {
    if (errorCode === "htmlExtension")
      return "ignore";
    else
      return "warn";
  },
};

export type Expr = {
  me: string,
  // Lower values mean lower precedences i.e. more likely to require parentheses
  // (example: + would have a lower precedence than *)
  // "atom" indicates it never requires parentheses (equivalent to +Inf)
  precedence: number | "atom",
  associative: "none" | "left" | "right",
  operands: Expr[],
}

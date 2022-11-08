class Optional<S, A> {
  get: (s: S) => A | null;
  replace: (b: A, s: S) => S;

  constructor(_get: (s: S) => A | null, _set: (b: A, s: S) => S) {
    this.get = _get;
    this.replace = _set;
  }

  compose<C>(that: Optional<A, C>): Optional<S, C> {
    return new Optional<S, C>(
      s => { const a = this.get(s); return (a == null) ? null : that.get(a); },
      (d, s) => { const a = this.get(s); return (a == null) ? s : this.replace(that.replace(d, a), s); },
    );
  }

  static empty<S, A>(): Optional<S, A> {
    return new Optional<S, A>(_ => null, (_, s) => s);
  }

  static index<A>(i: number): Optional<A[], A> {
    return new Optional<A[], A>(
      xs => {
        // 範囲外添え字アクセスはnullではなくundefinedなので== null分岐で捕らえてnullにする(念のため)
        const x = xs[i];
        return (x == null) ? null : x;
      },
      (y, xs) => {
        // iは整数でないこともありうるので大小比較ではなく添え字アクセスを使って範囲チェックする(念のため)
        const x = xs[i];
        if (x == null) {
          return xs;
        } else {
          const ys = xs.concat();
          ys[i] = y;
          return ys;
        }
      },
    );
  }
}

export default Optional;

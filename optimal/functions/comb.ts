export function* kComb(n: number, k: number): Generator<number[]> {
    if (k <= 0 || k > n) return;
    const c = Array.from({ length: k }, (_, i) => i);
    while (true) {
      yield [...c];
      let i = k - 1;
      while (i >= 0 && c[i] === n - k + i) i--;
      if (i < 0) return;
      c[i]++;
      for (let j = i + 1; j < k; j++) c[j] = c[j - 1] + 1;
    }
  }
  
  export function C(n: number, k: number): number {
    if (k < 0 || k > n) return 0;
    k = Math.min(k, n - k);
    let r = 1;
    for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
    return Math.round(r);
  }
  
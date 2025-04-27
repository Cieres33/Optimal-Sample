const pop32 = (x: number) => {
    x -= (x >>> 1) & 0x55555555;
    x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
    x = (x + (x >>> 4)) & 0x0f0f0f0f;
    x += x >>> 8; x += x >>> 16;
    return x & 0x3f;
  };
  
  export class BitSet {
    private w: Uint32Array;
    constructor(bits: number) { this.w = new Uint32Array((bits + 31) >>> 5); }
    set(i: number) { this.w[i >>> 5] |= 1 << (i & 31); }
    andNot(o: BitSet) { for (let i = 0; i < this.w.length; i++) this.w[i] &= ~o.w[i]; }
    countAnd(o: BitSet) { let c = 0; for (let i = 0; i < this.w.length; i++) c += pop32(this.w[i] & o.w[i]); return c; }
    isZero() { for (const x of this.w) if (x) return false; return true; }
  }
  
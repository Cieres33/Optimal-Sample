const pop32 = (x: number) => {
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  x = (x + (x >>> 4)) & 0x0f0f0f0f;
  x += x >>> 8; x += x >>> 16;
  return x & 0x3f;
};

export class BitSet {
  private words: Uint32Array;
  constructor(bits: number) { this.words = new Uint32Array((bits + 31) >>> 5); }
  set(i: number) { this.words[i >>> 5] |= 1 << (i & 31); }
  get(i: number) { return (this.words[i >>> 5] & (1 << (i & 31))) !== 0; } // 新增：检查位是否被设置
  andNot(o: BitSet) { for (let i = 0; i < this.words.length; i++) this.words[i] &= ~o.words[i]; }
  countAnd(o: BitSet) { let c = 0; for (let i = 0; i < this.words.length; i++) c += pop32(this.words[i] & o.words[i]); return c; }
  isZero() { for (const x of this.words) if (x) return false; return true; }
  public getWords(): Uint32Array {
    return this.words;
  }
}
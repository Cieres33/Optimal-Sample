class BitSet(bits: Int) {
    private val words: IntArray = IntArray((bits + 31) ushr 5)
    
    fun set(i: Int) {
        val wordIndex = i ushr 5
        words[wordIndex] = words[wordIndex] or (1 shl (i and 31))
    }
    
    fun get(i: Int): Boolean {
        val wordIndex = i ushr 5
        return (words[wordIndex] and (1 shl (i and 31))) != 0
    }
    
    fun andNot(o: BitSet) {
        for (i in words.indices) {
            words[i] = words[i] and o.words[i].inv()
        }
    }
    
    fun countAnd(o: BitSet): Int {
        var c = 0
        for (i in words.indices) {
            c += (words[i] and o.words[i]).countOneBits()
        }
        return c
    }
    
    fun isZero(): Boolean {
        return words.all { it == 0 }
    }
    
    fun getWords(): IntArray {
        return words
    }
}

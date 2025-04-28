import kotlin.math.roundToInt

class Comb {
    companion object {
        fun kComb(n: Int, k: Int): List<List<Int>> {
            val result = mutableListOf<List<Int>>()
            if (k <= 0 || k > n) return result
            
            val c = IntArray(k) { i -> i }
            
            while (true) {
                result.add(c.toList())
                
                var i = k - 1
                while (i >= 0 && c[i] == n - k + i) i--
                
                if (i < 0) break
                
                c[i]++
                for (j in i + 1 until k) {
                    c[j] = c[j - 1] + 1
                }
            }
            
            return result
        }
        
        fun calculateC(n: Int, k: Int): Int {
            if (k < 0 || k > n) return 0
            val minK = minOf(k, n - k)
            var r = 1.0
            for (i in 1..minK) {
                r = (r * (n - minK + i)) / i
            }
            return r.roundToInt()
        }
    }
}

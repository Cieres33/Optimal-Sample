class Optimal {
    data class Params(
        val m: Int,
        val n: Int,
        val k: Int,
        val j: Int,
        val s: Int,
        val minSGroups: Int = 1,
        val seed: Long? = null,
        val toLabel: Boolean = false,
        val timeoutMs: Long = 60_000
    )

    data class Result(
        val samplePool: List<Any>,
        val groups: List<List<Any>>,
        val ms: Long
    )

    companion object {
        fun randSample(m: Int, n: Int, seed: Long = System.currentTimeMillis()): List<Int> {
            var currentSeed = seed
            val a = MutableList(m) { i -> i + 1 }
            
            for (i in a.size - 1 downTo 1) {
                currentSeed = (currentSeed * 16807) % 2147483647
                val r = (currentSeed % (i + 1)).toInt()
                val temp = a[i]
                a[i] = a[r]
                a[r] = temp
            }
            
            return a.take(n)
        }

        fun label(x: Int): String {
            return if (x < 10) "0$x" else "$x"
        }

        fun solve(p: Params): Result {
            val (m, n, k, j, s, minSGroups, seed, toLabel, timeoutMs) = p
            
            if (n > 25 || k > 7) throw IllegalArgumentException("beyond spec")

            val pool = randSample(m, n, seed ?: System.currentTimeMillis())
            val t0 = System.currentTimeMillis()
            val deadline = t0 + timeoutMs


            var bestGroups = Solver.greedyCover(n, k, j, s, minSGroups, pool, deadline)

            if (n <= 15) {

                val localGroups = Solver.localSearch(bestGroups, pool, n, j, s, minSGroups, deadline)
                bestGroups = localGroups
                

                if (n <= 9 && k <= 7) {
                    val remainingTime = deadline - System.currentTimeMillis()

                    if (remainingTime > 10000) {
                        try {
                            val saGroups = Solver.simulatedAnnealing(
                                bestGroups, pool, n, j, s, k, minSGroups, deadline
                            )
                            
                            if (saGroups.size < bestGroups.size) {
                                bestGroups = saGroups
                            }
                        } catch (e: Exception) {
                            println("Simulated annealing failed: ${e.message}")
                        }
                    }
                }
            }

            val ms = System.currentTimeMillis() - t0
            
            if (toLabel) {
                val map = mutableMapOf<Int, String>()
                pool.forEachIndexed { i, num -> map[num] = label(i + 1) }
                
                return Result(
                    samplePool = pool.map { num -> map[num]!! },
                    groups = bestGroups.map { g -> g.map { num -> map[num]!! } },
                    ms = ms
                )
            }
            
            return Result(
                samplePool = pool.map { it },
                groups = bestGroups,
                ms = ms
            )
        }
        fun solve(p: Params, pool:List<Int>): Result {
            val (m, n, k, j, s, minSGroups, seed, toLabel, timeoutMs) = p
            
            if (n > 25 || k > 7) throw IllegalArgumentException("beyond spec")

            val pool = pool
            val t0 = System.currentTimeMillis()
            val deadline = t0 + timeoutMs

            var bestGroups = Solver.greedyCover(n, k, j, s, minSGroups, pool, deadline)

            if (n <= 15) {

                val localGroups = Solver.localSearch(bestGroups, pool, n, j, s, minSGroups, deadline)
                bestGroups = localGroups

                if (n <= 9 && k <= 7) {
                    val remainingTime = deadline - System.currentTimeMillis()
                    

                    if (remainingTime > 10000) {
                        try {
                            val saGroups = Solver.simulatedAnnealing(
                                bestGroups, pool, n, j, s, k, minSGroups, deadline
                            )

                            if (saGroups.size < bestGroups.size) {
                                bestGroups = saGroups
                            }
                        } catch (e: Exception) {
                            println("Simulated annealing failed: ${e.message}")
                        }
                    }
                }
            }

            val ms = System.currentTimeMillis() - t0
            
            if (toLabel) {
                val map = mutableMapOf<Int, String>()
                pool.forEachIndexed { i, num -> map[num] = label(i + 1) }
                
                return Result(
                    samplePool = pool.map { num -> map[num]!! },
                    groups = bestGroups.map { g -> g.map { num -> map[num]!! } },
                    ms = ms
                )
            }
            
            return Result(
                samplePool = pool.map { it },
                groups = bestGroups,
                ms = ms
            )
        }
    }
}

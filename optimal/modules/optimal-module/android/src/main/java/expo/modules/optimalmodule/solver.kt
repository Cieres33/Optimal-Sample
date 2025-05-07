import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext

class Solver {
    companion object {
        fun greedyCover(
            n: Int, k: Int, j: Int, s: Int, minSGroups: Int,
            pool: List<Int>, deadline: Long
        ): List<List<Int>> {
            val jSets = Comb.kComb(n, j)
            val U = jSets.size

            val kSetCount = Comb.calculateC(n, k)
            val kSets = ArrayList<List<Int>>(kSetCount)
            val bits = ArrayList<BitSet>(kSetCount)
            val mutex = Mutex()
            runBlocking {
                    val dispatcher = Dispatchers.Default
                    val jobs = Comb.kComb(n, k).map { ks ->
                        launch(dispatcher) {
                            if (System.currentTimeMillis() <= deadline) {
                                val b = BitSet(U)
                            if (s == j) {
                                jSets.forEachIndexed { idx, js ->
                                    var isSubset = true
                                    for (v in js) {
                                        if (!ks.contains(v)) {
                                            isSubset = false
                                            break
                                        }
                                    }
                                    if (isSubset) b.set(idx)
                                }
                            } else {
                                jSets.forEachIndexed { idx, js ->
                                    var c = 0
                                    for (v in js) if (ks.contains(v)) c++
                                    if (c >= s) b.set(idx)
                                }
                            }
                            mutex.withLock {
                            kSets.add(ks)
                            bits.add(b)
                            }
                        }}}
                jobs.forEach { it.join() }
            }
        
            val coverCounts = IntArray(U)
            val sol = mutableListOf<List<Int>>()
            var satisfied = false
            
            while (!satisfied && sol.size < kSets.size) {
                var best = -1
                var gain = -1
                var bestEfficiency = -1 
                
                for (i in bits.indices) {
                    var currentGain = 0
                    var uncoveredGain = 0 
                    
                    for (j in 0 until U) {
                        if (bits[i].get(j)) {
                            if (coverCounts[j] < minSGroups) {
                                currentGain++
                                if (coverCounts[j] == 0) uncoveredGain++
                            }
                        }
                    }
  
                    val efficiency = uncoveredGain * 100 + currentGain
                    
                    if (currentGain > 0 && (efficiency > bestEfficiency || 
                       (efficiency == bestEfficiency && currentGain > gain))) {
                        gain = currentGain
                        bestEfficiency = efficiency
                        best = i
                    }
                }
                
                if (best == -1 || gain == 0) break
                
                sol.add(kSets[best].map { idx -> pool[idx] })
                
                for (j in 0 until U) {
                    if (bits[best].get(j)) {
                        coverCounts[j]++
                    }
                }
                
                satisfied = coverCounts.all { count -> count >= minSGroups }
                
                bits.removeAt(best)
                kSets.removeAt(best)
            }

            if (!satisfied && s == j) {
                for (u in 0 until U) {
                    if (satisfied) break
                    if (coverCounts[u] >= minSGroups) continue
                
                    var pick = -1
                    for (i in bits.indices) {
                        if (bits[i].get(u)) { 
                            pick = i 
                            break 
                        }
                    }
                    if (pick == -1) break        
                
                    sol.add(kSets[pick].map { idx -> pool[idx] })
                    for (jIdx in 0 until U) {
                        if (bits[pick].get(jIdx)) coverCounts[jIdx]++
                    }
                    satisfied = coverCounts.all { c -> c >= minSGroups }
                
                    bits.removeAt(pick)
                    kSets.removeAt(pick)
                }
            }
            
            return sol
        }

        fun localSearch(
            groups: List<List<Int>>, pool: List<Int>,
            n: Int, j: Int, s: Int, minSGroups: Int, deadline: Long
        ): List<List<Int>> {
            val jSets = Comb.kComb(n, j)
            
            val covered = { sol: List<List<Int>> ->
                val coverCounts = IntArray(jSets.size) { 0 }
                
                for (kg in sol) {
                    jSets.forEachIndexed { jIdx, js ->
                        if (s == j) {
                            var isSubset = true
                            for (idx in js) {
                                if (!kg.contains(pool[idx])) {
                                    isSubset = false
                                    break
                                }
                            }
                            if (isSubset) coverCounts[jIdx]++
                        } else {
                            var c = 0
                            for (idx in js) if (kg.contains(pool[idx])) c++
                            if (c >= s) coverCounts[jIdx]++
                        }
                    }
                }
                
                coverCounts.all { count -> count >= minSGroups }
            }

            var improved = true
            var currentGroups = groups.toMutableList()
            
            while (improved && System.currentTimeMillis() < deadline) {
                improved = false
                
                for (i in currentGroups.indices) {
                    val test = currentGroups.toMutableList()
                    test.removeAt(i)
                    
                    if (covered(test)) { 
                        currentGroups = test
                        improved = true 
                        break 
                    }
                }
                
            }
            
            return currentGroups
        }

        fun simulatedAnnealing(
            initialGroups: List<List<Int>>, pool: List<Int>,
            n: Int, j: Int, s: Int, k: Int, minSGroups: Int, 
            deadline: Long
        ): List<List<Int>> {
            val jSets = Comb.kComb(n, j)
            
            val covered = { sol: List<List<Int>> ->
                val coverCounts = IntArray(jSets.size) { 0 }
                
                for (kg in sol) {
                    jSets.forEachIndexed { jIdx, js ->
                        if (s == j) {
                            var isSubset = true
                            for (idx in js) {
                                if (!kg.contains(pool[idx])) {
                                    isSubset = false
                                    break
                                }
                            }
                            if (isSubset) coverCounts[jIdx]++
                        } else {
                            var c = 0
                            for (idx in js) if (kg.contains(pool[idx])) c++
                            if (c >= s) coverCounts[jIdx]++
                        }
                    }
                }
                
                coverCounts.all { count -> count >= minSGroups }
            }
            
            val allGroups = mutableListOf<List<Int>>()
            for (ks in Comb.kComb(n, k)) {
                if (System.currentTimeMillis() > deadline - 3000) break 
                allGroups.add(ks.map { idx -> pool[idx] })
            }
            
            var currentSolution = initialGroups.toMutableList()
            var bestSolution = initialGroups.toMutableList()
            
            val initialTemp = 15.0
            val coolingRate = 0.96
            val minTemp = 0.01
            
            var temp = initialTemp
            var iterations = 0
            val MAX_ITERATIONS = 1500
            
            while (temp > minTemp && iterations < MAX_ITERATIONS && System.currentTimeMillis() < deadline - 1000) {
                iterations++

                val newSolution = currentSolution.toMutableList()
                val operation = Math.random()
                
                if (operation < 0.4 && newSolution.isNotEmpty()) {
                    val replaceIndex = (Math.random() * newSolution.size).toInt()
                    val candidateGroups = allGroups.filter { g -> 
                        !newSolution.any { s -> arraysEqual(s, g) }
                    }
                    
                    if (candidateGroups.isNotEmpty()) {
                        val newGroup = candidateGroups[(Math.random() * candidateGroups.size).toInt()]
                        newSolution[replaceIndex] = newGroup
                    }
                } else if (operation < 0.7 && newSolution.size > 1) {
                    val deleteIndex = (Math.random() * newSolution.size).toInt()
                    newSolution.removeAt(deleteIndex)
                } else {
                    val candidateGroups = allGroups.filter { g -> 
                        !newSolution.any { s -> arraysEqual(s, g) }
                    }
                    
                    if (candidateGroups.isNotEmpty()) {
                        val newGroup = candidateGroups[(Math.random() * candidateGroups.size).toInt()]
                        newSolution.add(newGroup)
                    }
                }
                
                val isCovered = covered(newSolution)
                
                if (isCovered) {
                    val deltaE = newSolution.size - currentSolution.size
                    
                    if (deltaE < 0 || Math.random() < Math.exp(-deltaE / temp)) {
                        currentSolution = newSolution
                        
                        if (newSolution.size < bestSolution.size) {
                            bestSolution = newSolution.toMutableList()
                        }
                    }
                }
                
                temp *= coolingRate
            }
            
            return bestSolution
        }

        private fun arraysEqual(a: List<Int>, b: List<Int>): Boolean {
            if (a.size != b.size) return false
            val sortedA = a.sorted()
            val sortedB = b.sorted()
            return sortedA.zip(sortedB).all { (x, y) -> x == y }
        }
    }
}

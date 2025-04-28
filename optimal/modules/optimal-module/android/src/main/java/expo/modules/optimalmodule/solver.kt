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
                            // 特殊处理 s=j 的完全覆盖情况
                            if (s == j) {
                                jSets.forEachIndexed { idx, js ->
                                    // 检查j组是否是k组的子集
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
                                // 普通部分覆盖情况
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
            
            // 记录每个j样本组被覆盖的次数
            val coverCounts = IntArray(U)
            val sol = mutableListOf<List<Int>>()
            var satisfied = false
            
            // 改进的贪心算法 - 使用更优的启发式函数
            while (!satisfied && sol.size < kSets.size) {
                var best = -1
                var gain = -1
                var bestEfficiency = -1 // 新增效率评分
                
                for (i in bits.indices) {
                    var currentGain = 0
                    var uncoveredGain = 0 // 新增：计算对未覆盖j组的增益
                    
                    for (j in 0 until U) {
                        if (bits[i].get(j)) {
                            if (coverCounts[j] < minSGroups) {
                                currentGain++
                                if (coverCounts[j] == 0) uncoveredGain++
                            }
                        }
                    }
                    
                    // 效率评分：优先考虑覆盖未覆盖的j组
                    // 对于已部分覆盖的j组，其重要性降低
                    val efficiency = uncoveredGain * 100 + currentGain
                    
                    if (currentGain > 0 && (efficiency > bestEfficiency || 
                       (efficiency == bestEfficiency && currentGain > gain))) {
                        gain = currentGain
                        bestEfficiency = efficiency
                        best = i
                    }
                }
                
                if (best == -1 || gain == 0) break
                
                // 添加选中的k样本组到解决方案
                sol.add(kSets[best].map { idx -> pool[idx] })
                
                // 更新覆盖计数
                for (j in 0 until U) {
                    if (bits[best].get(j)) {
                        coverCounts[j]++
                    }
                }
                
                // 检查是否满足要求
                satisfied = coverCounts.all { count -> count >= minSGroups }
                
                // 移除已选的k样本组
                bits.removeAt(best)
                kSets.removeAt(best)
            }

            if (!satisfied && s == j) {
                // 对仍未覆盖的 j-组，逐个找能覆盖它们的 k-组补齐
                for (u in 0 until U) {
                    if (satisfied) break
                    if (coverCounts[u] >= minSGroups) continue
                
                    // 找第一个能覆盖 jSets[u] 的 k-组
                    var pick = -1
                    for (i in bits.indices) {
                        if (bits[i].get(u)) { 
                            pick = i 
                            break 
                        }
                    }
                    if (pick == -1) break           // 理论不会发生
                
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
            
            // 修改覆盖检查函数考虑s=j的特殊情况
            val covered = { sol: List<List<Int>> ->
                val coverCounts = IntArray(jSets.size) { 0 }
                
                for (kg in sol) {
                    jSets.forEachIndexed { jIdx, js ->
                        if (s == j) {
                            // 完全覆盖逻辑
                            var isSubset = true
                            for (idx in js) {
                                if (!kg.contains(pool[idx])) {
                                    isSubset = false
                                    break
                                }
                            }
                            if (isSubset) coverCounts[jIdx]++
                        } else {
                            // 部分覆盖逻辑
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
                
                // 基础优化：尝试删除一个组
                for (i in currentGroups.indices) {
                    val test = currentGroups.toMutableList()
                    test.removeAt(i)
                    
                    if (covered(test)) { 
                        currentGroups = test
                        improved = true 
                        break 
                    }
                }
                
                // 此处可以添加更强大的局部搜索逻辑
            }
            
            return currentGroups
        }

        fun simulatedAnnealing(
            initialGroups: List<List<Int>>, pool: List<Int>,
            n: Int, j: Int, s: Int, k: Int, minSGroups: Int, 
            deadline: Long
        ): List<List<Int>> {
            val jSets = Comb.kComb(n, j)
            
            // 检查覆盖函数保持不变
            val covered = { sol: List<List<Int>> ->
                val coverCounts = IntArray(jSets.size) { 0 }
                
                for (kg in sol) {
                    jSets.forEachIndexed { jIdx, js ->
                        if (s == j) {
                            // 完全覆盖逻辑
                            var isSubset = true
                            for (idx in js) {
                                if (!kg.contains(pool[idx])) {
                                    isSubset = false
                                    break
                                }
                            }
                            if (isSubset) coverCounts[jIdx]++
                        } else {
                            // 部分覆盖逻辑
                            var c = 0
                            for (idx in js) if (kg.contains(pool[idx])) c++
                            if (c >= s) coverCounts[jIdx]++
                        }
                    }
                }
                
                coverCounts.all { count -> count >= minSGroups }
            }
            
            // 生成所有可能的k组
            val allGroups = mutableListOf<List<Int>>()
            for (ks in Comb.kComb(n, k)) {
                if (System.currentTimeMillis() > deadline - 3000) break // 预留3秒
                allGroups.add(ks.map { idx -> pool[idx] })
            }
            
            // 初始解
            var currentSolution = initialGroups.toMutableList()
            var bestSolution = initialGroups.toMutableList()
            
            // 模拟退火参数 - 根据问题规模调整
            val initialTemp = 15.0
            val coolingRate = 0.96
            val minTemp = 0.01
            
            // 开始模拟退火
            var temp = initialTemp
            var iterations = 0
            val MAX_ITERATIONS = 1500
            
            while (temp > minTemp && iterations < MAX_ITERATIONS && System.currentTimeMillis() < deadline - 1000) {
                iterations++
                
                // 生成新解
                val newSolution = currentSolution.toMutableList()
                val operation = Math.random()
                
                if (operation < 0.4 && newSolution.isNotEmpty()) {
                    // 替换一个组
                    val replaceIndex = (Math.random() * newSolution.size).toInt()
                    val candidateGroups = allGroups.filter { g -> 
                        !newSolution.any { s -> arraysEqual(s, g) }
                    }
                    
                    if (candidateGroups.isNotEmpty()) {
                        val newGroup = candidateGroups[(Math.random() * candidateGroups.size).toInt()]
                        newSolution[replaceIndex] = newGroup
                    }
                } else if (operation < 0.7 && newSolution.size > 1) {
                    // 删除一个组
                    val deleteIndex = (Math.random() * newSolution.size).toInt()
                    newSolution.removeAt(deleteIndex)
                } else {
                    // 添加一个组
                    val candidateGroups = allGroups.filter { g -> 
                        !newSolution.any { s -> arraysEqual(s, g) }
                    }
                    
                    if (candidateGroups.isNotEmpty()) {
                        val newGroup = candidateGroups[(Math.random() * candidateGroups.size).toInt()]
                        newSolution.add(newGroup)
                    }
                }
                
                // 评估新解
                val isCovered = covered(newSolution)
                
                // 如果新解满足覆盖条件并且组数更少，或者根据温度有概率接受较差解
                if (isCovered) {
                    val deltaE = newSolution.size - currentSolution.size
                    
                    if (deltaE < 0 || Math.random() < Math.exp(-deltaE / temp)) {
                        currentSolution = newSolution
                        
                        // 更新最优解
                        if (newSolution.size < bestSolution.size) {
                            bestSolution = newSolution.toMutableList()
                        }
                    }
                }
                
                // 降温
                temp *= coolingRate
            }
            
            return bestSolution
        }

        // 辅助函数：检查两个数组是否相等
        private fun arraysEqual(a: List<Int>, b: List<Int>): Boolean {
            if (a.size != b.size) return false
            val sortedA = a.sorted()
            val sortedB = b.sorted()
            return sortedA.zip(sortedB).all { (x, y) -> x == y }
        }
    }
}

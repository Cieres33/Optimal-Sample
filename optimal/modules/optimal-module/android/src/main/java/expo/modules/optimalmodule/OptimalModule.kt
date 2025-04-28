package expo.modules.optimalmodule

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class OptimalModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("OptimalModule")
    
    // Expose the solve function as an async function
    AsyncFunction("solve") { params: Map<String, Any> ->
      try {
        // Convert JavaScript object to Kotlin Params
        val paramsObj = convertToParams(params)
        
        // Call solve method
        val result = Optimal.solve(paramsObj)
        
        // Convert result to a Map that can be returned to JavaScript
        convertResultToMap(result)
      } catch (e: Exception) {
        mapOf(
          "error" to (e.message ?: "Unknown error")
        )
      }
    }
  }
  
  private fun convertToParams(params: Map<String, Any>): Optimal.Params {
    return Optimal.Params(
      m = (params["m"] as? Number)?.toInt() ?: 0,
      n = (params["n"] as? Number)?.toInt() ?: 0,
      k = (params["k"] as? Number)?.toInt() ?: 0,
      j = (params["j"] as? Number)?.toInt() ?: 0,
      s = (params["s"] as? Number)?.toInt() ?: 0,
      minSGroups = (params["minSGroups"] as? Number)?.toInt() ?: 1,
      seed = (params["seed"] as? Number)?.toLong(),
      toLabel = params["toLabel"] as? Boolean ?: false,
      timeoutMs = (params["timeoutMs"] as? Number)?.toLong() ?: 60000
    )
  }
  
  private fun convertResultToMap(result: Optimal.Result): Map<String, Any> {
    // Convert the samplePool to a list of serializable values
    val serializedSamplePool = result.samplePool.map { 
      when(it) {
        is String, is Number -> it
        else -> it.toString()
      }
    }
    
    // Convert the groups to a list of lists of serializable values
    val serializedGroups = result.groups.map { group ->
      group.map { item ->
        when(item) {
          is String, is Number -> item
          else -> item.toString()
        }
      }
    }
    
    return mapOf(
      "samplePool" to serializedSamplePool,
      "groups" to serializedGroups,
      "ms" to result.ms
    )
  }
}

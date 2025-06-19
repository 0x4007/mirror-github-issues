// cache.ts
import { existsSync } from "node:fs"
import { readFile, writeFile } from "node:fs/promises"

const CACHE_FILE = "source-issues-cache.json"
const CACHE_DURATION = 1000 * 60 * 60 // 1 hour in milliseconds

interface CacheData {
  timestamp: number
  issues: any[]
}

export async function getCachedIssues(): Promise<any[] | null> {
  try {
    if (!existsSync(CACHE_FILE)) {
      return null
    }

    const cacheContent = await readFile(CACHE_FILE, "utf-8")
    const cacheData: CacheData = JSON.parse(cacheContent)

    const now = Date.now()
    const isExpired = (now - cacheData.timestamp) > CACHE_DURATION

    if (isExpired) {
      console.log("Cache expired, will fetch fresh data")
      return null
    }

    console.log(`Using cached data from ${new Date(cacheData.timestamp).toLocaleString()}`)
    return cacheData.issues
  } catch (error) {
    console.log("Error reading cache, will fetch fresh data")
    return null
  }
}

export async function setCachedIssues(issues: any[]): Promise<void> {
  try {
    const cacheData: CacheData = {
      timestamp: Date.now(),
      issues: issues
    }

    await writeFile(CACHE_FILE, JSON.stringify(cacheData, null, 2))
    console.log(`Cached ${issues.length} issues`)
  } catch (error) {
    console.log("Error writing cache:", error)
  }
}

// mirror-issues.ts
import { octokit, targetRepo } from "./github-client.ts"
import { getReferencedIssue, type ReferencedIssue } from "./get-referenced-issue.ts"
import { getCachedIssues, setCachedIssues } from "./cache.ts"

declare const process: {
  env: {
    BATCH_SIZE?: string
  }
}

function isMirrorIssue(body: string): boolean {
  // Check if the body is just a URL pointing to another GitHub issue
  const trimmedBody = body.trim()
  const urlPattern = /^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+$/
  return urlPattern.test(trimmedBody)
}

async function getExistingTargetIssues(): Promise<Array<{title: string, body: string}>> {
  try {
    const { data: existingIssues } = await octokit.rest.issues.listForRepo({
      owner: targetRepo.split('/')[0],
      repo: targetRepo.split('/')[1],
      state: "all"
    })

    return existingIssues.map(issue => ({
      title: issue.title,
      body: issue.body || ""
    }))
  } catch {
    return []
  }
}

function isAlreadyCopied(title: string, body: string, existingIssues: Array<{title: string, body: string}>): boolean {
  return existingIssues.some(existing =>
    existing.title === title && existing.body === body
  )
}

async function processAndCheckIssue(issue: any, existingIssues: Array<{title: string, body: string}>): Promise<{title: string, body: string} | null> {
  const body = issue.body || ""

  if (isMirrorIssue(body)) {
    // This is a mirror issue - fetch the referenced issue's title and body
    const referencedIssue = await getReferencedIssue(body.trim())

    if (referencedIssue) {
      const result = {
        title: referencedIssue.title,
        body: referencedIssue.body
      }

      // Check if already copied
      if (isAlreadyCopied(result.title, result.body, existingIssues)) {
        return null // Skip this one
      }

      return result
    }
  } else {
    // Regular issue - use existing logic for issues with multiple URL references
    const urlMatches = [...body.matchAll(/https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+/g)]
    const referencedContents = await Promise.all(
      urlMatches.map(match => getReferencedIssue(match[0]))
    )
    const validContents = referencedContents.filter(Boolean) as ReferencedIssue[]

    const newBody = validContents.length > 0
      ? validContents.map(content => content.body).join("\n\n---\n\n")
      : body

    const result = {
      title: issue.title,
      body: newBody
    }

    // Check if already copied
    if (isAlreadyCopied(result.title, result.body, existingIssues)) {
      return null // Skip this one
    }

    return result
  }

  return null
}

export async function mirrorIssues(): Promise<void> {
  console.log("Loading existing issues from target repository...")
  const existingIssues = await getExistingTargetIssues()
  console.log(`Found ${existingIssues.length} existing issues in target repository`)

  console.log("Loading source issues...")
  let sourceIssues = await getCachedIssues()

  if (!sourceIssues) {
    console.log("No valid cache found, fetching from GitHub API...")
    sourceIssues = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const { data: pageIssues } = await octokit.rest.issues.listForRepo({
        owner: "ubiquity",
        repo: "devpool-directory",
        state: "all",
        per_page: 100,
        page: page
      })

      sourceIssues = sourceIssues.concat(pageIssues)
      hasMore = pageIssues.length === 100
      page++

      if (page % 10 === 0) {
        console.log(`Loaded ${sourceIssues.length} issues so far...`)
      }
    }

    await setCachedIssues(sourceIssues)
  }

  console.log(`Found ${sourceIssues.length} issues in source repository`)

  // Process issues one by one until we find the specified number that need to be copied
  const batchSize = parseInt(process.env.BATCH_SIZE || "3")
  console.log(`Finding next ${batchSize} issues to copy...`)
  const issuesToCopy: Array<{title: string, body: string, sourceIssue: any}> = []
  let processed = 0

  for (const issue of sourceIssues) {
    processed++

    if (processed % 100 === 0) {
      console.log(`Checked ${processed}/${sourceIssues.length} issues, found ${issuesToCopy.length}/${batchSize} to copy...`)
    }

    const processedIssue = await processAndCheckIssue(issue, existingIssues)

    if (processedIssue) {
      issuesToCopy.push({
        ...processedIssue,
        sourceIssue: issue
      })

      console.log(`Found issue to copy: ${processedIssue.title}`)

      // Stop when we have the desired batch size
      if (issuesToCopy.length >= batchSize) {
        break
      }
    }
  }

  if (issuesToCopy.length === 0) {
    console.log("All issues have been copied!")
    return
  }

  console.log(`\nCopying ${issuesToCopy.length} new issues...`)

  for (const issueData of issuesToCopy) {
    await octokit.rest.issues.create({
      owner: targetRepo.split('/')[0],
      repo: targetRepo.split('/')[1],
      title: issueData.title,
      body: issueData.body
    })

    const issueType = isMirrorIssue(issueData.sourceIssue.body || "") ? "mirror" : "regular"
    console.log(`Created ${issueType} issue: ${issueData.title}`)
  }

  const totalCopied = existingIssues.length + issuesToCopy.length
  console.log(`\nProgress: ${totalCopied} issues copied so far`)
  console.log(`Checked ${processed}/${sourceIssues.length} source issues`)
}

// Entry point
mirrorIssues()

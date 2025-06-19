// mirror-issues.ts
import { octokit, targetRepo } from "./github-client.ts"
import { getReferencedIssue, type ReferencedIssue } from "./get-referenced-issue.ts"

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

async function processIssue(issue: any, existingIssues: Array<{title: string, body: string}>): Promise<{title: string, body: string} | null> {
  const body = issue.body || ""

  if (isMirrorIssue(body)) {
    // This is a mirror issue - fetch the referenced issue's title and body
    const referencedIssue = await getReferencedIssue(body.trim())

    if (referencedIssue) {
      return {
        title: referencedIssue.title,
        body: referencedIssue.body
      }
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

    return {
      title: issue.title,
      body: newBody
    }
  }

  return null
}

export async function mirrorIssues(): Promise<void> {
  console.log("Loading existing issues from target repository...")
  const existingIssues = await getExistingTargetIssues()
  console.log(`Found ${existingIssues.length} existing issues in target repository`)

  console.log("Loading source issues...")
  let sourceIssues: any[] = []
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
  console.log(`Found ${sourceIssues.length} issues in source repository`)

  // Process all source issues to determine what would be created
  const processedIssues: Array<{title: string, body: string, sourceIssue: any}> = []

  for (const issue of sourceIssues) {
    const processed = await processIssue(issue, existingIssues)
    if (processed) {
      processedIssues.push({
        ...processed,
        sourceIssue: issue
      })
    }
  }

  // Filter out issues that are already copied
  const newIssues = processedIssues.filter(processed =>
    !isAlreadyCopied(processed.title, processed.body, existingIssues)
  )

  console.log(`${processedIssues.length - newIssues.length} issues already copied, ${newIssues.length} remaining`)

  // Take only the next 3 issues to copy
  const issuesToCopy = newIssues.slice(0, 3)

  if (issuesToCopy.length === 0) {
    console.log("All issues have been copied!")
    return
  }

  console.log(`Copying ${issuesToCopy.length} new issues...`)

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

  console.log(`\nProgress: ${existingIssues.length + issuesToCopy.length}/${existingIssues.length + newIssues.length} issues copied`)
}

// Entry point
mirrorIssues()

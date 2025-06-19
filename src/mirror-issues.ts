// mirror-issues.ts
import { octokit, targetRepo } from "./github-client.ts"
import { getReferencedIssue, type ReferencedIssue } from "./get-referenced-issue.ts"

function isMirrorIssue(body: string): boolean {
  // Check if the body is just a URL pointing to another GitHub issue
  const trimmedBody = body.trim()
  const urlPattern = /^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+$/
  return urlPattern.test(trimmedBody)
}

export async function mirrorIssues(): Promise<void> {
  const { data: issues } = await octokit.rest.issues.listForRepo({
    owner: "ubiquity",
    repo: "devpool-directory",
    state: "all"
  })

  // Process only the first 3 issues
  const issuesToProcess = issues.slice(0, 3)

  for (const issue of issuesToProcess) {
    const body = issue.body || ""

    if (isMirrorIssue(body)) {
      // This is a mirror issue - fetch the referenced issue's title and body
      const referencedIssue = await getReferencedIssue(body.trim())

      if (referencedIssue) {
        // Create new issue with referenced issue's title and body
        await octokit.rest.issues.create({
          owner: targetRepo.split('/')[0],
          repo: targetRepo.split('/')[1],
          title: referencedIssue.title,
          body: referencedIssue.body
        })
        console.log(`Created mirror issue: ${referencedIssue.title}`)
      } else {
        console.log(`Failed to fetch referenced issue from: ${body}`)
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

      await octokit.rest.issues.create({
        owner: targetRepo.split('/')[0],
        repo: targetRepo.split('/')[1],
        title: issue.title,
        body: newBody
      })
      console.log(`Created regular issue: ${issue.title}`)
    }
  }
}

// Entry point
mirrorIssues()

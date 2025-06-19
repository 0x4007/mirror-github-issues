// get-referenced-issue.ts
import { octokit } from "./github-client"

export async function getReferencedIssue(url: string): Promise<string | null> {
  try {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/)
    if (!match) return null

    const [, owner, repo, issueNumber] = match
    const { data: issue } = await octokit.rest.issues.get({
      owner,
      repo,
      issue_number: parseInt(issueNumber)
    })

    return issue.body
  } catch {
    return null
  }
}
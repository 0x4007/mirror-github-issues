// get-referenced-issue.ts
import { octokit } from "./github-client.ts"

export interface ReferencedIssue {
  title: string
  body: string
}

export async function getReferencedIssue(url: string): Promise<ReferencedIssue | null> {
  try {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/)
    if (!match) return null

    const [, owner, repo, issueNumber] = match
    const { data: issue } = await octokit.rest.issues.get({
      owner,
      repo,
      issue_number: parseInt(issueNumber)
    })

    return {
      title: issue.title,
      body: issue.body || ""
    }
  } catch {
    return null
  }
}

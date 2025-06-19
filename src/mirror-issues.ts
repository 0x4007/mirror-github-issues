// mirror-issues.ts
import { octokit, targetRepo } from "./github-client.ts"
import { getReferencedIssue } from "./get-referenced-issue.ts"

export async function mirrorIssues(): Promise<void> {
  const { data: issues } = await octokit.rest.issues.listForRepo({
    owner: "ubiquity",
    repo: "devpool-directory",
    state: "all"
  })

  for (const issue of issues) {
    const body = issue.body || ""
    const urlMatches = [...body.matchAll(/https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+/g)]
    const referencedContents = await Promise.all(
      urlMatches.map(match => getReferencedIssue(match[0]))
    )
    const validContents = referencedContents.filter(Boolean) as string[]

    const newBody = validContents.length > 0
      ? validContents.join("\n\n---\n\n")
      : body

    await octokit.rest.issues.create({
      owner: targetRepo.split('/')[0],
      repo: targetRepo.split('/')[1],
      title: issue.title,
      body: newBody
    })
  }
}

// Entry point
mirrorIssues()
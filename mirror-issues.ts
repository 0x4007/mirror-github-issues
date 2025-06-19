import { Octokit } from "npm:octokit"

declare const process: {
  env: {
    GITHUB_TOKEN: string
  }
}

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

const sourceRepo = "ubiquity/devpool-directory"
const targetRepo = "ShivTestOrg/test-public"

async function mirrorIssues() {
  const { data: issues } = await octokit.rest.issues.listForRepo({
    owner: "ubiquity",
    repo: "devpool-directory",
    state: "all"
  })

  for (const issue of issues) {
    await octokit.rest.issues.create({
      owner: targetRepo.split('/')[0],
      repo: targetRepo.split('/')[1],
      title: issue.title,
      body: issue.body
    })
  }
}

mirrorIssues()
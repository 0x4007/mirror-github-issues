// github-client.ts
import { Octokit } from "npm:octokit"

declare const process: {
  env: {
    GITHUB_TOKEN: string
  }
}

export const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })
export const targetRepo = "ShivTestOrg/repo-price"
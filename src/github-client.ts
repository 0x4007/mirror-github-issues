// github-client.ts
import { Octokit } from "octokit"

declare const process: {
  env: {
    GITHUB_TOKEN: string
    TARGET_REPO?: string
    BATCH_SIZE?: string
  }
}

export const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })
export const targetRepo = process.env.TARGET_REPO || "ShivTestOrg/repo-price"

// lib/github.ts
import { Octokit } from '@octokit/rest'

const octokit = new Octokit({ auth: process.env.GITHUB_PAT })
const OWNER = process.env.GITHUB_OWNER!

export async function grantRepoAccess(githubUsername: string, repoName: string): Promise<void> {
  try {
    await octokit.repos.addCollaborator({
      owner: OWNER,
      repo: repoName,
      username: githubUsername,
      permission: 'pull',
    })
  } catch (err: any) {
    // 422 = already a collaborator, safe to ignore
    if (err.status !== 422) {
      console.error(`GitHub access error for ${githubUsername}/${repoName}:`, err.message)
      throw err
    }
  }
}

export async function revokeRepoAccess(githubUsername: string, repoName: string): Promise<void> {
  try {
    await octokit.repos.removeCollaborator({ owner: OWNER, repo: repoName, username: githubUsername })
  } catch (err: any) {
    if (err.status !== 404) throw err
  }
}

export async function validateGithubUsername(username: string): Promise<boolean> {
  try {
    await octokit.users.getByUsername({ username })
    return true
  } catch {
    return false
  }
}

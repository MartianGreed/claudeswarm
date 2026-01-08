# @claudeswarm/vcs

Version control system abstraction for Claudeswarm. Supports GitHub and GitLab.

## Installation

```bash
bun add @claudeswarm/vcs
```

## Usage

### Creating a Provider

```typescript
import { createVcsProvider } from '@claudeswarm/vcs'

const github = createVcsProvider('github')
const gitlab = createVcsProvider('gitlab')
```

### Cloning a Repository

```typescript
await github.clone(
  'https://github.com/org/repo',
  '/tmp/sandboxes/job-123',
  process.env.GITHUB_TOKEN
)
```

### Creating a Branch

```typescript
await github.createBranch('feature/add-dark-mode', '/tmp/sandboxes/job-123')
```

### Pushing Changes

```typescript
await github.push('/tmp/sandboxes/job-123', 'feature/add-dark-mode')
```

### Creating a Pull Request

```typescript
import type { CreatePRParams } from '@claudeswarm/shared'

const result = await github.createPR({
  repoUrl: 'https://github.com/org/repo',
  token: process.env.GITHUB_TOKEN,
  title: 'feat: Add dark mode toggle',
  body: 'Implements dark mode...',
  sourceBranch: 'feature/add-dark-mode',
  targetBranch: 'main',
})

console.log(result.url)     // https://github.com/org/repo/pull/42
console.log(result.number)  // 42
```

### Adding PR Comments

```typescript
await github.addPRComment(42, 'Clarification needed: which theme?', {
  token: process.env.GITHUB_TOKEN,
  owner: 'org',
  repo: 'repo',
})
```

## Interface

```typescript
interface VcsProvider {
  name: 'github' | 'gitlab'

  clone(repoUrl: string, targetPath: string, token: string): Promise<void>
  createBranch(branchName: string, sandboxPath: string): Promise<void>
  push(sandboxPath: string, branchName: string): Promise<void>
  createPR(params: CreatePRParams): Promise<PRResult>
  addPRComment(prNumber: number, comment: string, config: VcsConfig): Promise<void>
}

interface VcsConfig {
  token: string
  owner: string
  repo: string
}

interface CreatePRParams {
  repoUrl: string
  token: string
  title: string
  body: string
  sourceBranch: string
  targetBranch: string
}

interface PRResult {
  url: string
  number: number
}
```

## Provider Details

### GitHub

- Uses GitHub REST API (v2022-11-28)
- Supports HTTPS and SSH URLs
- Token-based authentication (PAT or fine-grained)
- Creates pull requests via `POST /repos/{owner}/{repo}/pulls`

### GitLab

- Uses GitLab REST API
- Supports HTTPS and SSH URLs
- Token-based authentication (personal access token)
- Creates merge requests via `POST /projects/{id}/merge_requests`

## Dependencies

- `simple-git` - Git operations
- `@claudeswarm/shared` - Shared types and errors

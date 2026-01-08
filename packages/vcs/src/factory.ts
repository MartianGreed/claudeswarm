import { GitHubProvider } from './github'
import { GitLabProvider } from './gitlab'
import type { VcsProvider, VcsProviderFactory, VcsProviderName } from './interface'

const providers: Record<VcsProviderName, new () => VcsProvider> = {
  github: GitHubProvider,
  gitlab: GitLabProvider,
}

export function createVcsProvider(name: VcsProviderName): VcsProvider {
  const Provider = providers[name]
  if (!Provider) {
    throw new Error(`Unknown VCS provider: ${name}`)
  }
  return new Provider()
}

export const vcsProviderFactory: VcsProviderFactory = {
  create: createVcsProvider,
}

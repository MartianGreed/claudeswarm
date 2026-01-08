import type { Project } from '@claudeswarm/proto'
import { useQuery } from '@tanstack/react-query'
import { getProjectClient } from '../lib/api'
import { useAuth } from '../lib/auth'

interface ProjectsPageProps {
  onCreateProject: () => void
  onSelectProject: (projectId: string) => void
}

export function ProjectsPage({ onCreateProject, onSelectProject }: ProjectsPageProps) {
  const { logout, user } = useAuth()

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const client = getProjectClient()
      return client.listProjects({ limit: 50, offset: 0 })
    },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">ClaudeSwarm</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                type="button"
                onClick={logout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
            <button
              type="button"
              onClick={onCreateProject}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Create Project
            </button>
          </div>

          {isLoading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
              <p className="mt-2 text-gray-500">Loading projects...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-600">
                Failed to load projects: {error instanceof Error ? error.message : 'Unknown error'}
              </p>
            </div>
          )}

          {data && data.projects.length === 0 && (
            <div className="border-4 border-dashed border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-500 mb-4">
                No projects yet. Create a project to start processing tickets.
              </p>
              <button
                type="button"
                onClick={onCreateProject}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Create Project
              </button>
            </div>
          )}

          {data && data.projects.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.projects.map((project: Project) => (
                <button
                  type="button"
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md cursor-pointer transition-shadow text-left"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.name}</h3>
                  <p className="text-sm text-gray-500 mb-4 truncate">{project.repoUrl}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {project.vcsProvider === 1 ? 'GitHub' : 'GitLab'}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        project.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {project.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

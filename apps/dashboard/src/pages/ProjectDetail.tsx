import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { getProjectClient } from '../lib/api'

interface ProjectDetailPageProps {
  projectId: string
  onBack: () => void
  onDeleted: () => void
  onViewJobs: (projectName: string) => void
}

export function ProjectDetailPage({
  projectId,
  onBack,
  onDeleted,
  onViewJobs,
}: ProjectDetailPageProps) {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const client = getProjectClient()
      return client.getProject({ projectId })
    },
  })

  const [formData, setFormData] = useState({
    name: '',
    maxConcurrentJobs: 3,
    isActive: true,
    claudeMdTemplate: '',
    ticketProviderConfig: '',
  })

  useEffect(() => {
    if (data?.project) {
      setFormData({
        name: data.project.name,
        maxConcurrentJobs: data.project.maxConcurrentJobs,
        isActive: data.project.isActive,
        claudeMdTemplate: data.project.claudeMdTemplate || '',
        ticketProviderConfig: data.project.ticketProviderConfigJson || '',
      })
    }
  }, [data])

  const updateMutation = useMutation({
    mutationFn: async () => {
      const client = getProjectClient()
      return client.updateProject({
        projectId,
        name: formData.name,
        maxConcurrentJobs: formData.maxConcurrentJobs,
        isActive: formData.isActive,
        claudeMdTemplate: formData.claudeMdTemplate || undefined,
        ticketProviderConfigJson: formData.ticketProviderConfig || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const client = getProjectClient()
      return client.deleteProject({ projectId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      onDeleted()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate()
  }

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      deleteMutation.mutate()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : name === 'maxConcurrentJobs'
            ? Number(value)
            : value,
    }))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error || !data?.project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center">
              <button type="button" onClick={onBack} className="text-gray-500 hover:text-gray-700">
                &larr; Back
              </button>
            </div>
          </div>
        </nav>
        <main className="max-w-2xl mx-auto py-8 px-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-600">
              {error instanceof Error ? error.message : 'Project not found'}
            </p>
          </div>
        </main>
      </div>
    )
  }

  const project = data.project

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                type="button"
                onClick={onBack}
                className="text-gray-500 hover:text-gray-700 mr-4"
              >
                &larr; Back
              </button>
              <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto py-8 px-4">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-sm border p-6 space-y-6"
        >
          <div className="bg-gray-50 rounded-md p-4 space-y-2">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Repository:</span> {project.repoUrl}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Branch:</span> {project.defaultBranch}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">VCS:</span>{' '}
              {project.vcsProvider === 1 ? 'GitHub' : 'GitLab'}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Tickets:</span>{' '}
              {project.ticketProvider === 1
                ? 'Linear'
                : project.ticketProvider === 2
                  ? 'Notion'
                  : 'Jira'}
            </p>
          </div>

          <div>
            <label
              htmlFor="ticketProviderConfig"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Ticket Provider Config (JSON)
            </label>
            <textarea
              id="ticketProviderConfig"
              name="ticketProviderConfig"
              value={formData.ticketProviderConfig}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder='{"teamId": "TEAM-123"}'
            />
            <p className="mt-1 text-xs text-gray-500">
              {project.ticketProvider === 1
                ? 'For Linear: {"teamId": "your-team-id"}'
                : project.ticketProvider === 2
                  ? 'For Notion: {"databaseId": "your-database-id"}'
                  : 'For Jira: {"projectKey": "PROJECT", "baseUrl": "https://company.atlassian.net"}'}
            </p>
          </div>

          <hr />

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Project Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="maxConcurrentJobs"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Max Concurrent Jobs
            </label>
            <input
              type="number"
              id="maxConcurrentJobs"
              name="maxConcurrentJobs"
              value={formData.maxConcurrentJobs}
              onChange={handleChange}
              min={1}
              max={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
              Active (process tickets automatically)
            </label>
          </div>

          <div>
            <label
              htmlFor="claudeMdTemplate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              CLAUDE.md Template (optional)
            </label>
            <textarea
              id="claudeMdTemplate"
              name="claudeMdTemplate"
              value={formData.claudeMdTemplate}
              onChange={handleChange}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Custom instructions for Claude..."
            />
          </div>

          {updateMutation.error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-600 text-sm">
                {updateMutation.error instanceof Error
                  ? updateMutation.error.message
                  : 'Failed to update project'}
              </p>
            </div>
          )}

          {updateMutation.isSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-green-600 text-sm">Project updated successfully</p>
            </div>
          )}

          <div className="flex justify-between">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Project'}
              </button>
              <button
                type="button"
                onClick={() => onViewJobs(project.name)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                View Jobs
              </button>
            </div>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

import { TicketProvider, VcsProvider } from '@claudeswarm/proto'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getProjectClient } from '../lib/api'

interface NewProjectPageProps {
  onBack: () => void
  onSuccess: () => void
}

export function NewProjectPage({ onBack, onSuccess }: NewProjectPageProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: '',
    repoUrl: '',
    defaultBranch: 'main',
    vcsProvider: VcsProvider.GITHUB,
    vcsToken: '',
    ticketProvider: TicketProvider.LINEAR,
    ticketProviderToken: '',
    ticketProviderConfig: '',
    maxConcurrentJobs: 3,
  })

  const mutation = useMutation({
    mutationFn: async () => {
      const client = getProjectClient()
      return client.createProject({
        name: formData.name,
        repoUrl: formData.repoUrl,
        defaultBranch: formData.defaultBranch,
        vcsProvider: formData.vcsProvider,
        vcsToken: formData.vcsToken,
        ticketProvider: formData.ticketProvider,
        ticketProviderToken: formData.ticketProviderToken,
        ticketProviderConfigJson: formData.ticketProviderConfig || '{}',
        maxConcurrentJobs: formData.maxConcurrentJobs,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      onSuccess()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'vcsProvider' || name === 'ticketProvider' || name === 'maxConcurrentJobs'
          ? Number(value)
          : value,
    }))
  }

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
              <h1 className="text-xl font-bold text-gray-900">Create Project</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto py-8 px-4">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-sm border p-6 space-y-6"
        >
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
              placeholder="My Project"
            />
          </div>

          <div>
            <label htmlFor="repoUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Repository URL
            </label>
            <input
              type="url"
              id="repoUrl"
              name="repoUrl"
              value={formData.repoUrl}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://github.com/org/repo"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="defaultBranch"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Default Branch
              </label>
              <input
                type="text"
                id="defaultBranch"
                name="defaultBranch"
                value={formData.defaultBranch}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="vcsProvider" className="block text-sm font-medium text-gray-700 mb-1">
                VCS Provider
              </label>
              <select
                id="vcsProvider"
                name="vcsProvider"
                value={formData.vcsProvider}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={VcsProvider.GITHUB}>GitHub</option>
                <option value={VcsProvider.GITLAB}>GitLab</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="vcsToken" className="block text-sm font-medium text-gray-700 mb-1">
              VCS Token (Personal Access Token)
            </label>
            <input
              type="password"
              id="vcsToken"
              name="vcsToken"
              value={formData.vcsToken}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ghp_..."
            />
          </div>

          <hr className="my-6" />

          <div>
            <label
              htmlFor="ticketProvider"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Ticket Provider
            </label>
            <select
              id="ticketProvider"
              name="ticketProvider"
              value={formData.ticketProvider}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={TicketProvider.LINEAR}>Linear</option>
              <option value={TicketProvider.NOTION}>Notion</option>
              <option value={TicketProvider.JIRA}>Jira</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="ticketProviderToken"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Ticket Provider Token
            </label>
            <input
              type="password"
              id="ticketProviderToken"
              name="ticketProviderToken"
              value={formData.ticketProviderToken}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="lin_api_..."
            />
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

          {mutation.error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-600 text-sm">
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : 'Failed to create project'}
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

import type { Job } from '@claudeswarm/proto'
import { JobStatus } from '@claudeswarm/proto'
import { useQuery } from '@tanstack/react-query'
import { getJobClient } from '../lib/api'

interface JobsPageProps {
  projectId: string
  projectName: string
  onBack: () => void
  onSelectJob: (jobId: string) => void
}

function getStatusBadge(status: JobStatus) {
  switch (status) {
    case JobStatus.PENDING:
      return { text: 'Pending', className: 'bg-gray-100 text-gray-800' }
    case JobStatus.RUNNING:
      return { text: 'Running', className: 'bg-blue-100 text-blue-800' }
    case JobStatus.NEEDS_CLARIFICATION:
      return { text: 'Needs Clarification', className: 'bg-yellow-100 text-yellow-800' }
    case JobStatus.PR_CREATED:
      return { text: 'PR Created', className: 'bg-purple-100 text-purple-800' }
    case JobStatus.COMPLETED:
      return { text: 'Completed', className: 'bg-green-100 text-green-800' }
    case JobStatus.FAILED:
      return { text: 'Failed', className: 'bg-red-100 text-red-800' }
    case JobStatus.CANCELLED:
      return { text: 'Cancelled', className: 'bg-gray-100 text-gray-600' }
    case JobStatus.WAITING_DEPENDENCY:
      return { text: 'Waiting', className: 'bg-orange-100 text-orange-800' }
    default:
      return { text: 'Unknown', className: 'bg-gray-100 text-gray-800' }
  }
}

export function JobsPage({ projectId, projectName, onBack, onSelectJob }: JobsPageProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['jobs', projectId],
    queryFn: async () => {
      const client = getJobClient()
      return client.listJobs({ projectId, limit: 100, offset: 0 })
    },
  })

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
              <h1 className="text-xl font-bold text-gray-900">Jobs - {projectName}</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {isLoading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
              <p className="mt-2 text-gray-500">Loading jobs...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-600">
                Failed to load jobs: {error instanceof Error ? error.message : 'Unknown error'}
              </p>
            </div>
          )}

          {data && data.jobs.length === 0 && (
            <div className="border-4 border-dashed border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-500">
                No jobs yet. Jobs are created when tickets are synced.
              </p>
            </div>
          )}

          {data && data.jobs.length > 0 && (
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ticket
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Iteration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.jobs.map((job: Job) => {
                    const badge = getStatusBadge(job.status)
                    return (
                      <tr
                        key={job.id}
                        onClick={() => onSelectJob(job.id)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {job.ticket?.title || `Ticket ${job.ticketId.slice(0, 8)}`}
                          </div>
                          {job.ticket?.externalId && (
                            <div className="text-xs text-gray-500">{job.ticket.externalId}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${badge.className}`}
                          >
                            {badge.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {job.iteration} / {job.maxIterations}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {job.updatedAt
                            ? new Date(Number(job.updatedAt.seconds) * 1000).toLocaleString()
                            : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

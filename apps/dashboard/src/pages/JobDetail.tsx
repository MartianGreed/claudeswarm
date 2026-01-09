import type { JobLog } from '@claudeswarm/proto'
import { JobStatus } from '@claudeswarm/proto'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getJobClient } from '../lib/api'

interface JobDetailPageProps {
  jobId: string
  onBack: () => void
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
    case JobStatus.NEEDS_PERMISSION:
      return { text: 'Needs Permission', className: 'bg-orange-100 text-orange-800' }
    default:
      return { text: 'Unknown', className: 'bg-gray-100 text-gray-800' }
  }
}

export function JobDetailPage({ jobId, onBack }: JobDetailPageProps) {
  const queryClient = useQueryClient()
  const [answer, setAnswer] = useState('')
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())

  const { data, isLoading, error } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const client = getJobClient()
      return client.getJob({ jobId })
    },
  })

  const { data: logsData } = useQuery({
    queryKey: ['jobLogs', jobId],
    queryFn: async () => {
      const client = getJobClient()
      return client.getJobLogs({ jobId, limit: 50, offset: 0 })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const client = getJobClient()
      return client.cancelJob({ jobId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })

  const retryMutation = useMutation({
    mutationFn: async () => {
      const client = getJobClient()
      return client.retryJob({ jobId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })

  const answerMutation = useMutation({
    mutationFn: async () => {
      const client = getJobClient()
      return client.answerClarification({ jobId, answer })
    },
    onSuccess: () => {
      setAnswer('')
      queryClient.invalidateQueries({ queryKey: ['job', jobId] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })

  const permissionMutation = useMutation({
    mutationFn: async (approved: boolean) => {
      const client = getJobClient()
      return client.answerPermission({ jobId, approved })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })

  const toggleLog = (logId: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev)
      if (next.has(logId)) {
        next.delete(logId)
      } else {
        next.add(logId)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error || !data?.job) {
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
        <main className="max-w-4xl mx-auto py-8 px-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-600">
              {error instanceof Error ? error.message : 'Job not found'}
            </p>
          </div>
        </main>
      </div>
    )
  }

  const job = data.job
  const ticket = data.ticket
  const badge = getStatusBadge(job.status)
  const canCancel = job.status === JobStatus.RUNNING || job.status === JobStatus.PENDING
  const canRetry = job.status === JobStatus.FAILED || job.status === JobStatus.CANCELLED
  const needsClarification = job.status === JobStatus.NEEDS_CLARIFICATION
  const needsPermission = job.status === JobStatus.NEEDS_PERMISSION

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
              <h1 className="text-xl font-bold text-gray-900">Job Details</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{ticket?.title || 'Unknown'}</h2>
              {ticket?.externalUrl && (
                <a
                  href={ticket.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  View in ticket system
                </a>
              )}
            </div>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${badge.className}`}>
              {badge.text}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Iteration:</span>{' '}
              <span className="font-medium">
                {job.iteration} / {job.maxIterations}
              </span>
            </div>
            {job.branchName && (
              <div>
                <span className="text-gray-500">Branch:</span>{' '}
                <span className="font-mono text-xs">{job.branchName}</span>
              </div>
            )}
            {job.prUrl && (
              <div className="col-span-2">
                <span className="text-gray-500">PR:</span>{' '}
                <a
                  href={job.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {job.prUrl}
                </a>
              </div>
            )}
            {job.errorMessage && (
              <div className="col-span-2">
                <span className="text-gray-500">Error:</span>
                <span className="text-red-600 block">{job.errorMessage}</span>
                {job.errorStack && (
                  <pre className="mt-2 text-xs bg-red-50 p-2 rounded overflow-auto max-h-48 text-red-800">
                    {job.errorStack}
                  </pre>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            {canCancel && (
              <button
                type="button"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Job'}
              </button>
            )}
            {canRetry && (
              <button
                type="button"
                onClick={() => retryMutation.mutate()}
                disabled={retryMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {retryMutation.isPending ? 'Retrying...' : 'Retry Job'}
              </button>
            )}
          </div>
        </div>

        {needsClarification && (
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">Clarification Needed</h3>
            <p className="text-yellow-700 mb-4">{job.clarificationQuestion}</p>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer..."
              rows={3}
              className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
            <button
              type="button"
              onClick={() => answerMutation.mutate()}
              disabled={!answer.trim() || answerMutation.isPending}
              className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
            >
              {answerMutation.isPending ? 'Sending...' : 'Send Answer'}
            </button>
          </div>
        )}

        {needsPermission && (
          <div className="bg-orange-50 rounded-lg border border-orange-200 p-6">
            <h3 className="text-lg font-semibold text-orange-800 mb-2">Permission Required</h3>
            <p className="text-orange-700 mb-2">
              Claude needs permission to run the following command:
            </p>
            <pre className="bg-orange-100 text-orange-900 px-3 py-2 rounded-md font-mono text-sm mb-4 overflow-x-auto">
              {job.pendingPermissionRequest}
            </pre>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => permissionMutation.mutate(true)}
                disabled={permissionMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {permissionMutation.isPending ? 'Processing...' : 'Approve'}
              </button>
              <button
                type="button"
                onClick={() => permissionMutation.mutate(false)}
                disabled={permissionMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {permissionMutation.isPending ? 'Processing...' : 'Deny'}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Logs</h3>
          {(!logsData?.logs || logsData.logs.length === 0) && (
            <p className="text-gray-500 text-sm">No logs yet.</p>
          )}
          {logsData?.logs && logsData.logs.length > 0 && (
            <div className="space-y-2">
              {logsData.logs.map((log: JobLog) => (
                <div key={log.id} className="border rounded-md">
                  <button
                    type="button"
                    onClick={() => toggleLog(log.id)}
                    className="w-full px-4 py-2 flex justify-between items-center text-left hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                        #{log.iteration}
                      </span>
                      <span className="text-sm font-medium">{log.eventType}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {log.createdAt
                        ? new Date(Number(log.createdAt.seconds) * 1000).toLocaleString()
                        : '-'}
                    </span>
                  </button>
                  {expandedLogs.has(log.id) && log.claudeOutput && (
                    <div className="px-4 py-3 bg-gray-50 border-t">
                      <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-96">
                        {log.claudeOutput}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

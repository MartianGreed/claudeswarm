import { useState } from 'react'

type View = 'projects' | 'jobs'

export default function App() {
  const [currentView, setCurrentView] = useState<View>('projects')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">ClaudeSwarm</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView('projects')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentView === 'projects'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Projects
              </button>
              <button
                onClick={() => setCurrentView('jobs')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentView === 'jobs'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Jobs
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {currentView === 'projects' ? <ProjectsView /> : <JobsView />}
      </main>
    </div>
  )
}

function ProjectsView() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Projects</h2>
        <p className="text-gray-500">
          No projects yet. Create a project to start processing tickets.
        </p>
        <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          Create Project
        </button>
      </div>
    </div>
  )
}

function JobsView() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Jobs</h2>
        <p className="text-gray-500">
          No jobs running. Sync tickets from a project to create jobs.
        </p>
      </div>
    </div>
  )
}

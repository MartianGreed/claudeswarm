import { useEffect, useState } from 'react'
import { useAuth } from './lib/auth'
import { JobDetailPage } from './pages/JobDetail'
import { JobsPage } from './pages/Jobs'
import { LoginPage } from './pages/Login'
import { NewProjectPage } from './pages/NewProject'
import { ProjectDetailPage } from './pages/ProjectDetail'
import { ProjectsPage } from './pages/Projects'
import { VerifyPage } from './pages/Verify'

type Route =
  | 'login'
  | 'verify'
  | 'projects'
  | 'new-project'
  | 'project-detail'
  | 'jobs'
  | 'job-detail'

function getInitialRoute(): Route {
  const path = window.location.pathname
  const params = new URLSearchParams(window.location.search)

  if (path === '/verify' && params.get('token')) {
    return 'verify'
  }
  if (path === '/login') {
    return 'login'
  }
  if (path === '/projects/new') {
    return 'new-project'
  }
  return 'projects'
}

export default function App() {
  const { isAuthenticated, isLoading } = useAuth()
  const [route, setRoute] = useState<Route>(getInitialRoute)
  const [verifyToken, setVerifyToken] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedProjectName, setSelectedProjectName] = useState<string>('')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token && route === 'verify') {
      setVerifyToken(token)
    }
  }, [route])

  useEffect(() => {
    if (!isLoading && !isAuthenticated && route !== 'login' && route !== 'verify') {
      setRoute('login')
      window.history.pushState({}, '', '/login')
    }
  }, [isLoading, isAuthenticated, route])

  const navigate = (newRoute: Route, path?: string) => {
    setRoute(newRoute)
    window.history.pushState({}, '', path || `/${newRoute}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (route === 'login') {
    return <LoginPage />
  }

  if (route === 'verify' && verifyToken) {
    return (
      <VerifyPage
        token={verifyToken}
        onSuccess={() => {
          navigate('projects', '/')
        }}
      />
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  if (route === 'new-project') {
    return (
      <NewProjectPage
        onBack={() => navigate('projects', '/')}
        onSuccess={() => navigate('projects', '/')}
      />
    )
  }

  if (route === 'project-detail' && selectedProjectId) {
    return (
      <ProjectDetailPage
        projectId={selectedProjectId}
        onBack={() => navigate('projects', '/')}
        onDeleted={() => {
          setSelectedProjectId(null)
          navigate('projects', '/')
        }}
        onViewJobs={(projectName) => {
          setSelectedProjectName(projectName)
          navigate('jobs', `/projects/${selectedProjectId}/jobs`)
        }}
      />
    )
  }

  if (route === 'jobs' && selectedProjectId) {
    return (
      <JobsPage
        projectId={selectedProjectId}
        projectName={selectedProjectName}
        onBack={() => navigate('project-detail', `/projects/${selectedProjectId}`)}
        onSelectJob={(jobId) => {
          setSelectedJobId(jobId)
          navigate('job-detail', `/jobs/${jobId}`)
        }}
      />
    )
  }

  if (route === 'job-detail' && selectedJobId) {
    return (
      <JobDetailPage
        jobId={selectedJobId}
        onBack={() => {
          if (selectedProjectId) {
            navigate('jobs', `/projects/${selectedProjectId}/jobs`)
          } else {
            navigate('projects', '/')
          }
        }}
      />
    )
  }

  return (
    <ProjectsPage
      onCreateProject={() => navigate('new-project', '/projects/new')}
      onSelectProject={(projectId) => {
        setSelectedProjectId(projectId)
        navigate('project-detail', `/projects/${projectId}`)
      }}
    />
  )
}

import { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Register from './pages/Register'
import VerifyAccount from './pages/VerifyAccount'
import Dashboard from './pages/Dashboard'
import UploadPaper from './pages/UploadPaper'
import SearchPapers from './pages/SearchPapers'
import ViewPaper from './pages/ViewPaper'
import AdminDashboard from './pages/AdminDashboard'
import './App.css'

function useRoute() {
  const [route, setRoute] = useState(window.location.pathname)

  useEffect(() => {
    const handlePopState = () => setRoute(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (path) => {
    window.history.pushState({}, '', path)
    setRoute(path)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return { route, navigate }
}

function App() {
  const { route, navigate } = useRoute()
  const { user, isLoading } = useAuth()

  const renderPage = () => {
    if (isLoading) {
      return <div className="loading-screen"><p>Loading...</p></div>
    }

    const isAuthenticated = !!user

    // Auth-only routes: redirect to login if not authenticated
    const protectedRoutes = ['/dashboard', '/upload', '/search']
    if (!isAuthenticated && (protectedRoutes.includes(route) || route.startsWith('/papers/'))) {
      navigate('/login')
      return null
    }

    // Admin-only route
    if (route === '/admin') {
      if (!isAuthenticated) { navigate('/login'); return null }
      if (user.role !== 'admin') { navigate('/dashboard'); return null }
      return <AdminDashboard navigate={navigate} />
    }

    // Guest-only routes: redirect to dashboard if already logged in
    const guestRoutes = ['/login', '/register']
    if (isAuthenticated && guestRoutes.includes(route)) {
      navigate('/dashboard')
      return null
    }

    if (route === '/dashboard') return <Dashboard navigate={navigate} />
    if (route === '/upload') return <UploadPaper navigate={navigate} />
    if (route === '/search') return <SearchPapers navigate={navigate} />
    if (route.startsWith('/papers/')) return <ViewPaper navigate={navigate} paperId={route.split('/')[2]} />
    if (route === '/login') return <Login navigate={navigate} />
    if (route === '/forgot-password') return <ForgotPassword navigate={navigate} />
    if (route === '/reset-password') return <ResetPassword navigate={navigate} />
    if (route === '/register') return <Register navigate={navigate} />
    if (route === '/verify') return <VerifyAccount navigate={navigate} />
    return <Home navigate={navigate} />
  }

  return (
    <div className="app-shell">
      <Navbar navigate={navigate} currentRoute={route} />
      <main>{renderPage()}</main>
      <Footer navigate={navigate} />
    </div>
  )
}

export default App

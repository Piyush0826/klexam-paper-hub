import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'

function Navbar({ navigate, currentRoute }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const isAuthenticated = !!user

  const goTo = (event, path) => { event.preventDefault(); setMenuOpen(false); navigate(path) }

  return (
    <header className="site-header">
      <div className="nav-wrap">
        <Logo navigate={navigate} />
        <button className="menu-toggle" type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><span /><span /><span /></button>
        <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          {user?.role === 'admin' ? (
            <>
              <a className={currentRoute === '/dashboard' ? 'active' : ''} href="/dashboard" onClick={(event) => goTo(event, '/dashboard')}>Dashboard</a>
              <a className={currentRoute === '/search' ? 'active' : ''} href="/search" onClick={(event) => goTo(event, '/search')}>Search papers</a>
              <a className={currentRoute === '/admin' ? 'active' : ''} href="/admin" onClick={(event) => goTo(event, '/admin')}>Admin</a>
              <span className="nav-divider" aria-hidden="true" />
              <a className="nav-cta" href="/upload" onClick={(event) => goTo(event, '/upload')}>+ Upload paper</a>
              <button type="button" className="nav-logout" onClick={() => { setMenuOpen(false); logout() }}>Log out</button>
            </>
          ) : isAuthenticated ? (
            <>
              <a className={currentRoute === '/dashboard' ? 'active' : ''} href="/dashboard" onClick={(event) => goTo(event, '/dashboard')}>Dashboard</a>
              <a className={currentRoute === '/search' ? 'active' : ''} href="/search" onClick={(event) => goTo(event, '/search')}>Search papers</a>
              <span className="nav-divider" aria-hidden="true" />
              <a className="nav-cta" href="/upload" onClick={(event) => goTo(event, '/upload')}>+ Upload paper</a>
              <button type="button" className="nav-logout" onClick={() => { setMenuOpen(false); logout() }}>Log out</button>
            </>
          ) : (
            <>
              <a className={currentRoute === '/' ? 'active' : ''} href="/" onClick={(event) => goTo(event, '/')}>Home</a>
              <span className="nav-divider" aria-hidden="true" />
              <a className="nav-cta" href="/login" onClick={(event) => goTo(event, '/login')}>Log in</a>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Navbar
import Logo from './Logo'

function Footer({ navigate }) {
  return <footer className="site-footer"><div className="footer-wrap"><Logo navigate={navigate} /><p>Shared knowledge. Better preparation.</p><span className="footer-note">For the college community · 2026</span></div></footer>
}

export default Footer
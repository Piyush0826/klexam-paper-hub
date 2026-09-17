function Logo({ navigate }) {
  return (
    <a className="brand" href="/" onClick={(event) => { event.preventDefault(); navigate('/') }}>
      <span className="brand-mark" aria-hidden="true">K</span>
      <span>KLExamPrep</span>
    </a>
  )
}

export default Logo
function SearchBar({ value, onChange, onSubmit }) {
  return <form className="search-bar" onSubmit={onSubmit}><label htmlFor="paper-search">Search by subject</label><div className="search-input-wrap"><span aria-hidden="true">⌕</span><input id="paper-search" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Enter subject name" /><button type="submit">Search</button></div></form>
}

export default SearchBar
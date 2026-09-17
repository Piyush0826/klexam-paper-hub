function FilterBar({ filters, onChange }) {
  return <div className="filter-bar"><label>Department<select value={filters.department} onChange={(event) => onChange('department', event.target.value)}><option value="">All departments</option><option>CSE</option><option>IT</option><option>ECE</option></select></label><label>Semester<select value={filters.semester} onChange={(event) => onChange('semester', event.target.value)}><option value="">All semesters</option><option>Odd</option><option>Even</option></select></label><label>Year<select value={filters.year} onChange={(event) => onChange('year', event.target.value)}><option value="">All years</option><option>2025</option><option>2024</option></select></label></div>
}

export default FilterBar
function EmptyState({ title = 'No exam papers found.', message = 'Try another subject name or change the filters.' }) {
  return <div className="empty-state"><span aria-hidden="true">⌕</span><h3>{title}</h3><p>{message}</p></div>
}

export default EmptyState
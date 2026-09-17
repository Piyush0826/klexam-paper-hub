function FormInput({ label, id, error, ...props }) {
  return <div className="form-field"><label htmlFor={id}>{label}</label><input id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...props} />{error && <p className="field-error" id={`${id}-error`}>{error}</p>}</div>
}

export default FormInput
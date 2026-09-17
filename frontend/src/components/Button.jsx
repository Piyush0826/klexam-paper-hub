function Button({ children, variant = 'primary', type = 'button', onClick, disabled = false, style }) {
  return <button className={`button button-${variant}`} type={type} onClick={onClick} disabled={disabled} style={style}>{children}</button>
}

export default Button
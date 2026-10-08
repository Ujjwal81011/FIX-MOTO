export default function Button({ children, variant = "primary", className = "", ...props }) {
  return <button className={`${variant === "primary" ? "btn-primary" : "btn-secondary"} ${className}`} {...props}>{children}</button>;
}
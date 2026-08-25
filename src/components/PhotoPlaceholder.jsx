import './PhotoPlaceholder.css'

export default function PhotoPlaceholder({ label, className = '', tone = 'light' }) {
  return (
    <div className={`photo-placeholder tone-${tone} ${className}`}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="8.5" cy="10" r="1.6" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 16l5-4 4 3 3-2 6 5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
      <span>{label}</span>
    </div>
  )
}

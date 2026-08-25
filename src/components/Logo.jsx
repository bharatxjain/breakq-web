export default function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="16" fill="#7001FE" />
      <circle cx="30" cy="30" r="13" stroke="#ffffff" strokeWidth="6" fill="none" />
      <path d="M39 39 L48 48" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}

// Minimal 20x20 stroke icons for the sidebar (so the collapsed rail is legible).

const PATHS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="3" y="15" width="7" height="6" rx="1.5" />
      <rect x="14" y="3" width="7" height="6" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16 6.5a3 3 0 0 1 0 5.6" />
      <path d="M17.5 19c0-2.3-1-4-2.6-4.6" />
    </>
  ),
  vendors: (
    <>
      <path d="M4 9h16l-1-5H5L4 9Z" />
      <path d="M5 9v10h14V9" />
      <path d="M10 19v-5h4v5" />
    </>
  ),
  subscriptions: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
    </>
  ),
  payments: (
    <>
      <path d="M7 6h9" />
      <path d="M7 10h9" />
      <path d="M7 6c4 0 4 7 0 7l6 5" />
    </>
  ),
  promotions: (
    <>
      <path d="M4 9v6l11 4V5L4 9Z" />
      <path d="M15 8a3 3 0 0 1 0 8" />
      <path d="M7 15v3a1 1 0 0 0 1 1h2" />
    </>
  ),
  coupons: (
    <>
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" />
      <path d="M15 6v10" strokeDasharray="1.5 2.5" />
    </>
  ),
  categories: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </>
  ),
  health: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2 2M16.5 16.5l2 2M5.5 18.5l2-2M16.5 7.5l2-2" />
    </>
  ),
};

export default function NavIcon({ name }) {
  return (
    <svg
      className="ap-nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name] || PATHS.dashboard}
    </svg>
  );
}

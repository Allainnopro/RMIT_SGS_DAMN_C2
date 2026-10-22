// Re-mounted on every navigation (the layout is not), so each page fades up into place.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}

import Link from "next/link";

export function NavItem({
  href,
  icon,
  label,
  count,
  alert,
  active,
}: {
  href: string;
  icon: string;
  label: string;
  count: number;
  alert: number;
  active: boolean;
}) {
  return (
    <Link href={href} className={`nav-item${active ? " is-active" : ""}`}>
      <i className={`ph ${icon} nav-item-icon`} aria-hidden />
      <span className="nav-item-label">{label}</span>
      <span className={`nav-badge${alert > 0 ? " is-alert" : ""}`}>{count}</span>
    </Link>
  );
}

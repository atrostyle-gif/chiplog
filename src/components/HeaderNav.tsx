import { Link, useLocation } from "react-router-dom";

const TABS: { to: string; labelEn: string; labelJa: string }[] = [
  { to: "/", labelEn: "Select Chip", labelJa: "チップ選択" },
  { to: "/cutting-log", labelEn: "Cutting Log", labelJa: "加工ログ" },
  { to: "/chip-admin", labelEn: "Chip Admin", labelJa: "チップ管理" },
  { to: "/recommend-admin", labelEn: "Recommendations", labelJa: "推奨条件" },
];

export function HeaderNav() {
  const location = useLocation();
  const pathname = location.pathname;

  const isActive = (to: string) => {
    if (to === "/") return pathname === "/" || pathname.startsWith("/chip/");
    return pathname === to || pathname.startsWith(`${to}/`);
  };

  return (
    <header className="header-nav">
      <h1 className="header-nav__title">
        <Link to="/">CHIPLOG</Link>
      </h1>
      <nav className="header-nav__tabs">
        {TABS.map(({ to, labelEn, labelJa }) => (
          <Link
            key={to}
            to={to}
            className={`header-nav__link ${isActive(to) ? "header-nav__link--active" : ""}`}
          >
            <span className="header-nav__link-en">{labelEn}</span>
            <span className="header-nav__link-ja">{labelJa}</span>
          </Link>
        ))}
      </nav>
    </header>
  );
}

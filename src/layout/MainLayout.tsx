import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useGlobalState } from "../context/GlobalStateContext";
import { NAV_SECTIONS } from "../routeMetadata";

export function MainLayout() {
  const { currentSection, myCompanyInfo } = useGlobalState();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="app-shell">
      <button
        type="button"
        className="btn btn-dark d-lg-none sidebar-toggle"
        onClick={() => setNavOpen((o) => !o)}
      >
        ☰ Menu
      </button>
      <aside className={`sidebar ${navOpen ? "open" : ""}`}>
        <nav className="sidebar-nav navbar-dark">
          <Link to="/" className="navbar-brand text-white mb-3 d-block">
            <span className="me-2">▦</span> DKSK
          </Link>
          <div className="sidebar-context small text-white-50 mb-3">
            <div>Current Section: {currentSection}</div>
            {myCompanyInfo?.name && (
              <div>Company: {myCompanyInfo.name}</div>
            )}
          </div>
          {NAV_SECTIONS.map((section) => (
            <div key={section.header} className="mb-3">
              <div className="nav-section-header text-white-50">
                {section.header}
              </div>
              <ul className="nav flex-column">
                {section.items.map((item) => (
                  <li key={item.to} className="nav-item">
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        `nav-link ${isActive ? "active" : ""}`
                      }
                      onClick={() => setNavOpen(false)}
                    >
                      <span className="me-2">{item.icon}</span>
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

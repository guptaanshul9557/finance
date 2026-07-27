import React from 'react';
import { NavLink } from 'react-router-dom';
import { getSidebarScreens } from '../config/screenRegistry';
import '../styles/Sidebar.css';

const Sidebar = () => {
  // Get dynamic screens from screenRegistry
  const sidebarScreens = getSidebarScreens();

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <ul className="sidebar-menu">
          {/* Static Home Link */}
          <li>
            <NavLink
              to="/mis-dashboard" 
              className={({ isActive }) =>
                isActive ? 'sidebar-link active' : 'sidebar-link'
              }
            >
              <svg
                className="sidebar-icon"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              <span className="sidebar-label">Home</span>
            </NavLink>
          </li>

          {/* Static Dashboard Link */}
          {/* <li>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                isActive ? 'sidebar-link active' : 'sidebar-link'
              }
            >
              <svg
                className="sidebar-icon"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" />
                <path d="M3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6z" />
                <path d="M14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
              <span className="sidebar-label">Dashboard</span>
            </NavLink>
          </li> */}

          {/* Dynamic Screens from Registry */}
          {sidebarScreens.map((screen) => (
            <li key={screen.id}>
              <NavLink
                to={screen.route}
                className={({ isActive }) =>
                  isActive ? 'sidebar-link active' : 'sidebar-link'
                }
              >
                <span className="sidebar-icon" style={{ fontSize: '20px' }}>
                  {screen.icon}
                </span>
                <span className="sidebar-label">{screen.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;

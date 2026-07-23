import React from 'react';
// import Header from './Header';
// import Sidebar from './Sidebar';
import '../styles/Layout.css';

const Layout = ({ children }) => {
  return (
    <div className="layout">
      {/* <Header /> */}
      <div className="layout-body">
        {/* <Sidebar /> */}
        <main className="layout-content" style={{ marginLeft: 0, width: '100%' }}>{children}</main>
      </div>
    </div>
  );
};

export default Layout;

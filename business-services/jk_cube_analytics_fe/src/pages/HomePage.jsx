/**
 * Home Page - Module Card Selector
 * Shows all available modules as cards
 * Click card to navigate to module detail page
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { getHomescreenScreens } from '../config/screenRegistry';
import { globalConfig } from '../config/globalConfig';

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const modules = getHomescreenScreens();
  const [isLoading, setIsLoading] = useState(false);
  const [homeScreenCard, setHomeScreenCard] = useState([]);
  const [accessDenied, setAccessDenied] = useState(false);

  const handleModuleClick = (modulePath) => {
    navigate(modulePath);
  };

//   // Fetch dashboard permissions when user loads
useEffect(() => {
  const fetchPermissions = async () => {
    try {
//       let serverPerm = null;

//       const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
//       const userName = userInfo?.userName || "";

//       console.log("🔍 Fetching server config for USER_PERMISSION...", userName);

//       try {
//         const cfg = await axios.post(
//           `${window.location.origin}/mis-dashboard-be/auth/config`,
//           { userId: userName }
//         );

//         serverPerm = cfg?.data?.env?.USER_PERMISSION;
//         console.log("🔁 /api/config returned USER_PERMISSION:", serverPerm);

//         if (serverPerm?.toUpperCase?.() !== "ALL") {
//           if (serverPerm === false) {
//             setAccessDenied(true);
//             setIsLoading(false);
//             return;
//           }
//         }
//       } catch (e) {
//         console.warn(
//           "⚠️ Could not fetch /api/config, falling back to client envs",
//           e?.message || e
//         );
//         setAccessDenied(true);
//         setIsLoading(false);
//         return;
//       }

//       const perm = String(serverPerm || "ALL").trim();

//       // ✅ Allowed — proceed
//       setIsLoading(true);

//       const payload = {
//         department: localStorage.getItem("userDepartment") || "999901",
//         moduleId: localStorage.getItem("moduleId") || "11",
//         userId: userInfo?.id || null,
//         officeId: localStorage.getItem("officeId") || "46",
//         roleId: localStorage.getItem("roleId") || "11365",
//         parentModule: "MIS",
//       };

//       console.log("🔐 Fetching dashboard permissions...");

//       const res = await axios.post(
//         `${window?.location?.origin}/pwc-db-services/checkDashboardItems`,
//         payload
//       );
      setHomeScreenCard(modules);


//       // if (res?.data?.status === 200) {
//       //   const uniqueItems = res.data.data.filter(
//       //     (item, index, self) =>
//       //       index === self.findIndex((t) => t.displaytext === item.displaytext)
//       //   );

//       //   console.log("✅ Dashboard items loaded:", uniqueItems.length);

//       //   const uniqueHomeCard = modules.filter((item) =>
//       //     res.data.data.some((r) => r.displaytext === item.displayName)
//       //   );

//       //   console.log("🎯 Matched home cards:", uniqueHomeCard);

//       //   setHomeScreenCard(uniqueHomeCard);
//       // } else {
//       //   console.warn("⚠️ Unexpected status:", res.status);
//       // }
    } catch (err) {
      console.error("❌ Unexpected error in permission check:", err);
      setAccessDenied(true);
    } finally {
      setIsLoading(false);
    }
  };

  fetchPermissions();
}, []);
  

//   if (accessDenied) {
//     const orange = '#ff7f2a';
//     const blue = '#1e73be';
//     return (
//       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', background: `linear-gradient(180deg, ${orange}10, #f5f7fa)` }}>
//         <div style={{ textAlign: 'center', maxWidth: '720px', padding: '28px', borderRadius: '10px', background: '#fff', boxShadow: `0 10px 30px rgba(30,115,190,0.12)`, borderLeft: `6px solid ${orange}` }}>
//           <h2 style={{ margin: '0 0 10px 0', color: orange, fontSize: '22px', fontWeight: 700 }}>Access Denied</h2>
//           <p style={{ margin: '0 0 12px 0', color: blue, fontWeight: 600 }}>You do not have permission to view this dashboard.</p>
//           <p style={{ margin: 0, color: '#555' }}>Please contact your administrator to grant access.</p>
//         </div>
//       </div>
//     );
//   }

  return (
    <div style={{  backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', marginBottom: '30px' }}>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            margin: '0 0 8px 0',
            color: globalConfig.colors.text,
          }}
        >
        Analytics Dashboard
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: globalConfig.colors.textSecondary,
            margin: 0,
          }}
        >
          Select a module to view analytics and detailed insights
        </p>
      </div>

      {/* Module Cards Grid */}
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '15px',
        }}
      >
        {console.log({homeScreenCard})}
        {homeScreenCard.map((module) => (
          <div
            key={module.id}
            onClick={() => handleModuleClick(module.route)}
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              padding: '10px 20px',
              cursor: 'pointer',
              // border: `2px solid ${module.color}`,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease',
              transform: 'translateY(0)',
              borderLeft: `4px solid ${module.color}`,
              minHeight:"150px",
              display:"flex",
              flexDirection:"column",
              justifyContent:"center",
              alignItems:"center"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = `0 12px 20px rgba(0, 0, 0, 0.30), 0 0 0 3px ${module.color}33`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            }}
          >
            {/* Icon */}
            <div
              style={{
                fontSize: '30px',
                marginBottom: '10px',
                display: 'flex',
                justifyContent:"center"
              }}
            >
              {module.icon}
            </div>

            {/* Title */}
            <h2
              style={{
                fontSize: '15px',
                fontWeight: '500',
                margin: '0 0 6px 0',
                color: module.color,
                display:"flex",
                alignItems: "center", 
                textAlign: "center",
              }}
            >
              {module.displayName}
            </h2>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {modules.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: globalConfig.colors.textSecondary,
          }}
        >
          <p style={{ fontSize: '18px' }}>No modules available at this time.</p>
        </div>
      )}
    </div>
  );
};

export default HomePage;

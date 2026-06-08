import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, Clock, FileText, Users, BookOpen, LogOut, Menu, X, ChevronsLeft, ChevronsRight, UserCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AppBrand from '../../components/AppBrand';
import isActiveNav from '../../lib/isActiveNav';
import DashboardSearch from '../../components/DashboardSearch';
import NotificationBell from '../../components/NotificationBell';
import HelpMenu from '../../components/HelpMenu';
import styles from './Admin.module.css';

const AdminLayout = () => {
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const navItems = [
    { path: '/admin', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { path: '/admin/approvals', icon: <Clock size={18} />, label: 'Pending Approvals' },
    { path: '/admin/faculty', icon: <FileText size={18} />, label: 'Faculty Management' },
    { path: '/admin/students', icon: <Users size={18} />, label: 'Student Management' },
    { path: '/admin/courses', icon: <BookOpen size={18} />, label: 'Courses' },
    { path: '/admin/profile', icon: <UserCircle size={18} />, label: 'Profile' },
  ];

  const checkActive = (itemPath: string) => isActiveNav('/admin', itemPath, location.pathname);

  return (
    <div
      className={styles.adminContainer}
		data-theme="admin"
    >
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div className={styles.sidebarOverlay} onClick={() => setIsSidebarOpen(false)}></div>
        )}

        <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ''} ${isSidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
          <div className={styles.sidebarHeader}>
            <AppBrand subtitle="Admin Portal" />
            <button
              className={styles.sidebarControlBtn}
              onClick={() => setIsSidebarCollapsed((v) => !v)}
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            </button>
            <button className={styles.mobileCloseBtn} onClick={() => setIsSidebarOpen(false)} aria-label="Close sidebar">
              <X size={20} />
            </button>
          </div>
          
          <nav className={styles.sidebarNav}>
          {navItems.map(item => (
            <Link 
              key={item.path} 
              to={item.path}
              className={`${styles.navItem} ${checkActive(item.path) ? styles.active : ''}`}
              onClick={() => setIsSidebarOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userProfile}>
            <div className={styles.userAvatar}></div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{profile?.full_name || 'System Admin'}</span>
              <span className={styles.userRole}>System Admin</span>
            </div>
            <button className={styles.logoutBtn} onClick={signOut} title="Log out" aria-label="Log out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      
      <div className={styles.mainWrapper}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button className={styles.mobileMenuBtn} onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <h1 className={styles.topbarTitle}>Dashboard Overview</h1>
          </div>
          <div className={styles.topbarRight}>
            <DashboardSearch role="admin" placeholder="Search data, reports..." />
            <NotificationBell basePath="/admin" />
            <HelpMenu basePath="/admin" />
          </div>
        </header>

        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

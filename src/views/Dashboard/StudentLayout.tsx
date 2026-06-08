import { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, ClipboardList, FolderOpen, Settings, LogOut, Menu, X, ChevronsLeft, ChevronsRight, UserCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AppBrand from '../../components/AppBrand';
import isActiveNav from '../../lib/isActiveNav';
import DashboardSearch from '../../components/DashboardSearch';
import NotificationBell from '../../components/NotificationBell';
import HelpMenu from '../../components/HelpMenu';
import styles from './Admin.module.css'; // Reusing the same generic layout CSS!

const StudentLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const navItems = [
    { path: '/student', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { path: '/student/courses', icon: <BookOpen size={18} />, label: 'My Courses' },
    { path: '/student/assignments', icon: <ClipboardList size={18} />, label: 'Assessment' },
    { path: '/student/resources', icon: <FolderOpen size={18} />, label: 'Resources' },
    { path: '/student/profile', icon: <UserCircle size={18} />, label: 'Profile' },
  ];

  const checkActive = (itemPath: string) => isActiveNav('/student', itemPath, location.pathname);

  return (
    <div
      className={styles.adminContainer}
		data-theme="student"
    >
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div className={styles.sidebarOverlay} onClick={() => setIsSidebarOpen(false)}></div>
        )}

        <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ''} ${isSidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
          <div className={styles.sidebarHeader}>
            <AppBrand subtitle="Student Portal" />
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
              <span className={styles.userName}>{profile?.full_name || 'Student'}</span>
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
          <DashboardSearch role="student" placeholder="Search lessons, materials..." />
          <div className={styles.topbarRight}>
            <NotificationBell basePath="/student" />
            <HelpMenu basePath="/student" />
            <button className={styles.iconBtn} onClick={() => navigate('/student/profile')} title="Profile settings" aria-label="Profile settings">
              <Settings size={20} />
            </button>
            <div className={styles.userAvatar} style={{width: 36, height: 36}}></div>
          </div>
        </header>

        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;

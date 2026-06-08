import { useEffect, useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, BookOpen, Users, ClipboardList, FileText, Settings, LogOut, Menu, X, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import isActiveNav from '../../lib/isActiveNav';
import AppBrand from '../../components/AppBrand';
import DashboardSearch from '../../components/DashboardSearch';
import NotificationBell from '../../components/NotificationBell';
import HelpMenu from '../../components/HelpMenu';
import styles from './Admin.module.css';

const FacultyLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [designation, setDesignation] = useState('Faculty');

  useEffect(() => {
    let cancelled = false;
    const loadDesignation = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('faculty_profiles')
          .select('designation')
          .eq('id', user.id)
          .maybeSingle();
        if (!cancelled && data?.designation) {
          setDesignation(data.designation);
        }
      } catch {
        // keep default designation
      }
    };

    loadDesignation();
    return () => { cancelled = true; };
  }, [user]);

  const navItems = [
    { path: '/faculty', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { path: '/faculty/create-course', icon: <PlusCircle size={18} />, label: 'Create Course' },
    { path: '/faculty/my-courses', icon: <BookOpen size={18} />, label: 'My Courses' },
    { path: '/faculty/enrollments', icon: <Users size={18} />, label: 'Student Enrollments' },
    { path: '/faculty/progress', icon: <ClipboardList size={18} />, label: 'Student Progress' },
    { path: '/faculty/assignments', icon: <FileText size={18} />, label: 'Assessment' },
  ];

  const checkActive = (itemPath: string) => isActiveNav('/faculty', itemPath, location.pathname);

  return (
    <div
      className={styles.adminContainer}
		data-theme="faculty"
    >
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div className={styles.sidebarOverlay} onClick={() => setIsSidebarOpen(false)}></div>
        )}

        <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ''} ${isSidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
          <div className={styles.sidebarHeader}>
            <AppBrand subtitle="Faculty Portal" />
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
              <span className={styles.userName}>{profile?.full_name || 'Faculty Member'}</span>
              <span className={styles.userRole}>{designation}</span>
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
            <DashboardSearch role="faculty" placeholder="Search courses..." />
            <NotificationBell basePath="/faculty" />
            <HelpMenu basePath="/faculty" />
            <button className={styles.iconBtn} onClick={() => navigate('/faculty/profile')} title="Profile settings" aria-label="Profile settings">
              <Settings size={20} />
            </button>
            <button style={{
              background: 'var(--theme-primary)',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.875rem',
              padding: '0.625rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }} onClick={() => navigate('/faculty/create-course')}>
              Create Course
            </button>
          </div>
        </header>

        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default FacultyLayout;

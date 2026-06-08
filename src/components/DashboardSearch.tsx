import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import styles from '../views/Dashboard/Admin.module.css';

type SearchRole = 'student' | 'faculty' | 'admin';

interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  link: string;
  keywords: string;
}

export default function DashboardSearch({
  role,
  placeholder,
}: {
  role: SearchRole;
  placeholder: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [adminResults, setAdminResults] = useState<SearchItem[]>([]);
  const [adminSearching, setAdminSearching] = useState(false);
  const adminTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) {
        setItems([]);
        return;
      }

      if (role === 'admin') {
        return;
      }

      if (role === 'faculty') {
        const { data: courses } = await supabase
          .from('courses')
          .select('id, title')
          .eq('faculty_id', user.id)
          .order('created_at', { ascending: false })
          .limit(160);
        if (cancelled) return;
        const mapped: SearchItem[] = (((courses as { id: string; title: string }[]) || []).map((c) => ({
          id: `course-${c.id}`,
          title: c.title || 'Untitled course',
          subtitle: 'Course content',
          link: `/faculty/my-courses/${c.id}/content`,
          keywords: `${c.title || ''} course`,
        })));
        setItems(mapped);
        return;
      }

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id, courses(id, title)')
        .eq('student_id', user.id)
        .order('enrolled_at', { ascending: false })
        .limit(160);
      if (cancelled) return;
      const seen = new Set<string>();
    const mapped: SearchItem[] = [];
    for (const row of (enrollments as unknown as { course_id: string; courses: { id: string; title: string } }[]) || []) {
        const c = row?.courses;
        if (!c?.id || seen.has(c.id)) continue;
        seen.add(c.id);
        mapped.push({
          id: `course-${c.id}`,
          title: c.title || 'Untitled course',
          subtitle: 'My course',
          link: `/student/courses/${c.id}/learn`,
          keywords: `${c.title || ''} course`,
        });
      }
      setItems(mapped);
    })();

    return () => {
      cancelled = true;
    };
  }, [role, user?.id]);

  const searchAdmin = useCallback(async (q: string) => {
    if (!user?.id || q.trim().length < 2) {
      setAdminResults([]);
      setAdminSearching(false);
      return;
    }
    setAdminSearching(true);
    const like = `%${q.trim()}%`;
    try {
      const [{ data: courses }, { data: students }, { data: faculty }] = await Promise.all([
        supabase.from('courses').select('id, title').ilike('title', like).limit(10),
        supabase.from('profiles').select('id, full_name, email').eq('role', 'student').or(`full_name.ilike.${like},email.ilike.${like}`).limit(10),
        supabase.from('profiles').select('id, full_name, email').eq('role', 'faculty').or(`full_name.ilike.${like},email.ilike.${like}`).limit(10),
      ]);

      const studentIds = ((students as { id: string; full_name: string | null; email: string | null }[]) || []).map((s) => s.id);
      const facultyIds = ((faculty as { id: string; full_name: string | null; email: string | null }[]) || []).map((f) => f.id);
      const regById = new Map<string, string>();
      const empById = new Map<string, string>();

      if (studentIds.length > 0) {
        const { data: spData } = await supabase.from('student_profiles').select('id, reg_number').in('id', studentIds);
        ((spData as { id: string; reg_number: string | null }[]) || []).forEach((row) => { if (row?.id && row?.reg_number) regById.set(String(row.id), String(row.reg_number)); });
      }
      if (facultyIds.length > 0) {
        const { data: fpData } = await supabase.from('faculty_profiles').select('id, employee_id').in('id', facultyIds);
        ((fpData as { id: string; employee_id: string | null }[]) || []).forEach((row) => { if (row?.id && row?.employee_id) empById.set(String(row.id), String(row.employee_id)); });
      }

      const mapped: SearchItem[] = [
        ...((courses as { id: string; title: string }[]) || []).map((c) => ({
          id: `course-${c.id}`,
          title: c.title || 'Untitled course',
          subtitle: 'Course',
          link: '/admin/courses',
          keywords: `${c.title || ''} course`,
        })),
        ...((students as { id: string; full_name: string | null; email: string | null }[]) || []).map((s) => ({
          id: `student-${s.id}`,
          title: s.full_name || (s.email ? String(s.email).split('@')[0] : 'Student'),
          subtitle: `Student${regById.get(String(s.id)) ? ` - Reg ${regById.get(String(s.id))}` : s.email ? ` - ${s.email}` : ''}`,
          link: '/admin/students',
          keywords: `${s.full_name || ''} ${s.email || ''} ${regById.get(String(s.id)) || ''} student registration`,
        })),
        ...((faculty as { id: string; full_name: string | null; email: string | null }[]) || []).map((f) => ({
          id: `faculty-${f.id}`,
          title: f.full_name || (f.email ? String(f.email).split('@')[0] : 'Faculty'),
          subtitle: `Faculty${empById.get(String(f.id)) ? ` - Employee ${empById.get(String(f.id))}` : f.email ? ` - ${f.email}` : ''}`,
          link: '/admin/faculty',
          keywords: `${f.full_name || ''} ${f.email || ''} ${empById.get(String(f.id)) || ''} faculty employee`,
        })),
      ];
      setAdminResults(mapped);
    } catch {
      setAdminResults([]);
    } finally {
      setAdminSearching(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (role !== 'admin') return;
    if (adminTimerRef.current) clearTimeout(adminTimerRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setAdminResults([]);
      return;
    }
    adminTimerRef.current = setTimeout(() => { void searchAdmin(q); }, 300);
    return () => { if (adminTimerRef.current) clearTimeout(adminTimerRef.current); };
  }, [query, role, searchAdmin]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const filtered = useMemo(() => {
    if (role === 'admin') return adminResults.slice(0, 8);
    const q = query.trim().toLowerCase();
    if (!q) return [] as SearchItem[];
    return items
      .filter((i) => `${i.title} ${i.subtitle} ${i.keywords}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [role, items, adminResults, query]);

  return (
    <div className={styles.searchBar} ref={rootRef}>
        <Search size={16} className={styles.searchIcon} />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
            if (e.key === 'Enter' && filtered[0]) {
              e.preventDefault();
              navigate(filtered[0].link);
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          role="combobox"
          aria-expanded={open && query.trim().length >= (role === 'admin' ? 2 : 1)}
          aria-autocomplete="list"
        />
      {open && query.trim().length >= (role === 'admin' ? 2 : 1) && (
        <div className={styles.searchDropdown} role="listbox">
          {adminSearching ? (
            <p className={styles.searchEmpty}>Searching...</p>
          ) : filtered.length === 0 ? (
            <p className={styles.searchEmpty}>No results</p>
          ) : (
            filtered.map((item) => (
              <Link key={item.id} to={item.link} className={styles.searchResultItem} onClick={() => setOpen(false)}>
                <span className={styles.searchResultTitle}>{item.title}</span>
                <span className={styles.searchResultSub}>{item.subtitle}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { User, SocialCenter, BeggingSubject } from './types';
import SubjectForm from './components/SubjectForm';
import SubjectDetail from './components/SubjectDetail';
import AdminPortal from './components/AdminPortal';
import SheetsSync from './components/SheetsSync';
import StatsDashboard from './components/StatsDashboard';
import { getApiUrl, formatDate } from './utils/api';
import { 
  Building2, Search, Filter, Plus, FileSpreadsheet, Shield, LogOut, 
  UserPlus, LogIn, Calendar, MapPin, CheckCircle2, AlertCircle, Users,
  Smartphone, Monitor, Sparkles, RefreshCw, Loader2, BarChart3
} from 'lucide-react';

export default function App() {
  // Authentication & session state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('danang_social_token'));
  const [loadingUser, setLoadingUser] = useState(true);

  // App navigation state
  const [view, setView] = useState<'dashboard' | 'admin' | 'sheets' | 'detail' | 'stats'>('dashboard');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // Core domain datasets
  const [subjects, setSubjects] = useState<any[]>([]);
  const [centers, setCenters] = useState<SocialCenter[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Filters state
  const [search, setSearch] = useState('');
  const [filterCenter, setFilterCenter] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterHometown, setFilterHometown] = useState('');

  // Form modals state
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<BeggingSubject | null>(null);

  // Login inputs state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showRegister, setShowRegister] = useState(false);

  // Registration inputs state
  const [regUsername, setRegUsername] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCenterName, setRegCenterName] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  // Auto-verify auth token on mount
  useEffect(() => {
    async function verifyUser() {
      if (!token) {
        setLoadingUser(false);
        return;
      }

      try {
        const res = await fetch(getApiUrl('/api/auth/me'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          // Token stale or user deleted
          handleLogout();
        }
      } catch (err) {
        console.error('Error verifying auth token:', err);
      } finally {
        setLoadingUser(false);
      }
    }

    verifyUser();
  }, [token]);

  // Load Centers List
  const loadCenters = async () => {
    try {
      const res = await fetch(getApiUrl('/api/centers'));
      if (res.ok) {
        const data = await res.json();
        setCenters(data);
      }
    } catch (err) {
      console.error('Error loading centers:', err);
    }
  };

  useEffect(() => {
    loadCenters();
  }, []);

  // Fetch subjects with active filters
  const loadSubjects = async () => {
    if (!user) return;
    setLoadingSubjects(true);
    try {
      // Build query string params
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterCenter && filterCenter !== 'all') params.append('center', filterCenter);
      if (filterStatus && filterStatus !== 'all') params.append('status', filterStatus);
      if (filterHometown) params.append('hometown', filterHometown);

      const res = await fetch(getApiUrl(`/api/subjects?${params.toString()}`), {
        headers: {
          'Authorization': `Bearer ${user.id}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      }
    } catch (err) {
      console.error('Error fetching subjects:', err);
    } finally {
      setLoadingSubjects(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadSubjects();
    }
  }, [user, search, filterCenter, filterStatus, filterHometown]);

  // Sort subjects based on status (ACTIVE first) and last entry date (newest first)
  const sortedSubjects = [...subjects].sort((a, b) => {
    const aActive = a.currentStatus === 'ACTIVE' ? 1 : 0;
    const bActive = b.currentStatus === 'ACTIVE' ? 1 : 0;
    
    if (aActive !== bActive) {
      return bActive - aActive; // ACTIVE (1) comes before others/RETURNED (0)
    }
    
    // Sort by lastEntryDate descending (newest first)
    const dateA = a.lastEntryDate || '';
    const dateB = b.lastEntryDate || '';
    
    if (dateA && dateB) {
      return dateB.localeCompare(dateA);
    }
    if (dateA) return -1;
    if (dateB) return 1;
    return 0;
  });

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginUsername || !loginPassword) {
      setLoginError('Vui lòng điền đầy đủ tên đăng nhập và mật khẩu');
      return;
    }

    try {
      const res = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Đăng nhập không thành công');
      }

      localStorage.setItem('danang_social_token', data.token);
      setToken(data.token);
      setUser(data.user);
      // Clean form inputs
      setLoginUsername('');
      setLoginPassword('');
    } catch (err) {
      setLoginError((err as Error).message);
    }
  };

  // Handle Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (!regUsername || !regFullName || !regPassword || !regCenterName) {
      setRegError('Vui lòng nhập đầy đủ các trường thông tin bắt buộc (*)');
      return;
    }

    try {
      const res = await fetch(getApiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername,
          fullName: regFullName,
          email: regEmail,
          password: regPassword,
          centerName: regCenterName
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Đăng ký tài khoản lỗi');
      }

      setRegSuccess(data.message);
      // Clear registration inputs
      setRegUsername('');
      setRegFullName('');
      setRegEmail('');
      setRegPassword('');
      setRegCenterName('');
      // Delay back to login
      setTimeout(() => {
        setShowRegister(false);
        setRegSuccess('');
      }, 5000);
    } catch (err) {
      setRegError((err as Error).message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('danang_social_token');
    setToken(null);
    setUser(null);
    setView('dashboard');
    setSelectedSubjectId(null);
  };

  const handleSubjectSave = () => {
    setShowForm(false);
    setEditingSubject(null);
    loadSubjects();
    if (selectedSubjectId) {
      // Refresh details page if currently viewing details
      setSelectedSubjectId(null);
      setTimeout(() => setSelectedSubjectId(selectedSubjectId), 10);
    }
  };

  if (loadingUser) {
    return (
      <div id="app-loading-screen" className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-700" />
        <span className="text-sm font-semibold text-slate-600 font-sans">Sở Y tế Đà Nẵng - Đang đồng bộ hệ thống...</span>
      </div>
    );
  }

  // Render Auth UI if not logged in
  if (!user) {
    return (
      <div id="auth-container" className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4 px-4">
          {/* Logo aesthetics */}
          <div className="mx-auto h-16 w-16 flex items-center justify-center drop-shadow-md">
            <img src="https://soyte.danang.gov.vn/o/portal-home-multi-theme-syt/images/icons/DNG_icon.png" alt="Logo Đà Nẵng" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">UBND THÀNH PHỐ ĐÀ NẴNG</p>
            <h1 className="text-xl font-bold text-blue-900 uppercase mt-1">Sở Y tế TP. Đà Nẵng</h1>
            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase mt-1">
              Hệ thống Quản lý Đối tượng Lang thang Xin ăn
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-slate-200 space-y-6">
            
            {/* Toggle tabs */}
            <div className="flex border-b border-slate-100 pb-3 justify-center gap-6">
              <button
                type="button"
                id="btn-tab-login"
                onClick={() => { setShowRegister(false); setLoginError(''); }}
                className={`pb-2 font-bold text-sm transition-all min-h-[44px] px-3 ${!showRegister ? 'border-b-2 border-blue-700 text-blue-700' : 'text-slate-400 hover:text-slate-650'}`}
              >
                Cán bộ đăng nhập
              </button>
              <button
                type="button"
                id="btn-tab-register"
                onClick={() => { setShowRegister(true); setRegError(''); }}
                className={`pb-2 font-bold text-sm transition-all min-h-[44px] px-3 ${showRegister ? 'border-b-2 border-blue-700 text-blue-700' : 'text-slate-400 hover:text-slate-650'}`}
              >
                Đăng ký tài khoản
              </button>
            </div>

            {/* A. Login Form */}
            {!showRegister ? (
              <form onSubmit={handleLogin} className="space-y-4">
                {loginError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Tên đăng nhập / Số hiệu
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: staff_httx"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Mật khẩu truy cập
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[44px]"
                  />
                </div>

                <button
                  type="submit"
                  id="btn-submit-login"
                  className="w-full flex justify-center items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-xs tracking-wider uppercase transition-colors cursor-pointer min-h-[44px] mt-6 shadow-lg shadow-blue-100"
                >
                  <LogIn className="w-4 h-4" />
                  Xác nhận đăng nhập
                </button>
              </form>
            ) : (
              /* B. Registration Form */
              <form onSubmit={handleRegister} className="space-y-4">
                {regError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                    {regError}
                  </div>
                )}

                {regSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg leading-relaxed">
                    {regSuccess}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Họ và Tên cán bộ *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Trần Thị A"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Tên đăng nhập mong muốn *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Không dấu, ví dụ: canbo_a"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-mono focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Địa chỉ Email công vụ (nếu có)
                  </label>
                  <input
                    type="email"
                    placeholder="a.httx@danang.gov.vn"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Thiết lập mật khẩu *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Trung tâm công tác / Đơn vị quản lý *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Trung tâm Bảo trợ Xã hội Đà Nẵng, hoặc Đơn vị của bạn"
                    value={regCenterName}
                    onChange={(e) => setRegCenterName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  />
                </div>

                <button
                  type="submit"
                  id="btn-submit-register"
                  className="w-full flex justify-center items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-xs tracking-wider uppercase transition-colors cursor-pointer min-h-[44px] mt-6 shadow-lg shadow-blue-100"
                >
                  <UserPlus className="w-4 h-4" />
                  Yêu cầu cấp tài khoản
                </button>
              </form>
            )}

          </div>
        </div>
      </div>
    );
  }

  // Auth is successful. Render App Shell
  const isAdmin = user.role === 'ADMIN';

  return (
    <div id="app-shell" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* 1. Header Banner */}
      <header className="bg-white border-b border-slate-200 text-slate-900 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Danang Brand Header */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shrink-0">
                <img src="https://soyte.danang.gov.vn/o/portal-home-multi-theme-syt/images/icons/DNG_icon.png" alt="Logo Đà Nẵng" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="text-xs sm:text-sm font-bold text-blue-900 uppercase leading-tight sm:leading-none">Sở Y tế TP. Đà Nẵng</h1>
                <p className="hidden sm:block text-[10px] text-slate-500 font-medium tracking-wider uppercase mt-1">Hệ thống Quản lý Đối tượng Lang thang</p>
                <p className="block sm:hidden text-[9px] text-slate-500 font-medium tracking-wide uppercase mt-0.5">QL Đối Tượng</p>
              </div>
            </div>

            {/* Profile Menu Actions */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-semibold text-slate-800 leading-none">{user.fullName}</p>
                  <p className="text-[10px] text-green-600 font-medium mt-1">
                    {user.role === 'ADMIN' ? 'Cán bộ - Sở Y tế' : `Nhân viên - ${user.centerName}`}
                  </p>
                </div>
                <div className="w-9 h-9 bg-slate-200 rounded-full border-2 border-white shadow-sm flex items-center justify-center font-bold text-slate-500">
                  {user.fullName.substring(0, 2).toUpperCase()}
                </div>
              </div>

              <div className="border-l border-slate-200 pl-4">
                <button
                  type="button"
                  id="btn-action-logout"
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-blue-700 hover:bg-slate-150 rounded-xl transition-colors min-h-[44px]"
                  title="Đăng xuất khỏi hệ thống"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Primary Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 sticky top-20 z-35 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-12 gap-8 overflow-x-auto scrollbar-none">
            <button
              type="button"
              id="btn-nav-dashboard"
              onClick={() => { setView('dashboard'); setSelectedSubjectId(null); }}
              className={`flex items-center gap-1.5 px-3 border-b-2 font-semibold text-xs uppercase tracking-wide transition-colors min-h-[44px] shrink-0 ${
                view === 'dashboard' || view === 'detail'
                  ? 'border-blue-700 text-blue-700 font-bold' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Hồ sơ đối tượng</span>
            </button>

            <button
              type="button"
              id="btn-nav-stats"
              onClick={() => { setView('stats'); setSelectedSubjectId(null); }}
              className={`flex items-center gap-1.5 px-3 border-b-2 font-semibold text-xs uppercase tracking-wide transition-colors min-h-[44px] shrink-0 ${
                view === 'stats'
                  ? 'border-blue-700 text-blue-700 font-bold' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Thống Kê & Báo Cáo</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                id="btn-nav-sheets"
                onClick={() => setView('sheets')}
                className={`flex items-center gap-1.5 px-3 border-b-2 font-semibold text-xs uppercase tracking-wide transition-colors min-h-[44px] shrink-0 ${
                  view === 'sheets'
                    ? 'border-blue-700 text-blue-700 font-bold' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Google Sheets Sync</span>
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                id="btn-nav-admin"
                onClick={() => setView('admin')}
                className={`flex items-center gap-1.5 px-3 border-b-2 font-semibold text-xs uppercase tracking-wide transition-colors min-h-[44px] shrink-0 ${
                  view === 'admin'
                    ? 'border-blue-700 text-blue-700 font-bold' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
              >
                <Shield className="w-4 h-4" />
                <span>Phê duyệt nhân sự ({subjects.length ? subjects.length : ''})</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* 3. Main Workspace */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* A. VIEW: PROFILE DETAILS */}
        {view === 'detail' && selectedSubjectId && (
          <SubjectDetail
            user={user}
            subjectId={selectedSubjectId}
            onClose={() => { setView('dashboard'); setSelectedSubjectId(null); }}
            onRefresh={loadSubjects}
            onEditSubject={(subjectToEdit) => {
              setEditingSubject(subjectToEdit);
              setShowForm(true);
            }}
          />
        )}

        {/* B. VIEW: GOOGLE SHEETS PORTAL */}
        {view === 'sheets' && isAdmin && (
          <SheetsSync user={user} />
        )}

        {/* C. VIEW: ADMIN CONTROLS */}
        {view === 'admin' && isAdmin && (
          <AdminPortal currentUser={user} centers={centers} />
        )}

        {/* E. VIEW: STATISTICS & REPORTS */}
        {view === 'stats' && (
          <StatsDashboard
            user={user}
            centers={centers}
          />
        )}

        {/* D. VIEW: MAIN DASHBOARD & PROFILE DIRECTORY */}
        {view === 'dashboard' && !selectedSubjectId && (
          <div className="space-y-6">
            
            {/* Search & Filter bar layout */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
              
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-blue-900 uppercase leading-none">
                    Cơ Sở Dữ Liệu Đối Tượng Lang Thang Đà Nẵng
                  </h2>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">
                    {user.role === 'ADMIN' ? 'Theo dõi toàn bộ các đơn vị trên địa bàn' : `Quản lý đối tượng thuộc ${user.centerName}`}
                  </p>
                </div>

                {/* Primary Add Button (Only allowed if center staff or Admin) */}
                <button
                  type="button"
                  id="btn-register-new-subject"
                  onClick={() => { setEditingSubject(null); setShowForm(true); }}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-lg shadow-blue-100 transition-colors cursor-pointer min-h-[44px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Đăng ký đối tượng mới</span>
                </button>
              </div>

              {/* Filters list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Live Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    placeholder="Tìm tên, CCCD, quê quán..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  />
                </div>

                {/* 2. Hometown search */}
                <div>
                  <input
                    type="text"
                    placeholder="Nhập tỉnh quê quán..."
                    value={filterHometown}
                    onChange={(e) => setFilterHometown(e.target.value)}
                    className="w-full bg-slate-100 border-none rounded-full text-sm px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  />
                </div>

                {/* 3. Stay status */}
                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-white border-slate-200 border rounded-lg text-xs px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  >
                    <option value="all">Tất cả trạng thái lưu trú</option>
                    <option value="ACTIVE">Đang ở trung tâm (Lưu trú)</option>
                    <option value="RETURNED">Đã bàn giao/về địa phương</option>
                  </select>
                </div>

                {/* 4. Center filter (locked for staff, open for Admin) */}
                <div>
                  <select
                    value={filterCenter}
                    disabled={!isAdmin}
                    onChange={(e) => setFilterCenter(e.target.value)}
                    className="w-full bg-white border-slate-200 border rounded-lg text-xs px-3 py-2 outline-none disabled:bg-slate-50 disabled:text-slate-500 focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  >
                    {isAdmin ? (
                      <>
                        <option value="all">Tất cả trung tâm</option>
                        {centers.filter(c => c.id !== 'all' && c.id !== 'syt').map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </>
                    ) : (
                      <option value={user.centerId}>{user.centerName}</option>
                    )}
                  </select>
                </div>
              </div>

            </div>

            {/* Subject Directory Output */}
            {loadingSubjects ? (
              <div className="p-12 flex justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-700" />
              </div>
            ) : subjects.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-500">
                  Không tìm thấy hồ sơ đối tượng lang thang xin ăn nào khớp với điều kiện tìm kiếm.
                </p>
                <p className="text-xs text-slate-400">
                  Kiểm tra lại từ khóa hoặc tiến hành thêm hồ sơ mới cho trung tâm của bạn.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedSubjects.map((sub: any) => {
                  const hasPerm = isAdmin || sub.centerId === user.centerId;
                  const isCurrentActive = sub.currentStatus === 'ACTIVE';

                  return (
                    <div 
                      key={sub.id} 
                      className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:scale-[1.02] transform transition-all flex flex-col justify-between overflow-hidden group"
                    >
                      <div className="p-4 sm:p-5 space-y-4">
                        <div className="flex items-start gap-4">
                          {/* Subject portrait / avatar placeholder */}
                          <div className="w-10 h-10 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {sub.image ? (
                              <img referrerPolicy="no-referrer" src={sub.image} alt={sub.fullName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-slate-300 flex items-center justify-center text-slate-500">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path></svg>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Entry Count Highlights - VERY UNIQUE aesthetic */}
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                                Mã: {sub.id}
                              </span>
                              
                              <div className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <span>Vào trung tâm:</span>
                                <strong className="text-blue-900 font-extrabold">{sub.entriesCount} lần</strong>
                              </div>
                            </div>

                            <h3 className="font-sans font-bold text-sm text-blue-900 uppercase truncate mt-0.5 group-hover:text-blue-700 transition-colors">
                              {sub.fullName}
                            </h3>

                            <span className="block text-xs text-slate-500 mt-0.5 font-medium">
                              Ngày sinh: {sub.dob ? formatDate(sub.dob) : 'N/A'} ({sub.dob ? new Date().getFullYear() - new Date(sub.dob).getFullYear() : 'N/A'} tuổi) • Giới tính: {sub.gender || 'Nam'}
                            </span>
                          </div>
                        </div>

                        {/* Middle details block */}
                        <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">Quê quán: <strong className="text-slate-700">{sub.hometown}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">Cơ sở: <strong className="text-slate-700">{sub.centerName}</strong></span>
                          </div>
                          
                          {sub.lastEntryDate && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>Đợt gần nhất: <strong className="text-slate-700">{formatDate(sub.lastEntryDate)}</strong></span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom action panel */}
                      <div className="bg-slate-50/50 px-4 sm:px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        {/* Status Badge */}
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          isCurrentActive 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isCurrentActive ? 'Đang lưu trú' : 'Đã ra về'}
                        </span>

                        {/* View button */}
                        <button
                          type="button"
                          id={`btn-view-details-${sub.id}`}
                          onClick={() => { setSelectedSubjectId(sub.id); setView('detail'); }}
                          className="px-3 py-1.5 hover:bg-white hover:shadow-sm hover:border hover:border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 transition-all text-xs font-semibold flex items-center gap-1 min-h-[44px]"
                        >
                          Xem chi tiết & lịch sử →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </main>

      {/* 4. Form Drawer / Modal Modal */}
      {showForm && (
        <SubjectForm
          user={user}
          subject={editingSubject}
          centers={centers}
          onClose={() => { setShowForm(false); setEditingSubject(null); }}
          onSave={handleSubjectSave}
        />
      )}

      {/* 5. Footer */}
      <footer className="bg-blue-900 py-6 px-6 text-blue-200 mt-12 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row gap-4 text-center md:text-left">
            <span>Hỗ trợ kỹ thuật: 0236 3822 000</span>
            <span>Email: syt@danang.gov.vn</span>
          </div>
          <div className="text-center md:text-right space-y-1">
            <p className="font-semibold text-white">© 2026 Sở Y tế thành phố Đà Nẵng.</p>
            <span className="opacity-60 text-[10px] block">Phiên bản 2.4.1 (Google Apps Script Engine)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

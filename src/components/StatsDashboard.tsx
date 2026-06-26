import React, { useState, useEffect, useMemo } from 'react';
import { BeggingSubject, SocialCenter, User } from '../types';
import { BarChart3, Calendar, CheckCircle, Clock, AlertTriangle, Users, HelpCircle, RefreshCw, Layers, Search, Eye } from 'lucide-react';

interface StatsDashboardProps {
  user: User;
  centers: SocialCenter[];
}

type ReportType = 'MONTH' | 'QUARTER' | 'YEAR' | 'CUSTOM';

export default function StatsDashboard({ user, centers }: StatsDashboardProps) {
  const [subjects, setSubjects] = useState<BeggingSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [reportType, setReportType] = useState<ReportType>('YEAR');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [selectedQuarter, setSelectedQuarter] = useState<number>(Math.ceil((new Date().getMonth() + 1) / 3)); // 1-4
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all, ACTIVE, RETURNED
  const [filterEntries, setFilterEntries] = useState<string>('all'); // all, 1, 2plus, 5plus
  const [filterCenter, setFilterCenter] = useState<string>('all');
  
  // Custom date range state
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const isAdmin = user.role === 'ADMIN';

  // Load unfiltered subjects on mount for accurate metrics and charts
  const loadAllSubjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/subjects', {
        headers: {
          'Authorization': `Bearer ${user.id}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu báo cáo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllSubjects();
  }, [user]);

  // Dynamic filter lists for years
  const yearsList = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    subjects.forEach(s => {
      s.history.forEach(h => {
        if (h.entryDate) {
          const y = new Date(h.entryDate).getFullYear();
          if (!isNaN(y)) years.add(y);
        }
      });
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [subjects]);

  // Main filter computation
  const filteredData = useMemo(() => {
    return subjects.filter(sub => {
      // 1. Center filter (restricted to user's center if STAFF)
      if (!isAdmin && sub.centerId !== user.centerId) return false;
      if (isAdmin && filterCenter !== 'all' && sub.centerId !== filterCenter) return false;

      // 2. Frequency of entry filter
      const entryCount = sub.history.length;
      if (filterEntries === '1' && entryCount !== 1) return false;
      if (filterEntries === '2plus' && entryCount < 2) return false;
      if (filterEntries === '5plus' && entryCount < 5) return false;

      // 3. Time filter (based on entry logs matching criteria)
      const hasMatchingLog = sub.history.some(log => {
        if (!log.entryDate) return false;
        
        // Custom Range Filter
        if (reportType === 'CUSTOM') {
          if (customStartDate && log.entryDate < customStartDate) return false;
          if (customEndDate && log.entryDate > customEndDate) return false;
        } else {
          const entryDateObj = new Date(log.entryDate);
          const y = entryDateObj.getFullYear();
          const m = entryDateObj.getMonth() + 1; // 1-12

          // Year check
          if (y !== selectedYear) return false;

          // Type check
          if (reportType === 'MONTH' && m !== selectedMonth) return false;
          if (reportType === 'QUARTER') {
            const q = Math.ceil(m / 3);
            if (q !== selectedQuarter) return false;
          }
        }

        // Status check inside the matching timeframe log
        if (filterStatus !== 'all' && log.status !== filterStatus) return false;

        return true;
      });

      return hasMatchingLog;
    });
  }, [subjects, selectedYear, reportType, selectedMonth, selectedQuarter, filterStatus, filterEntries, filterCenter, isAdmin, user.centerId, customStartDate, customEndDate]);

  // Compute breakdown metrics
  const stats = useMemo(() => {
    const total = filteredData.length;
    let active = 0;
    let returned = 0;
    let recidivists = 0;
    let maleCount = 0;
    let femaleCount = 0;
    let otherGenderCount = 0;

    filteredData.forEach(sub => {
      // Find current active status (the latest log)
      const latestLog = sub.history[sub.history.length - 1];
      if (latestLog && latestLog.status === 'ACTIVE') {
        active++;
      } else {
        returned++;
      }

      if (sub.history.length >= 2) {
        recidivists++;
      }

      const g = sub.gender || 'Nam';
      if (g === 'Nam') maleCount++;
      else if (g === 'Nữ') femaleCount++;
      else otherGenderCount++;
    });

    const recidivismRate = total > 0 ? Math.round((recidivists / total) * 100) : 0;

    return { total, active, returned, recidivists, recidivismRate, maleCount, femaleCount, otherGenderCount };
  }, [filteredData]);

  // Compute entries over months for chart
  const monthlyChartData = useMemo(() => {
    const counts = Array(12).fill(0);
    subjects.forEach(sub => {
      if (!isAdmin && sub.centerId !== user.centerId) return;
      if (isAdmin && filterCenter !== 'all' && sub.centerId !== filterCenter) return;

      sub.history.forEach(log => {
        if (!log.entryDate) return;
        const d = new Date(log.entryDate);
        if (d.getFullYear() === selectedYear) {
          counts[d.getMonth()]++;
        }
      });
    });
    return counts;
  }, [subjects, selectedYear, filterCenter, isAdmin, user.centerId]);

  // Handle bar hovering for beautiful tooltips
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="p-12 flex flex-col justify-center items-center h-96 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-700" />
        <span className="text-sm font-semibold text-slate-500 font-sans">Đang truy vấn dữ liệu báo cáo thời gian thực...</span>
      </div>
    );
  }

  const maxChartValue = Math.max(...monthlyChartData, 1);

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* Page Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold flex items-center gap-2 tracking-tight">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Báo Cáo & Thống Kê Tổng Hợp
          </h2>
          <p className="text-xs text-slate-400">
            Hệ thống phân tích động theo mốc thời gian, tình trạng lưu trú và tần suất tái nhập trung tâm bảo trợ Đà Nẵng.
          </p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-center text-xs">
          <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">Đơn vị theo dõi</span>
          <span className="font-mono font-bold text-blue-300">{isAdmin ? 'TOÀN ĐỊA BÀN ĐÀ NẴNG' : user.centerName}</span>
        </div>
      </div>

      {/* Report Customizer Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h3 className="font-semibold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-700" />
            Thiết lập tiêu chí lọc báo cáo
          </h3>
          <button 
            onClick={loadAllSubjects}
            className="p-1 text-slate-400 hover:text-blue-700 transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          
          {/* 1. Báo cáo theo */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Mốc thời gian báo cáo
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            >
              <option value="YEAR">Cả năm học/định kỳ</option>
              <option value="QUARTER">Theo từng Quý trong năm</option>
              <option value="MONTH">Theo từng Tháng trong năm</option>
              <option value="CUSTOM">Thời gian tùy chỉnh (Từ ngày - Đến ngày)</option>
            </select>
          </div>

          {/* 2. Chọn năm báo cáo (chỉ hiển thị nếu không phải CUSTOM) */}
          {reportType !== 'CUSTOM' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Chọn năm
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                >
                  {yearsList.map(y => (
                    <option key={y} value={y}>Năm {y}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <>
              {/* Custom start date */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Từ ngày tiếp nhận
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-250 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                />
              </div>

              {/* Custom end date */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Đến ngày tiếp nhận
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-250 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                />
              </div>
            </>
          )}

          {/* 3. Phân khúc cụ thể (Tháng/Quý) */}
          {reportType !== 'YEAR' && reportType !== 'CUSTOM' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                {reportType === 'MONTH' ? 'Chọn tháng cụ thể' : 'Chọn quý cụ thể'}
              </label>
              {reportType === 'MONTH' ? (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-xs font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-xs font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                >
                  <option value={1}>Quý I (Tháng 1-3)</option>
                  <option value={2}>Quý II (Tháng 4-6)</option>
                  <option value={3}>Quý III (Tháng 7-9)</option>
                  <option value={4}>Quý IV (Tháng 10-12)</option>
                </select>
              )}
            </div>
          )}

          {/* 4. Chọn trạng thái lưu trú */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Tình trạng lưu trú
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang ở Trung tâm (Lưu trú)</option>
              <option value="RETURNED">Đã bàn giao/về địa phương</option>
            </select>
          </div>

          {/* 5. Chọn số lần ra vào trung tâm */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Tần suất vào trung tâm
            </label>
            <select
              value={filterEntries}
              onChange={(e) => setFilterEntries(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            >
              <option value="all">Tất cả tần suất</option>
              <option value="1">Chỉ đợt đầu (vào 1 lần duy nhất)</option>
              <option value="2plus">Đã tái nhập (vào từ 2 lần trở lên)</option>
              <option value="5plus">Nhiều lần đặc biệt (vào từ 5 lần trở lên)</option>
            </select>
          </div>

          {/* 6. Chọn trung tâm (Chỉ hiển thị cho Lãnh đạo sở ADMIN) */}
          {isAdmin && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Cơ sở quản lý hành chính
              </label>
              <select
                value={filterCenter}
                onChange={(e) => setFilterCenter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              >
                <option value="all">Tất cả các cơ sở</option>
                {centers.filter(c => c.id !== 'all' && c.id !== 'syt').map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

        </div>
      </div>

      {/* KPI Stats Cards Block */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-700">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide">Tổng số đối tượng</span>
            <strong className="text-2xl font-bold text-slate-900 leading-none">{stats.total} người</strong>
            <span className="block text-[10px] text-slate-500 mt-1">khớp điều kiện lọc</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide">Đang ở Trung tâm</span>
            <strong className="text-2xl font-bold text-emerald-700 leading-none">{stats.active} người</strong>
            <span className="block text-[10px] text-slate-500 mt-1">hiện có mặt tại chỗ</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-orange-50 text-orange-700">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide">Đã về địa phương</span>
            <strong className="text-2xl font-bold text-orange-700 leading-none">{stats.returned} người</strong>
            <span className="block text-[10px] text-slate-500 mt-1">đã bàn giao/về gia đình</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-700">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide">Tỷ lệ tái lang thang</span>
            <strong className="text-2xl font-bold text-amber-700 leading-none">{stats.recidivismRate}%</strong>
            <span className="block text-[10px] text-slate-500 mt-1">{stats.recidivists} người tái nhập &gt;= 2 lần</span>
          </div>
        </div>

      </div>

      {/* Visual Charts layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SVG Monthly Trend Chart (Takes 2/3 cols) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Biểu đồ tiếp nhận theo tháng trong năm {selectedYear}
            </h4>
            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono font-semibold text-slate-500">
              Tổng số lượt: {monthlyChartData.reduce((a, b) => a + b, 0)} lượt
            </span>
          </div>

          {/* SVG-based Professional Chart */}
          <div className="pt-4 flex flex-col justify-between h-64">
            <div className="relative flex-1 w-full h-full bg-slate-50/50 rounded-xl p-4 border border-slate-100">
              <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
                {/* Horizontal Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const yVal = 170 - ratio * 140;
                  const valueLabel = Math.round(maxChartValue * ratio);
                  return (
                    <g key={idx}>
                      <line 
                        x1="40" 
                        y1={yVal} 
                        x2="580" 
                        y2={yVal} 
                        stroke="#e2e8f0" 
                        strokeDasharray="4 4" 
                        strokeWidth="1" 
                      />
                      <text 
                        x="10" 
                        y={yVal + 4} 
                        className="text-[9px] font-bold fill-slate-400 font-mono"
                      >
                        {valueLabel}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical Bars */}
                {monthlyChartData.map((count, i) => {
                  const barWidth = 24;
                  const spacing = (540 - 12 * barWidth) / 11;
                  const xPos = 45 + i * (barWidth + spacing);
                  const barHeight = (count / maxChartValue) * 140;
                  const yPos = 170 - barHeight;

                  return (
                    <g 
                      key={i} 
                      className="cursor-pointer group"
                      onMouseEnter={() => setHoveredBarIndex(i)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                    >
                      {/* Bar Rectangle */}
                      <rect
                        x={xPos}
                        y={yPos}
                        width={barWidth}
                        height={Math.max(barHeight, 2)}
                        rx="4"
                        fill={hoveredBarIndex === i ? '#1d4ed8' : '#2563eb'}
                        className="transition-all duration-300"
                      />
                      {/* X-axis label */}
                      <text
                        x={xPos + barWidth / 2}
                        y="188"
                        textAnchor="middle"
                        className="text-[9px] font-bold fill-slate-500 font-mono"
                      >
                        T{i + 1}
                      </text>
                      {/* Bar Value Tooltip overlay */}
                      {count > 0 && hoveredBarIndex === i && (
                        <g>
                          <rect
                            x={xPos - 20}
                            y={yPos - 22}
                            width="64"
                            height="18"
                            rx="4"
                            fill="#0f172a"
                          />
                          <text
                            x={xPos + barWidth / 2}
                            y={yPos - 10}
                            textAnchor="middle"
                            fill="#ffffff"
                            className="text-[9px] font-bold"
                          >
                            {count} lượt
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* X-axis Baseline */}
                <line x1="40" y1="170" x2="580" y2="170" stroke="#cbd5e1" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 font-medium mt-2">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-blue-600 rounded" />
                Lượt tiếp nhận mới/tái nhập
              </span>
              <span className="text-slate-400 italic">Di chuột vào cột để xem số lượng chi tiết</span>
            </div>
          </div>
        </div>

        {/* Distribution break-downs (Takes 1/3 cols) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
            Tỷ lệ phân chia đợt lưu trú
          </h4>

          {/* Metric 1 */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-600">Đang ở trung tâm</span>
              <span className="font-mono font-bold text-slate-800">{stats.active} / {stats.total}</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div 
                style={{ width: `${stats.total > 0 ? (stats.active / stats.total) * 100 : 0}%` }}
                className="bg-emerald-500 h-full rounded-full"
              />
            </div>
          </div>

          {/* Metric 2 */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-600">Đã bàn giao về địa phương</span>
              <span className="font-mono font-bold text-slate-800">{stats.returned} / {stats.total}</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div 
                style={{ width: `${stats.total > 0 ? (stats.returned / stats.total) * 100 : 0}%` }}
                className="bg-orange-500 h-full rounded-full"
              />
            </div>
          </div>

          {/* Frequency break-down */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tần suất lập hồ sơ</h5>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-150 text-center">
                <span className="block text-[10px] font-semibold text-slate-500">Chỉ 1 lần</span>
                <strong className="text-sm font-bold text-slate-800">
                  {filteredData.filter(s => s.history.length === 1).length} người
                </strong>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-150 text-center">
                <span className="block text-[10px] font-semibold text-slate-500">Lần 2 trở lên</span>
                <strong className="text-sm font-bold text-slate-800">
                  {filteredData.filter(s => s.history.length >= 2).length} người
                </strong>
              </div>
            </div>
          </div>

          {/* Gender break-down */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cơ cấu giới tính</h5>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-150 text-center">
                <span className="block text-[10px] font-semibold text-blue-500">Nam</span>
                <strong className="text-sm font-bold text-slate-800">
                  {stats.maleCount} người ({stats.total > 0 ? Math.round((stats.maleCount / stats.total) * 100) : 0}%)
                </strong>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-150 text-center">
                <span className="block text-[10px] font-semibold text-rose-500">Nữ</span>
                <strong className="text-sm font-bold text-slate-800">
                  {stats.femaleCount} người ({stats.total > 0 ? Math.round((stats.femaleCount / stats.total) * 100) : 0}%)
                </strong>
              </div>
            </div>
            {stats.otherGenderCount > 0 && (
              <div className="text-[10px] text-slate-400 text-center italic mt-1">
                Giới tính khác: {stats.otherGenderCount} người
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Matching profiles table for report */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Danh sách chi tiết đối tượng khớp báo cáo
          </h4>
          <p className="text-[10px] text-slate-500 font-medium">
            Đang hiển thị {filteredData.length} đối tượng có hồ sơ khớp bộ tiêu chí lọc thời gian.
          </p>
        </div>

        {filteredData.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center italic">
            Không có hồ sơ nào khớp với bộ tiêu chí thời gian đã chọn.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-xs font-bold uppercase bg-slate-50">
                  <th className="px-4 py-3">Họ và Tên</th>
                  <th className="px-4 py-3">Năm sinh</th>
                  <th className="px-4 py-3">Giới tính</th>
                  <th className="px-4 py-3">Mã CCCD</th>
                  <th className="px-4 py-3">Quê quán</th>
                  <th className="px-4 py-3">Trung tâm</th>
                  <th className="px-4 py-3 text-center">Số lần vào</th>
                  <th className="px-4 py-3 text-right">Trạng thái hiện tại</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map(sub => {
                  const isActive = sub.history[sub.history.length - 1]?.status === 'ACTIVE';
                  return (
                    <tr key={sub.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-blue-900">{sub.fullName}</td>
                      <td className="px-4 py-3 font-mono text-xs">{sub.dob ? new Date(sub.dob).getFullYear() : 'N/A'}</td>
                      <td className="px-4 py-3 text-xs font-semibold">{sub.gender || 'Nam'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{sub.cccd || 'Chưa có'}</td>
                      <td className="px-4 py-3 text-xs text-slate-700">{sub.hometown}</td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-600">{sub.centerName}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs bg-slate-100 px-2.5 py-0.5 rounded-full font-bold text-slate-800">
                          {sub.history.length} lần
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isActive 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {isActive ? 'ĐANG LƯU TRÚ' : 'ĐÃ BÀN GIAO'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

import React, { useState } from 'react';
import { BeggingSubject, SubjectEntry, User } from '../types';
import { X, Calendar, MapPin, Users, Building, Plus, Edit2, Trash2, ArrowLeft, CheckCircle2, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { getApiUrl, formatDate } from '../utils/api';

interface SubjectDetailProps {
  user: User;
  subjectId: string;
  onClose: () => void;
  onRefresh: () => void;
  onEditSubject: (subject: BeggingSubject) => void;
}

export default function SubjectDetail({ user, subjectId, onClose, onRefresh, onEditSubject }: SubjectDetailProps) {
  const [subject, setSubject] = useState<BeggingSubject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // History adding form
  const [showAddHistory, setShowAddHistory] = useState(false);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().substring(0, 10));
  const [exitDate, setExitDate] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'RETURNED'>('ACTIVE');
  const [notes, setNotes] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);

  // Editing historical log row
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editEntryDate, setEditEntryDate] = useState('');
  const [editExitDate, setEditExitDate] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'RETURNED'>('ACTIVE');
  const [editReason, setEditReason] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const startEditingHistory = (entry: SubjectEntry) => {
    setEditingHistoryId(entry.id);
    setEditEntryDate(entry.entryDate);
    setEditExitDate(entry.exitDate || '');
    setEditStatus(entry.status);
    setEditReason(entry.reason);
    setEditNotes(entry.notes || '');
  };

  const handleSaveEditHistory = async (historyId: string) => {
    if (!editEntryDate || !editReason) {
      alert('Vui lòng nhập đầy đủ ngày tiếp nhận và lý do');
      return;
    }
    setEditLoading(true);
    try {
      const res = await fetch(getApiUrl(`/api/subjects/${subjectId}/history/${historyId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify({
          entryDate: editEntryDate,
          exitDate: editExitDate || null,
          status: editStatus,
          reason: editReason,
          notes: editNotes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật lịch sử');

      setSubject(data.subject);
      setEditingHistoryId(null);
      onRefresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setEditLoading(false);
    }
  };

  const fetchSubject = async () => {
    try {
      setLoading(true);
      const res = await fetch(getApiUrl(`/api/subjects/${subjectId}`), {
        headers: {
          'Authorization': `Bearer ${user.id}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tải dữ liệu');
      setSubject(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchSubject();
  }, [subjectId]);

  const hasWritePermission = subject ? (user.role === 'ADMIN' || subject.centerId === user.centerId) : false;

  // Add a history record
  const handleAddHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryDate) return;

    setHistoryLoading(true);
    try {
      const res = await fetch(getApiUrl(`/api/subjects/${subjectId}/history`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify({
          entryDate,
          exitDate: exitDate || null,
          reason,
          status,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi thêm lịch sử');

      setSubject(data.subject);
      setShowAddHistory(false);
      // Reset form
      setEntryDate(new Date().toISOString().substring(0, 10));
      setExitDate('');
      setReason('');
      setStatus('ACTIVE');
      setNotes('');
      onRefresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Delete a history record
  const handleDeleteHistory = async (historyId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa dòng lịch sử tiếp nhận này? Thao tác này sẽ cập nhật lại tổng số lần vào trung tâm.')) {
      return;
    }

    try {
      const res = await fetch(getApiUrl(`/api/subjects/${subjectId}/history/${historyId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.id}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi xóa dòng lịch sử');

      setSubject(data.subject);
      onRefresh();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  // Quick check out/release subject
  const handleQuickRelease = async (historyId: string) => {
    const releaseDate = prompt('Nhập ngày bàn giao/cho về địa phương (YYYY-MM-DD):', new Date().toISOString().substring(0, 10));
    if (!releaseDate) return;

    try {
      const res = await fetch(getApiUrl(`/api/subjects/${subjectId}/history/${historyId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify({
          status: 'RETURNED',
          exitDate: releaseDate,
          notes: 'Đã hoàn tất bàn giao về địa phương'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật trạng thái');

      setSubject(data.subject);
      onRefresh();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  // Delete entire subject
  const handleDeleteSubject = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn XÓA HOÀN TOÀN đối tượng ${subject?.fullName} ra khỏi hệ thống? Tất cả lịch sử lưu trú cũng sẽ bị xóa vĩnh viễn.`)) {
      return;
    }

    try {
      const res = await fetch(getApiUrl(`/api/subjects/${subjectId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.id}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi xóa đối tượng');

      alert(data.message);
      onClose();
      onRefresh();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-700" />
      </div>
    );
  }

  if (error || !subject) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg inline-block max-w-md">
          {error || 'Không thể tìm thấy thông tin đối tượng'}
        </div>
        <button 
          id="btn-error-back"
          onClick={onClose}
          className="block mx-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm transition-colors min-h-[44px]"
        >
          Trở lại danh sách
        </button>
      </div>
    );
  }

  // Calculate current status for big badge
  const activeEntry = subject.history[subject.history.length - 1];
  const isCurrentlyInCenter = activeEntry && activeEntry.status === 'ACTIVE';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-8 animate-fade-in">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <button
          id="btn-back-to-list"
          onClick={onClose}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors py-2 text-sm min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách</span>
        </button>

        {/* Action Panel for Authorized Staff */}
        <div className="flex items-center gap-2">
          {hasWritePermission ? (
            <>
              <button
                type="button"
                id="btn-edit-subject"
                onClick={() => onEditSubject(subject)}
                className="flex items-center gap-1.5 px-3.5 py-2 border border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg text-xs font-semibold transition-colors min-h-[44px]"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Chỉnh sửa hồ sơ</span>
              </button>
              <button
                type="button"
                id="btn-delete-subject"
                onClick={handleDeleteSubject}
                className="flex items-center gap-1.5 px-3.5 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors min-h-[44px]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa hồ sơ</span>
              </button>
            </>
          ) : (
            <span className="text-xs text-slate-400 font-medium bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
              Chỉ xem (Thuộc trung tâm khác)
            </span>
          )}
        </div>
      </div>

      {/* 2. Visual Profile Card & Quick Info */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left column: Image & Counter */}
        <div className="w-full md:w-52 flex flex-col items-center space-y-4">
          <div className="w-44 h-44 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shadow-sm flex items-center justify-center">
            {subject.image ? (
              <img referrerPolicy="no-referrer" src={subject.image} alt={subject.fullName} className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-3 text-slate-400 text-xs font-mono select-none">
                CHƯA CÓ HÌNH ẢNH KHÁM SÀNG
              </div>
            )}
          </div>

          {/* Core calculated field display */}
          <div className="w-full bg-slate-50 rounded-lg p-3 border border-slate-200 text-center">
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Số Lần Vào Trung Tâm
            </span>
            <span className="text-3xl font-extrabold text-blue-700">
              {subject.history.length}
            </span>
            <span className="block text-[10px] text-slate-400 mt-1">
              (Tự động tính từ lịch sử)
            </span>
          </div>

          {/* Active Stay Status */}
          <div className={`w-full py-1.5 px-3 rounded-full text-center text-xs font-semibold border flex items-center justify-center gap-1.5 ${
            isCurrentlyInCenter 
              ? 'bg-green-50 border-green-200 text-green-700' 
              : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isCurrentlyInCenter ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
            {isCurrentlyInCenter ? 'ĐANG LƯU TRÚ' : 'ĐÃ VỀ ĐỊA PHƯƠNG'}
          </div>
        </div>

        {/* Right column: Subject Profile Info */}
        <div className="flex-1 space-y-4 w-full font-sans">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-mono">
              HỒ SƠ ĐỐI TƯỢNG #{subject.id}
            </span>
            <h2 className="font-bold text-2xl text-blue-900 uppercase mt-0.5">
              {subject.fullName}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 py-2 border-t border-b border-slate-150">
            <div className="flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block text-xs text-slate-400">Ngày sinh (Tuổi)</span>
                <span className="text-sm font-medium text-slate-800">
                  {formatDate(subject.dob)} ({new Date().getFullYear() - new Date(subject.dob).getFullYear()} tuổi)
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Users className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block text-xs text-slate-400">Giới tính</span>
                <span className="text-sm font-medium text-slate-800 animate-pulse-once">
                  {subject.gender || 'Nam'}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block text-xs text-slate-400">Số CCCD</span>
                <span className="text-sm font-medium font-mono text-slate-800">
                  {subject.cccd || 'Không mang theo giấy tờ'}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block text-xs text-slate-400">Quê quán</span>
                <span className="text-sm font-medium text-slate-800">
                  {subject.hometown}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Building className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block text-xs text-slate-400">Đơn vị quản lý bàn giao</span>
                <span className="text-sm font-medium text-blue-800">
                  {subject.centerName}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block text-xs text-slate-400 font-semibold">Thông tin thân nhân / Gia cảnh gia đình</span>
                <p className="text-sm text-slate-700 whitespace-pre-wrap mt-1 leading-relaxed">
                  {subject.relativesInfo || 'Không xác định được thân nhân'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Detailed History Timeline */}
      <div className="space-y-4 pt-4 border-t border-slate-150">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base text-blue-900 flex items-center gap-1.5 uppercase font-sans">
            Lịch Sử Vào Ra Trung Tâm
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-mono">
              {subject.history.length} đợt tiếp nhận
            </span>
          </h3>

          {/* Button to add historical visit log */}
          {hasWritePermission && (
            <button
              id="btn-show-add-history"
              onClick={() => setShowAddHistory(!showAddHistory)}
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors shadow-sm shadow-blue-100 min-h-[44px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ghi nhận đợt mới</span>
            </button>
          )}
        </div>

        {/* 3a. Inline Add History Form */}
        {showAddHistory && (
          <form onSubmit={handleAddHistory} className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-4 animate-slide-in font-sans">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">Khai báo đợt đưa đối tượng vào trung tâm mới</span>
              <button 
                type="button" 
                id="btn-hide-add-history"
                onClick={() => setShowAddHistory(false)} 
                className="text-slate-400 hover:text-slate-600"
              >
                Hủy
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1 font-medium">Ngày tiếp nhận *</label>
                <input
                  type="date"
                  required
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1 font-medium">Ngày cho về / Bàn giao</label>
                <input
                  type="date"
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1 font-medium">Trạng thái lưu trú *</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'RETURNED')}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white min-h-[44px]"
                >
                  <option value="ACTIVE">Đang lưu trú ở trung tâm</option>
                  <option value="RETURNED">Đã bàn giao về địa phương</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-1 font-medium">Lý do tiếp nhận / Địa điểm phát hiện *</label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Ăn xin tại Cầu Sông Hàn, Sơn Trà..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-1 font-medium">Ghi chú chi tiết đợt tiếp nhận</label>
              <input
                type="text"
                placeholder="Tình trạng sức khỏe, thông báo bàn giao, đại diện đứng ra nhận..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white min-h-[44px]"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                id="btn-cancel-add-history"
                onClick={() => setShowAddHistory(false)}
                className="px-4 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs min-h-[44px]"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                id="btn-submit-add-history"
                disabled={historyLoading}
                className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold min-h-[44px]"
              >
                {historyLoading ? 'Đang lưu...' : 'Lưu đợt này'}
              </button>
            </div>
          </form>
        )}

        {/* 3b. Timeline List */}
        {subject.history.length === 0 ? (
          <div className="p-4 bg-slate-50 rounded-xl text-center text-sm text-slate-500 border border-slate-200">
            Chưa ghi nhận lịch sử vào ra nào.
          </div>
        ) : (
          <div className="relative border-l border-slate-200 pl-4 sm:pl-6 space-y-6 ml-2 py-2">
            {[...subject.history].reverse().map((entry, index) => {
              const isActive = entry.status === 'ACTIVE';
              const isEditingLog = editingHistoryId === entry.id;

              return (
                <div key={entry.id} className="relative">
                  {/* Timeline bullet */}
                  <span className={`absolute -left-[21px] sm:-left-[29px] top-1.5 w-3 h-3 rounded-full border-2 ${
                    isActive 
                      ? 'bg-green-500 border-green-200 ring-4 ring-green-50/70 animate-pulse' 
                      : 'bg-slate-300 border-white'
                  }`} />

                  {isEditingLog ? (
                    <div className="bg-blue-50/70 rounded-xl p-4 border border-blue-200">
                      <div className="text-xs font-bold text-blue-900 uppercase border-b border-blue-100 pb-2 mb-3">
                        Chỉnh sửa đợt #{subject.history.length - index}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Ngày tiếp nhận
                          </label>
                          <input
                            type="date"
                            value={editEntryDate}
                            onChange={(e) => setEditEntryDate(e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs min-h-[36px] bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Ngày bàn giao (Nếu có)
                          </label>
                          <input
                            type="date"
                            value={editExitDate}
                            onChange={(e) => setEditExitDate(e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs min-h-[36px] bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Trạng thái
                          </label>
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as 'ACTIVE' | 'RETURNED')}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs min-h-[36px] bg-white"
                          >
                            <option value="ACTIVE">Đang ở trung tâm (Lưu trú)</option>
                            <option value="RETURNED">Đã bàn giao/về địa phương</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Lý do / Sự việc
                          </label>
                          <input
                            type="text"
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs min-h-[36px] bg-white"
                          />
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Ghi chú đợt lưu trú
                        </label>
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs min-h-[36px] bg-white"
                        />
                      </div>
                      <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-blue-100">
                        <button
                          type="button"
                          onClick={() => setEditingHistoryId(null)}
                          className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded text-xs min-h-[44px]"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          disabled={editLoading}
                          onClick={() => handleSaveEditHistory(entry.id)}
                          className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold min-h-[44px]"
                        >
                          {editLoading ? 'Đang lưu...' : 'Cập nhật'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-200 hover:bg-slate-50/80 transition-colors">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2 font-sans">
                          <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                            ĐỢT #{subject.history.length - index}
                          </span>
                          <span className="text-xs font-mono font-semibold text-slate-600 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {formatDate(entry.entryDate)} {entry.exitDate ? `đến ${formatDate(entry.exitDate)}` : '(Đang lưu trú)'}
                          </span>
                        </div>

                        {/* Timeline action status badge */}
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isActive 
                              ? 'bg-green-100 text-green-800 border border-green-200' 
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {isActive ? 'ĐANG Ở TRUNG TÂM' : 'ĐÃ BÀN GIAO'}
                          </span>

                          {/* Allowed to do quick release and edit of timeline row */}
                          {hasWritePermission && (
                            <div className="flex items-center gap-1">
                              {isActive && (
                                <button
                                  type="button"
                                  id={`btn-quick-release-${entry.id}`}
                                  onClick={() => handleQuickRelease(entry.id)}
                                  className="p-1 hover:bg-blue-100 text-blue-600 rounded"
                                  title="Cho xuất trung tâm / Bàn giao địa phương"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                id={`btn-edit-history-${entry.id}`}
                                onClick={() => startEditingHistory(entry)}
                                className="p-1 hover:bg-blue-100 text-blue-600 rounded"
                                title="Chỉnh sửa dòng lịch sử này"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 space-y-1">
                        <p className="text-sm text-slate-800 font-medium leading-relaxed font-sans">
                          <span className="text-xs text-slate-400 font-normal mr-1.5 block sm:inline-block">Lý do / Sự việc:</span>
                          {entry.reason}
                        </p>
                        {entry.notes && (
                          <p className="text-xs text-slate-500 italic mt-1 bg-white p-2 rounded border border-slate-150 font-sans">
                            <span className="text-slate-400 font-semibold uppercase font-mono tracking-wider text-[9px] mr-1 block">Ghi chú lưu hồ sơ:</span>
                            {entry.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { User, SocialCenter } from '../types';
import { Shield, Check, X, Trash2, Edit2, UserCheck, UserMinus, AlertCircle, Loader2 } from 'lucide-react';

interface AdminPortalProps {
  currentUser: User;
  centers: SocialCenter[];
}

export default function AdminPortal({ currentUser, centers }: AdminPortalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${currentUser.id}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tải danh sách người dùng');
      setUsers(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUser]);

  const handleApprove = async (userId: string, approved: boolean, currentCenterId?: string, currentRole?: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch('/api/users/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({
          userId,
          approved,
          centerId: currentCenterId,
          role: currentRole
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi xử lý tài khoản');

      fetchUsers();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateRoleOrCenter = async (userId: string, updates: { role?: string; centerId?: string }) => {
    setActionLoading(userId);
    try {
      const res = await fetch('/api/users/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({
          userId,
          approved: true, // keeps it approved
          ...updates
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật phân quyền');

      fetchUsers();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN tài khoản của cán bộ "${name}"? Thao tác này không thể khôi phục.`)) {
      return;
    }

    setActionLoading(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentUser.id}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi xóa tài khoản');

      fetchUsers();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-80">
        <Loader2 className="w-8 h-8 animate-spin text-blue-700" />
      </div>
    );
  }

  const pendingUsers = users.filter(u => !u.approved);
  const approvedUsers = users.filter(u => u.approved);

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      {/* Admin Title Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm flex flex-col sm:flex-row items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            Cổng Phê Duyệt & Phân Quyền Hệ Thống
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Lãnh đạo Sở Y tế có thẩm quyền cao nhất trong phê duyệt cán bộ trung tâm, phân bổ đơn vị hoạt động và phân cấp vai trò quản lý.
          </p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-center text-xs">
          <span className="block text-slate-400 font-medium">Vai trò quản lý</span>
          <span className="font-mono font-bold text-blue-300">{currentUser.fullName}</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Pending Approvals Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
        <h3 className="font-semibold text-base text-slate-900 flex items-center gap-1.5 border-b border-slate-250 pb-3 uppercase tracking-wider text-xs">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Tài Khoản Đăng Ký Chờ Phê Duyệt
          <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-mono font-bold ml-2">
            {pendingUsers.length}
          </span>
        </h3>

        {pendingUsers.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center italic">
            Không có yêu cầu đăng ký tài khoản nào đang chờ xử lý.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase bg-slate-50">
                  <th className="px-4 py-3">Họ và Tên Cán Bộ</th>
                  <th className="px-4 py-3">Tên Đăng Nhập / Email</th>
                  <th className="px-4 py-3">Mật Khẩu</th>
                  <th className="px-4 py-3">Đơn Vị Đăng Ký</th>
                  <th className="px-4 py-3 text-right">Phê duyệt / Từ chối</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map(u => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-slate-800">{u.fullName}</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">Yêu cầu lúc: {new Date(u.createdAt).toLocaleDateString('vi-VN')}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-slate-700">{u.username}</span>
                      {u.email && <span className="block text-xs text-slate-400">{u.email}</span>}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                      {(u as any).password || '******'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                        {u.centerName}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-1">
                      <button
                        type="button"
                        id={`btn-approve-user-${u.id}`}
                        disabled={actionLoading === u.id}
                        onClick={() => handleApprove(u.id, true, u.centerId, u.role)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white font-medium rounded-lg text-xs transition-colors min-h-[44px]"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Duyệt</span>
                      </button>
                      <button
                        type="button"
                        id={`btn-reject-user-${u.id}`}
                        disabled={actionLoading === u.id}
                        onClick={() => handleDeleteUser(u.id, u.fullName)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 disabled:bg-slate-200 text-rose-700 font-medium rounded-lg text-xs transition-colors min-h-[44px]"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Từ chối</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. Active Accounts / Role management Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
        <h3 className="font-semibold text-base text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider text-xs">
          Danh Sách Cán Bộ Được Cấp Quyền Hoạt Động
          <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-mono ml-2 font-normal">
            {approvedUsers.length} tài khoản
          </span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase bg-slate-50">
                <th className="px-4 py-3">Họ và Tên</th>
                <th className="px-4 py-3">Tài Khoản</th>
                <th className="px-4 py-3">Mật Khẩu</th>
                <th className="px-4 py-3">Đơn Vị Công Tác</th>
                <th className="px-4 py-3">Quyền Hạn</th>
                <th className="px-4 py-3 text-right">Xóa Cấp Quyền</th>
              </tr>
            </thead>
            <tbody>
              {approvedUsers.map(u => {
                const isSelf = u.id === currentUser.id;
                return (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800">{u.fullName}</span>
                        {isSelf && (
                          <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold font-mono">BẠN</span>
                        )}
                      </div>
                      <span className="block text-xs text-slate-400">{u.email || 'Chưa cung cấp email'}</span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                      {u.username}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                      {(u as any).password || '******'}
                    </td>
                    <td className="px-4 py-3.5">
                      {isSelf || u.role === 'ADMIN' ? (
                        <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                          {u.centerName}
                        </span>
                      ) : (
                        <select
                          value={u.centerId}
                          disabled={actionLoading === u.id}
                          onChange={(e) => handleUpdateRoleOrCenter(u.id, { centerId: e.target.value })}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:border-blue-500 min-h-[44px]"
                        >
                          {centers.filter(c => c.id !== 'all' && c.id !== 'syt').map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {isSelf ? (
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-250 px-2.5 py-1 rounded-lg">
                          {u.role}
                        </span>
                      ) : (
                        <select
                          value={u.role}
                          disabled={actionLoading === u.id}
                          onChange={(e) => handleUpdateRoleOrCenter(u.id, { role: e.target.value as 'ADMIN' | 'STAFF' })}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-blue-700 focus:border-blue-500 min-h-[44px]"
                        >
                          <option value="STAFF">STAFF (Nhân viên)</option>
                          <option value="ADMIN">ADMIN (Lãnh đạo Sở)</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {!isSelf && (
                        <button
                          type="button"
                          id={`btn-delete-active-user-${u.id}`}
                          disabled={actionLoading === u.id}
                          onClick={() => handleDeleteUser(u.id, u.fullName)}
                          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors min-h-[44px]"
                          title="Hủy tài khoản / Khóa truy cập"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

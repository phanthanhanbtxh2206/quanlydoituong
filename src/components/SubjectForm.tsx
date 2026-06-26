import React, { useState, useEffect } from 'react';
import { BeggingSubject, SocialCenter, User } from '../types';
import { X, Save, Camera, HelpCircle, Loader2 } from 'lucide-react';

interface SubjectFormProps {
  user: User;
  subject?: BeggingSubject | null; // If editing
  centers: SocialCenter[];
  onClose: () => void;
  onSave: () => void;
}

export default function SubjectForm({ user, subject, centers, onClose, onSave }: SubjectFormProps) {
  const isEditing = !!subject;
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Nam' | 'Nữ' | 'Khác'>('Nam');
  const [cccd, setCccd] = useState('');
  const [hometown, setHometown] = useState('');
  const [relativesInfo, setRelativesInfo] = useState('');
  const [image, setImage] = useState('');
  const [centerId, setCenterId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Initial entry state (only for new subjects)
  const [entryDate, setEntryDate] = useState(new Date().toISOString().substring(0, 10));
  const [exitDate, setExitDate] = useState('');
  const [reason, setReason] = useState('Phát hiện lang thang xin ăn');
  const [status, setStatus] = useState<'ACTIVE' | 'RETURNED'>('ACTIVE');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (subject) {
      setFullName(subject.fullName);
      setDob(subject.dob);
      setGender(subject.gender || 'Nam');
      setCccd(subject.cccd || '');
      setHometown(subject.hometown);
      setRelativesInfo(subject.relativesInfo);
      setImage(subject.image || '');
      setCenterId(subject.centerId);
    } else {
      setCenterId(user.role === 'ADMIN' ? 'httx' : user.centerId);
    }
  }, [subject, user]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max_size = 120; // 120px max is perfect for profile photo avatar
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.75); // High quality but very small size
            setImage(dataUrl);
          } else {
            setImage(reader.result as string);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const simulateCameraCapture = () => {
    // Generate a beautiful placeholder portrait or capture simulation
    const randomPortraits = [
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&q=80'
    ];
    const randomIndex = Math.floor(Math.random() * randomPortraits.length);
    setImage(randomPortraits[randomIndex]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !dob) {
      setError('Họ tên và Ngày sinh là bắt buộc.');
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      fullName,
      dob,
      gender,
      cccd,
      hometown,
      relativesInfo,
      image,
      centerId: user.role === 'ADMIN' ? centerId : user.centerId,
      initialEntry: isEditing ? undefined : {
        entryDate,
        exitDate: exitDate || null,
        reason,
        status,
        notes
      }
    };

    try {
      const url = isEditing ? `/api/subjects/${subject.id}` : '/api/subjects';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Có lỗi xảy ra khi lưu đối tượng');
      }

      onSave();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="subject-form-backdrop" className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div id="subject-form-container" className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-neutral-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 sticky top-0 bg-white z-10">
          <h3 className="font-sans font-semibold text-lg text-neutral-900">
            {isEditing ? 'Cập Nhật Thông Tin Đối Tượng' : 'Đăng Ký Đối Tượng Mới'}
          </h3>
          <button 
            id="btn-close-form"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* 1. Profile Picture Selection */}
          <div className="flex flex-col sm:flex-row items-center gap-5 pb-4 border-b border-neutral-100">
            <div className="w-24 h-24 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center relative group">
              {image ? (
                <img referrerPolicy="no-referrer" src={image} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-slate-400 text-xs text-center font-mono p-1">CHƯA CÓ ẢNH</span>
              )}
            </div>
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <span className="block text-sm font-medium text-slate-800">Hình ảnh đối tượng</span>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                <label className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1 min-h-[44px]">
                  <span>Chọn từ file</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                <button
                  type="button"
                  id="btn-simulate-camera"
                  onClick={simulateCameraCapture}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-150 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 min-h-[44px]"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Chụp ảnh (Mô phỏng)</span>
                </button>
                {image && (
                  <button
                    type="button"
                    id="btn-remove-image"
                    onClick={() => setImage('')}
                    className="px-3 py-1.5 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-medium transition-colors min-h-[44px]"
                  >
                    Xóa ảnh
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2. Core Demographics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Họ và Tên <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Nguyễn Văn A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Ngày Tháng Năm Sinh <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Giới Tính <span className="text-rose-500">*</span>
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'Nam' | 'Nữ' | 'Khác')}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[44px] bg-white"
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Số Căn Cước Công Dân (CCCD)
              </label>
              <input
                type="text"
                maxLength={12}
                placeholder="12 chữ số (nếu có)"
                value={cccd}
                onChange={(e) => setCccd(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Quê Quán
              </label>
              <input
                type="text"
                placeholder="Quận/Huyện, Tỉnh/Thành phố"
                value={hometown}
                onChange={(e) => setHometown(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Thông Tin Thân Nhân / Gia Cảnh
            </label>
            <textarea
              rows={2}
              placeholder="Vợ, chồng, con cái, số điện thoại liên hệ của người thân (nếu có)"
              value={relativesInfo}
              onChange={(e) => setRelativesInfo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[44px]"
            />
          </div>

          {/* Admin center selection overrides */}
          {user.role === 'ADMIN' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Trung Tâm Quản Lý Chỉ Định
              </label>
              <select
                value={centerId}
                onChange={(e) => setCenterId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[44px] bg-white"
              >
                {centers.filter(c => c.id !== 'all' && c.id !== 'syt').map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* 3. New Entry History Section (ONLY when creating) */}
          {!isEditing && (
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-4">
              <h4 className="font-sans font-semibold text-sm text-blue-850 flex items-center gap-1.5">
                Thông Tin Tiếp Nhận Ban Đầu
                <HelpCircle className="w-4 h-4 text-blue-600 cursor-help" title="Lịch sử ghi nhận đầu tiên khi đưa đối tượng vào trung tâm. Hệ thống sẽ tự động bắt đầu đếm số lần vào từ đây." />
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Ngày Tiếp Nhận Vào Trung Tâm <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[44px] bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Ngày Bàn Giao / Ngày Về
                  </label>
                  <input
                    type="date"
                    value={exitDate}
                    onChange={(e) => setExitDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[44px] bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Trạng Thái Tiếp Nhận
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'RETURNED')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[44px] bg-white"
                  >
                    <option value="ACTIVE">Đang ở Trung tâm (Lưu trú)</option>
                    <option value="RETURNED">Đã bàn giao/về địa phương ngay</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Lý Do / Địa Điểm Phát Hiện
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Phát hiện bán vé số kết hợp xin ăn ở khu vực Ngũ Hành Sơn"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[44px] bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Ghi Chú Đợt Tiếp Nhận
                </label>
                <input
                  type="text"
                  placeholder="Kiểm tra y tế ban đầu, tình trạng tâm thần..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[44px] bg-white"
                />
              </div>
            </div>
          )}

          {/* Submit panel */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              id="btn-cancel-form"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg text-sm transition-colors min-h-[44px]"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              id="btn-save-form"
              disabled={loading}
              className="px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-2 min-h-[44px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Lưu thông tin
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

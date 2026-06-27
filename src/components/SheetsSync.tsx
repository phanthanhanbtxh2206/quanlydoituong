import React, { useState, useEffect } from 'react';
import { User, GoogleSheetsConfig } from '../types';
import { Database, FileSpreadsheet, Download, RefreshCw, Code, Clipboard, Check, HelpCircle, Loader2, Save } from 'lucide-react';
import { getApiUrl, getApiBaseUrl } from '../utils/api';
import ConfirmModal from './ConfirmModal';

interface SheetsSyncProps {
  user: User;
}

export default function SheetsSync({ user }: SheetsSyncProps) {
  const [config, setConfig] = useState<GoogleSheetsConfig>({
    spreadsheetId: '',
    sheetName: 'DanhSachDoiTuong',
    syncEnabled: false,
    lastSyncedAt: null
  });
  const [spreadsheetIdInput, setSpreadsheetIdInput] = useState('');
  const [sheetNameInput, setSheetNameInput] = useState('DanhSachDoiTuong');
  const [syncEnabledInput, setSyncEnabledInput] = useState(false);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);

  const [csvPasteData, setCsvPasteData] = useState('');
  const [importStatus, setImportStatus] = useState({ success: false, message: '' });
  
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState({ success: false, message: '' });

  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const isAdmin = user.role === 'ADMIN';

  const handleRestoreFromSheets = () => {
    if (!config.spreadsheetId) {
      alert('Vui lòng lưu cấu hình Spreadsheet ID trước khi thực hiện khôi phục.');
      return;
    }
    setShowConfirmRestore(true);
  };

  const executeRestoreFromSheets = async () => {
    setShowConfirmRestore(false);
    setRestoreLoading(true);
    setRestoreStatus({ success: false, message: '' });

    try {
      const res = await fetch(getApiUrl('/api/sheets/restore'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi khôi phục từ Google Sheet');

      setRestoreStatus({ success: true, message: data.message });
      alert(data.message);
    } catch (err) {
      setRestoreStatus({ success: false, message: (err as Error).message });
      alert((err as Error).message);
    } finally {
      setRestoreLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch(getApiUrl('/api/sheets/config'), {
        headers: {
          'Authorization': `Bearer ${user.id}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setSpreadsheetIdInput(data.spreadsheetId);
        setSheetNameInput(data.sheetName);
        setSyncEnabledInput(data.syncEnabled);
      }
    } catch (err) {
      console.error('Error fetching sheets config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchConfig();
    }
  }, [user]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/sheets/config'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify({
          spreadsheetId: spreadsheetIdInput,
          sheetName: sheetNameInput,
          syncEnabled: syncEnabledInput
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi lưu cấu hình');

      setConfig(data.config);
      alert(data.message);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvPasteData.trim()) return;

    setImportLoading(true);
    setImportStatus({ success: false, message: '' });

    try {
      const res = await fetch(getApiUrl('/api/sheets/import'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify({ csvData: csvPasteData })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi đồng bộ ngược dữ liệu');

      setImportStatus({ success: true, message: data.message });
      setCsvPasteData('');
      alert(data.message);
    } catch (err) {
      setImportStatus({ success: false, message: (err as Error).message });
    } finally {
      setImportLoading(false);
    }
  };

  // Generate dynamic Google Apps Script code for their Spreadsheet based on current origin!
  const appOrigin = getApiBaseUrl() || window.location.origin;
  const appsScriptCode = `/**
 * Google Apps Script - Đồng bộ hóa danh sách đối tượng và cán bộ đăng ký Đà Nẵng Social
 * Tự động kết nối, lấy dữ liệu thời gian thực từ ứng dụng Đà Nẵng Social và dán vào Google Sheet.
 * Hỗ trợ đồng bộ hai chiều (xuôi từ App về Sheet, và ngược lại từ Sheet lên App).
 * Người viết: Sở Y tế thành phố Đà Nẵng / Apps Script Team
 */

// 1. Tự động kéo dữ liệu từ phần mềm Đà Nẵng Social về Sheet (Đồng bộ xuôi)
function dongBoToanBoDuLieu() {
  // A. Đồng bộ hồ sơ đối tượng
  var appUrlSubjects = "${appOrigin}/api/sheets/export";
  var sheetNameSubjects = "${sheetNameInput || 'DanhSachDoiTuong'}";
  dongBoTab(appUrlSubjects, sheetNameSubjects, "#0284c7");
  
  // B. Đồng bộ danh sách cán bộ đăng ký
  var appUrlUsers = "${appOrigin}/api/sheets/export-users";
  var sheetNameUsers = "DanhSachCanBo";
  dongBoTab(appUrlUsers, sheetNameUsers, "#0f172a");
  
  SpreadsheetApp.getUi().alert("Đồng bộ thành công! Đã tải và định dạng dữ liệu đối tượng & cán bộ đăng ký từ ứng dụng.");
}

function dongBoTab(url, tabName, headerColor) {
  try {
    var response = UrlFetchApp.fetch(url, {
      "muteHttpExceptions": true
    });
    
    if (response.getResponseCode() !== 200) {
      throw new Error("Không thể kết nối đến máy chủ. Mã lỗi: " + response.getResponseCode());
    }
    
    var csvContent = response.getContentText("UTF-8");
    var parsedCsv = Utilities.parseCsv(csvContent);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
    }
    
    sheet.clear();
    
    if (parsedCsv.length > 0) {
      sheet.getRange(1, 1, parsedCsv.length, parsedCsv[0].length).setValues(parsedCsv);
      
      // Định dạng tiêu đề cột
      sheet.getRange(1, 1, 1, parsedCsv[0].length)
           .setBackground(headerColor)
           .setFontColor("#ffffff")
           .setFontWeight("bold");
    }
  } catch (error) {
    Logger.log("Lỗi đồng bộ tab " + tabName + ": " + error.toString());
    SpreadsheetApp.getUi().alert("Có lỗi xảy ra khi đồng bộ tab " + tabName + ": " + error.message);
  }
}

// 2. Chuyển đổi dữ liệu từ Sheet thành CSV để đẩy ngược lên App (Đồng bộ ngược)
function convertSheetToCsv(sheet) {
  var range = sheet.getDataRange();
  var values = range.getValues();
  var csv = "";
  
  var tz = "GMT+7";
  try {
    tz = Session.getScriptTimeZone();
  } catch (e) {}

  for (var i = 0; i < values.length; i++) {
    var row = [];
    for (var j = 0; j < values[i].length; j++) {
      var val = values[i][j];
      var valStr = "";
      if (val instanceof Date) {
        valStr = Utilities.formatDate(val, tz, "yyyy-MM-dd");
      } else if (val !== null && val !== undefined) {
        valStr = val.toString();
      }
      // Escape quotes by doubling them
      valStr = valStr.replace(/"/g, '""');
      row.push('"' + valStr + '"');
    }
    csv += row.join(",") + "\\n";
  }
  return csv;
}

// 3. Đẩy dữ liệu từ Sheet của Tab Đối Tượng ngược về App
function dayNguocDoiTuong() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("${sheetNameInput || 'DanhSachDoiTuong'}");
  if (!sheet) {
    SpreadsheetApp.getUi().alert("Không tìm thấy tab ${sheetNameInput || 'DanhSachDoiTuong'} trên Google Sheet!");
    return;
  }
  
  var confirm = SpreadsheetApp.getUi().alert(
    "Xác nhận đồng bộ ngược",
    "Bạn có chắc chắn muốn đẩy dữ liệu từ tab '" + sheet.getName() + "' ngược về ứng dụng không? Thao tác này sẽ cập nhật các đối tượng và lịch sử ra vào.",
    SpreadsheetApp.getUi().ButtonSet.YES_NO
  );
  
  if (confirm !== SpreadsheetApp.getUi().Button.YES) {
    return;
  }

  var csvData = convertSheetToCsv(sheet);
  dayDuLieuLenApp(csvData, "Danh sách đối tượng");
}

// 4. Đẩy dữ liệu từ Sheet của Tab Cán Bộ ngược về App
function dayNguocCanBo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("DanhSachCanBo");
  if (!sheet) {
    SpreadsheetApp.getUi().alert("Không tìm thấy tab DanhSachCanBo trên Google Sheet!");
    return;
  }

  var confirm = SpreadsheetApp.getUi().alert(
    "Xác nhận đồng bộ ngược",
    "Bạn có chắc chắn muốn đẩy danh sách Cán bộ từ tab này ngược về ứng dụng không?",
    SpreadsheetApp.getUi().ButtonSet.YES_NO
  );
  
  if (confirm !== SpreadsheetApp.getUi().Button.YES) {
    return;
  }

  var csvData = convertSheetToCsv(sheet);
  dayDuLieuLenApp(csvData, "Danh sách cán bộ");
}

function dayDuLieuLenApp(csvData, label) {
  var url = "${appOrigin}/api/sheets/import";
  var options = {
    "method": "post",
    "contentType": "application/json",
    "headers": {
      "Authorization": "Bearer ${user.id}"
    },
    "payload": JSON.stringify({ "csvData": csvData }),
    "muteHttpExceptions": true
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var resText = response.getContentText("UTF-8");
    if (response.getResponseCode() === 200) {
      try {
        var resJson = JSON.parse(resText);
        SpreadsheetApp.getUi().alert("Đồng bộ ngược thành công! " + resJson.message);
      } catch (e) {
        SpreadsheetApp.getUi().alert("Đồng bộ ngược thành công! Tin nhắn phản hồi: " + resText);
      }
    } else {
      SpreadsheetApp.getUi().alert("Lỗi đồng bộ ngược (" + response.getResponseCode() + "): " + resText);
    }
  } catch (error) {
    SpreadsheetApp.getUi().alert("Lỗi kết nối đến ứng dụng: " + error.toString());
  }
}

// 5. Tạo menu nút bấm nhanh trên thanh công cụ của Google Sheet
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("Đà Nẵng Social")
    .addItem("🔄 Tải dữ liệu từ App về Sheet (Chiều Xuôi)", "dongBoToanBoDuLieu")
    .addSeparator()
    .addItem("📤 Đẩy dữ liệu Đối Tượng lên App (Chiều Ngược)", "dayNguocDoiTuong")
    .addItem("📤 Đẩy dữ liệu Cán Bộ lên App (Chiều Ngược)", "dayNguocCanBo")
    .addToUi();
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDevDomain = typeof window !== 'undefined' && (
    window.location.hostname.includes('dev') || 
    window.location.hostname.includes('localhost') || 
    window.location.hostname.includes('3000') ||
    window.location.hostname.includes('web-')
  );

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            Đồng Bộ & Quản Lý Google Sheets
          </h2>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            Hệ thống hỗ trợ xuất bảng tính CSV có hỗ trợ font chữ tiếng Việt, tự động đồng bộ thời gian thực thông qua Google Apps Script được sinh tự động.
          </p>
        </div>
        <div className="flex gap-2 text-slate-950">
          <a
            href={getApiUrl('/api/sheets/export')}
            download="danh-sach-doi-tuong-lang-thang.csv"
            id="btn-download-csv-top"
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition-colors min-h-[44px]"
          >
            <Download className="w-4 h-4" />
            Tải CSV Tiếng Việt
          </a>
        </div>
      </div>

      {isDevDomain && (
        <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl space-y-3 shadow-sm">
          <h4 className="font-bold uppercase text-xs text-amber-800 flex items-center gap-1.5 font-sans">
            ⚠️ CHÚ Ý: BẠN ĐANG TRUY CẬP ỨNG DỤNG TRÊN ĐƯỜNG DẪN THỬ NGHIỆM (DEV/SANDBOX)
          </h4>
          <p className="text-xs text-amber-700 leading-relaxed font-sans">
            Do chính sách bảo mật Sandbox của trình duyệt, Google Sheets (chạy trên máy chủ Cloud của Google) không thể kết nối trực tiếp đến tên miền thử nghiệm nội bộ này (<code className="bg-amber-100 px-1 rounded font-mono font-bold">{window.location.origin}</code>). Do đó, khi bạn nhấn Đồng bộ trên Google Sheet, script sẽ báo lỗi hoặc chỉ hiện mã HTML/code.
          </p>
          <p className="text-xs text-amber-700 leading-relaxed font-semibold font-sans">
            👉 Giải pháp cực kỳ đơn giản: Hãy bấm vào nút <strong className="text-blue-700">Share (Chia sẻ)</strong> hoặc sử dụng đường dẫn <strong className="text-blue-700">Shared App URL (Tên miền Công khai đã Triển khai)</strong> từ thanh công cụ AI Studio. Đường dẫn công khai đó sẽ giúp Google Sheets đồng bộ thành công dữ liệu ngay lập tức!
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left column: Setup & Config or Live Syncer instructions */}
        <div className="space-y-6">
          


          {/* Apps Script Guide - Detailed, step-by-step instructions for non-technical users */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-6 shadow-sm">
            <div className="border-b border-slate-150 pb-4">
              <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                <Code className="w-4 h-4 text-blue-700" />
                Hướng Dẫn Liên Kết Bảng Tính Từng Bước (Cho Người Không Chuyên)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Làm theo 5 bước đơn giản bên dưới để thiết lập tính năng tự động cập nhật danh sách đối tượng trực tiếp trong Google Sheets.
              </p>
            </div>

            <div className="space-y-4 font-sans text-xs text-slate-600">
              {/* Step 1 */}
              <div className="flex gap-3.5 items-start p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-blue-700 shrink-0 text-xs">
                  1
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-tight">Bước 1: Tạo một file Google Sheets trống</h4>
                  <p className="leading-relaxed">
                    Mở trình duyệt web của bạn, truy cập vào tài khoản Google Drive và tạo một file **Google Trang tính (Google Sheets)** mới hoàn toàn. Đặt tên file tùy ý.
                  </p>
                  <p className="text-[11px] text-rose-600 font-medium">
                    * Quan trọng: Ở góc dưới cùng bên trái, hãy nhấp đúp vào tên tab hiện tại (mặc định là "Trang tính 1" hoặc "Sheet1") và sửa tên thành đúng từ: <span className="font-mono font-bold bg-slate-100 px-1 py-0.5 rounded text-slate-800">DanhSachDoiTuong</span> (viết liền không dấu).
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3.5 items-start p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-blue-700 shrink-0 text-xs">
                  2
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-tight">Bước 2: Sao chép đoạn mã tự động của bạn</h4>
                  <p className="leading-relaxed">
                    Hệ thống đã tự động viết sẵn toàn bộ mã lập trình tương thích với tài khoản của bạn. Nhấp vào nút **"Sao chép mã"** ở khung màu đen phía bên dưới để lưu mã vào bộ nhớ đệm máy tính.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3.5 items-start p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-blue-700 shrink-0 text-xs">
                  3
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-tight">Bước 3: Dán đoạn mã vào trang Google Sheets</h4>
                  <p className="leading-relaxed">
                    Quay trở lại file Google Sheets bạn vừa tạo ở Bước 1. Trên thanh công cụ menu phía trên cùng, bấm vào mục **Tiện ích mở rộng (Extensions)** &gt; chọn **Apps Script**. Một trang quản lý mới sẽ hiện ra.
                  </p>
                  <p className="leading-relaxed text-slate-500">
                    Hãy bôi đen và xóa sạch mọi ký tự đang có sẵn trên trang mới đó (ví dụ như hàm <span className="font-mono">myFunction</span> mặc định), sau đó nhấp chuột phải chọn **Dán (Paste)** đoạn mã đã copy ở Bước 2 vào.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-3.5 items-start p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-blue-700 shrink-0 text-xs">
                  4
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-tight">Bước 4: Lưu mã lập trình</h4>
                  <p className="leading-relaxed">
                    Bấm vào biểu tượng chiếc **Đĩa mềm màu đen (Lưu dự án / Save project)** ở phía trên cùng màn hình Apps Script (hoặc bấm tổ hợp phím <kbd className="bg-slate-100 px-1 border rounded shadow-xs font-mono text-[10px]">Ctrl + S</kbd>). Sau khi lưu xong, bạn có thể đóng tab Apps Script này lại.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-3.5 items-start p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-blue-700 shrink-0 text-xs">
                  5
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-tight">Bước 5: Cho phép chạy thử & Ủy quyền</h4>
                  <p className="leading-relaxed">
                    Nhấn phím **F5** để tải lại trang Google Sheets chính của bạn. Lúc này, trên thanh menu công cụ sẽ xuất hiện thêm một mục mới là **Đà Nẵng Social**.
                  </p>
                  <p className="leading-relaxed font-semibold text-blue-900 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100/40">
                    Bấm vào menu **Đà Nẵng Social** &gt; Chọn **🔄 Đồng bộ từ phần mềm**. Do đây là lần đầu chạy, Google sẽ hiện hộp thoại yêu cầu Ủy quyền an toàn, bạn hãy yên tâm làm theo:
                  </p>
                  <ol className="list-decimal pl-4.5 space-y-1 mt-1 text-slate-600 leading-relaxed">
                    <li>Nhấp chọn **Tiếp tục (Continue)**.</li>
                    <li>Chọn tài khoản Gmail của bạn đang sử dụng.</li>
                    <li>Màn hình hiện thông báo cảnh báo màu đỏ, hãy nhấp vào chữ **Nâng cao (Advanced)** ở góc dưới bên trái.</li>
                    <li>Nhấp tiếp vào dòng chữ có liên kết gạch chân: **Đi tới Dự án không có tên (không an toàn)** hoặc **Go to Untitled project (unsafe)**.</li>
                    <li>Cuối cùng bấm nút **Cho phép (Allow)** để đồng ý quyền.</li>
                  </ol>
                  <p className="leading-relaxed text-green-700 font-medium pt-1.5 flex items-center gap-1">
                    <span>🎉</span> Hoàn tất! Từ giờ trở đi, mỗi lần muốn cập nhật số liệu mới nhất từ ứng dụng, bạn chỉ cần nhấp **Đà Nẵng Social &gt; Đồng bộ từ phần mềm**, hệ thống sẽ tự động điền sạch đẹp toàn bộ dữ liệu đối tượng chỉ sau 2 giây!
                  </p>
                </div>
              </div>
            </div>

            {/* Code Box section with clipboard option */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <span className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Mã nguồn Google Apps Script của bạn:
              </span>
              <div className="relative">
                <div className="absolute right-2 top-2 z-10">
                  <button
                    type="button"
                    id="btn-copy-apps-script"
                    onClick={copyToClipboard}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors flex items-center gap-1 text-xs min-h-[44px]"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        <span>Đã sao chép</span>
                      </>
                    ) : (
                      <>
                        <Clipboard className="w-3.5 h-3.5" />
                        <span>Sao chép mã</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-[11px] font-mono leading-relaxed max-h-64 border border-slate-800">
                  {appsScriptCode}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Import CSV / Sheet updates */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
            <h3 className="font-semibold text-base text-slate-900 border-b border-slate-150 pb-3 flex items-center gap-2 uppercase tracking-wider text-xs">
              <RefreshCw className="w-4 h-4 text-blue-700" />
              Đồng Bộ Ngược (Import dữ liệu từ Trang Tính)
            </h3>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <h4 className="font-semibold text-xs text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-4 h-4 text-blue-600" />
                Khôi phục tự động 1-Click (Khuyên dùng)
              </h4>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                Hệ thống sẽ kết nối trực tiếp đến Google Sheet đã cấu hình của bạn, tải dữ liệu mới nhất về và tự động khôi phục toàn bộ danh sách đối tượng, lịch sử ra vào và hình ảnh chỉ trong 2 giây mà không cần copy paste thủ công!
              </p>
              <div className="flex justify-start">
                <button
                  type="button"
                  id="btn-auto-restore-sheets"
                  onClick={handleRestoreFromSheets}
                  disabled={restoreLoading || !config.spreadsheetId}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-bold transition-colors shadow-xs min-h-[44px]"
                >
                  {restoreLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang tải và khôi phục...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Tải & Khôi phục tự động từ Google Sheet</span>
                    </>
                  )}
                </button>
              </div>
              {restoreStatus.message && (
                <div className={`p-2.5 rounded-lg text-xs border ${
                  restoreStatus.success 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  {restoreStatus.message}
                </div>
              )}
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-150"></div>
              <span className="flex-shrink mx-4 text-slate-400 text-[10px] uppercase font-bold tracking-wider">Hoặc Dán Thủ Công</span>
              <div className="flex-grow border-t border-slate-150"></div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Nếu cán bộ chỉnh sửa hàng loạt thông tin của đối tượng trực tiếp trên Google Sheets hoặc phần mềm khác, hãy copy toàn bộ nội dung bảng tính và dán vào ô bên dưới để cập nhật nhanh chóng vào database ứng dụng.
            </p>

            <form onSubmit={handleImportCsv} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Dán dữ liệu CSV/Bảng Tính tại đây
                </label>
                <textarea
                  rows={8}
                  placeholder={`Mã Đối Tượng,Họ và Tên,Ngày Sinh,CCCD,Quê Quán
"sub-001","Nguyễn Văn Hùng","1968-05-12","'048068001234","Duy Xuyên, Quảng Nam"
"sub-002","Trần Thị Lan","1955-09-22","'048155008765","Sơn Trà, Đà Nẵng"`}
                  value={csvPasteData}
                  onChange={(e) => setCsvPasteData(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-lg text-slate-800 text-xs font-mono focus:border-blue-500 min-h-[44px]"
                />
              </div>

              {importStatus.message && (
                <div className={`p-3 rounded-lg text-xs border ${
                  importStatus.success 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  {importStatus.message}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  id="btn-submit-import-csv"
                  disabled={importLoading || !csvPasteData.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-semibold transition-colors min-h-[44px]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${importLoading ? 'animate-spin' : ''}`} />
                  {importLoading ? 'Đang cập nhật...' : 'Thực hiện cập nhật ngược'}
                </button>
              </div>
            </form>
          </div>

          {/* Columns Guide panel */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
            <h4 className="font-semibold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <HelpCircle className="w-4 h-4 text-slate-400" />
              Hướng dẫn đồng bộ ngược & bảo toàn dữ liệu
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              Hệ thống sử dụng cơ chế <strong className="text-blue-700">khớp tên tiêu đề cột động</strong>. Bạn có thể sao chép trực tiếp các ô từ Google Sheet hoặc tệp Excel (phím tắt <kbd className="bg-white px-1 border rounded shadow-xs font-mono text-[10px]">Ctrl + C</kbd>) rồi dán vào ô nhập bên trái (<kbd className="bg-white px-1 border rounded shadow-xs font-mono text-[10px]">Ctrl + V</kbd>). Hệ thống sẽ tự động nhận diện đó là bảng đối tượng hay cán bộ.
            </p>
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              Để bảo toàn và khôi phục 100% dữ liệu (bao gồm cả cán bộ, hình ảnh chân dung, thông tin đăng nhập và lịch sử ra vào) sau khi nâng cấp phần mềm, hãy chắc chắn giữ nguyên các cột sau của từng bảng:
            </p>

            <div className="space-y-3">
              <div>
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Tab 1: Danh sách đối tượng (DanhSachDoiTuong)</span>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-600 bg-white p-3 rounded-lg border border-slate-200 mt-1">
                  <div>1. Mã Đối Tượng (ID)</div>
                  <div>2. Họ và Tên</div>
                  <div>3. Ngày Sinh (YYYY-MM-DD)</div>
                  <div>4. Giới Tính (Nam/Nữ)</div>
                  <div>5. CCCD</div>
                  <div>6. Quê Quán</div>
                  <div>7. Ảnh Đối Tượng (Base64)</div>
                  <div>8. Lịch Sử Chi Tiết (JSON)</div>
                </div>
              </div>
              
              <div>
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Tab 2: Danh sách cán bộ (DanhSachCanBo)</span>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-600 bg-white p-3 rounded-lg border border-slate-200 mt-1">
                  <div>1. ID Cán Bộ (ID)</div>
                  <div>2. Tên Đăng Nhập</div>
                  <div>3. Họ và Tên</div>
                  <div>4. Email</div>
                  <div>5. Mã Trung Tâm</div>
                  <div>6. Vai Trò (ADMIN/STAFF)</div>
                  <div>7. Phê Duyệt (true/false)</div>
                  <div>8. Mật Khẩu Mã Hóa</div>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-green-700 font-semibold bg-green-50 p-2 rounded-lg border border-green-100/50">
              💡 Mẹo sao lưu: Để tránh mất dữ liệu cũ khi xuất bản các tính năng mới trong tương lai, bạn chỉ cần xuất bảng tính Google Sheet để sao lưu trước khi xuất bản. Sau khi xuất bản xong, hãy sử dụng tính năng "Tải & Khôi phục tự động" để khôi phục toàn bộ dữ liệu chỉ trong 2 giây!
            </p>
          </div>
        </div>

      </div>

      <ConfirmModal
        isOpen={showConfirmRestore}
        title="Khôi phục danh sách từ Google Sheets"
        message="Bạn có chắc chắn muốn khôi phục toàn bộ danh sách đối tượng trực tiếp từ Google Sheet không? Hệ thống sẽ tải dữ liệu thời gian thực hiện tại và cập nhật đè các thay đổi hiện tại trên ứng dụng."
        confirmText="Tải & Khôi phục"
        cancelText="Hủy bỏ"
        type="warning"
        onConfirm={executeRestoreFromSheets}
        onCancel={() => setShowConfirmRestore(false)}
      />
    </div>
  );
}

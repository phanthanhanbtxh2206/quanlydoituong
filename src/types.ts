export type UserRole = 'ADMIN' | 'STAFF';

export interface SocialCenter {
  id: string;
  name: string;
  address: string;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  centerId: string; // 'all' for ADMIN, specific centerId for STAFF
  centerName: string;
  approved: boolean;
  createdAt: string;
}

export interface SubjectEntry {
  id: string;
  entryDate: string; // YYYY-MM-DD
  exitDate: string | null; // YYYY-MM-DD
  reason: string;
  status: 'ACTIVE' | 'RETURNED'; // ACTIVE = Đang ở trung tâm, RETURNED = Đã bàn giao/về địa phương
  notes?: string;
}

export interface BeggingSubject {
  id: string;
  fullName: string;
  dob: string; // YYYY-MM-DD
  gender: 'Nam' | 'Nữ' | 'Khác'; // Gender: Male, Female, Other
  cccd: string; // Citizen ID, unique if present
  hometown: string;
  relativesInfo: string;
  image: string; // Base64 data-uri or photo URL
  centerId: string; // Center managing this subject
  centerName: string;
  createdBy: string; // userId
  updatedBy: string; // userId
  createdAt: string;
  updatedAt: string;
  history: SubjectEntry[]; // Entry logs
  // Calculated count: entries.length
}

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  sheetName: string;
  syncEnabled: boolean;
  lastSyncedAt: string | null;
}

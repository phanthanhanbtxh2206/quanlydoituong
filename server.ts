import express from "express";
import path from "path";
import fs from "fs";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { createServer as createViteServer } from "vite";
import { User, SocialCenter, BeggingSubject, SubjectEntry, GoogleSheetsConfig } from "./src/types";

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "data-store.json");

let currentDB: DatabaseSchema = {
  users: [],
  centers: [],
  subjects: [],
  sheetsConfig: {
    spreadsheetId: "",
    sheetName: "DanhSachDoiTuong",
    syncEnabled: false,
    lastSyncedAt: null
  }
};

let previousDB: DatabaseSchema = {
  users: [],
  centers: [],
  subjects: [],
  sheetsConfig: {
    spreadsheetId: "",
    sheetName: "DanhSachDoiTuong",
    syncEnabled: false,
    lastSyncedAt: null
  }
};

app.use(express.json({ limit: "50mb" })); // Support large base64 image uploads

// --------------------------------------------------
// Mock/Persistent Database Initialization
// --------------------------------------------------
interface DatabaseSchema {
  users: (User & { passwordHash: string })[];
  centers: SocialCenter[];
  subjects: BeggingSubject[];
  sheetsConfig: GoogleSheetsConfig;
}

const DEFAULT_CENTERS: SocialCenter[] = [
  { id: "httx", name: "Trung tâm Hỗ trợ Xã hội Đà Nẵng", address: "124 Nguyễn Huy Tưởng, P. Hòa Minh, Q. Liên Chiểu, TP. Đà Nẵng" },
  { id: "btxh", name: "Trung tâm Bảo trợ Xã hội Đà Nẵng", address: "Phường Hòa Thọ Tây, Q. Cẩm Lệ, TP. Đà Nẵng" },
  { id: "syt", name: "Sở Y tế thành phố Đà Nẵng", address: "Tòa nhà Trung tâm Hành chính, 24 Trần Phú, Q. Hải Châu, TP. Đà Nẵng" }
];

const DEFAULT_SUBJECTS: BeggingSubject[] = [
  {
    id: "sub-001",
    fullName: "Nguyễn Văn Hùng",
    dob: "1968-05-12",
    gender: "Nam",
    cccd: "048068001234",
    hometown: "Duy Xuyên, Quảng Nam",
    relativesInfo: "Vợ: Lê Thị Mai (Mất), Con trai: Nguyễn Văn Dũng (Không liên lạc được)",
    image: "", // We can use empty or default system placeholder
    centerId: "httx",
    centerName: "Trung tâm Hỗ trợ Xã hội Đà Nẵng",
    createdBy: "usr-staff1",
    updatedBy: "usr-staff1",
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    history: [
      {
        id: "hist-101",
        entryDate: "2026-01-15",
        exitDate: "2026-02-10",
        reason: "Lang thang xin ăn tại ngã tư Lê Duẩn - Nguyễn Chí Thanh, không nơi cư trú",
        status: "RETURNED",
        notes: "Đã bàn giao về địa phương Duy Xuyên, Quảng Nam quản lý"
      },
      {
        id: "hist-102",
        entryDate: "2026-05-20",
        exitDate: null,
        reason: "Tiếp tục lang thang ăn xin tại khu vực Chợ Cồn, TP. Đà Nẵng",
        status: "ACTIVE",
        notes: "Đang kiểm tra y tế và chăm sóc phục hồi sức khỏe"
      }
    ]
  },
  {
    id: "sub-002",
    fullName: "Trần Thị Lan",
    dob: "1955-09-22",
    gender: "Nữ",
    cccd: "048155008765",
    hometown: "Sơn Trà, Đà Nẵng",
    relativesInfo: "Em gái: Trần Thị Liên (Phường Mân Thái, Q. Sơn Trà) - Hoàn cảnh khó khăn",
    image: "",
    centerId: "btxh",
    centerName: "Trung tâm Bảo trợ Xã hội Đà Nẵng",
    createdBy: "usr-staff2",
    updatedBy: "usr-staff2",
    createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    history: [
      {
        id: "hist-201",
        entryDate: "2025-11-10",
        exitDate: "2026-02-05",
        reason: "Lang thang xin ăn tại bãi biển Phạm Văn Đồng, tinh thần không tỉnh táo",
        status: "RETURNED",
        notes: "Gia đình bảo lãnh đưa về tự quản lý chăm sóc tại nhà"
      }
    ]
  },
  {
    id: "sub-003",
    fullName: "Phạm Minh Tuấn",
    dob: "1989-11-03",
    gender: "Nam",
    cccd: "",
    hometown: "Lệ Thủy, Quảng Bình",
    relativesInfo: "Không có thông tin thân nhân rõ ràng, tự khai đơn độc",
    image: "",
    centerId: "httx",
    centerName: "Trung tâm Hỗ trợ Xã hội Đà Nẵng",
    createdBy: "usr-staff1",
    updatedBy: "usr-staff1",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    history: [
      {
        id: "hist-301",
        entryDate: "2026-05-25",
        exitDate: null,
        reason: "Lang thang bán vé số kết hợp xin ăn tại khu vực cầu Rồng Đà Nẵng",
        status: "ACTIVE",
        notes: "Nhân viên xã hội đang tư vấn định hướng nghề nghiệp và liên hệ địa phương xác minh lý lịch"
      }
    ]
  }
];

function getInitialDB(): DatabaseSchema {
  return {
    users: [
      {
        id: "usr-admin",
        username: "admin",
        fullName: "Lãnh đạo Sở Y tế Đà Nẵng",
        email: "syt@danang.gov.vn",
        role: "ADMIN",
        centerId: "all",
        centerName: "Sở Y tế thành phố Đà Nẵng",
        approved: true,
        createdAt: new Date().toISOString(),
        passwordHash: "admin123" // Plain text password for simplicity in mock backend
      },
      {
        id: "usr-staff1",
        username: "staff_httx",
        fullName: "Nguyễn Trung Thực",
        email: "thuc.httx@danang.gov.vn",
        role: "STAFF",
        centerId: "httx",
        centerName: "Trung tâm Hỗ trợ Xã hội Đà Nẵng",
        approved: true,
        createdAt: new Date().toISOString(),
        passwordHash: "staff123"
      },
      {
        id: "usr-staff2",
        username: "staff_btxh",
        fullName: "Lê Hoài Nam",
        email: "nam.btxh@danang.gov.vn",
        role: "STAFF",
        centerId: "btxh",
        centerName: "Trung tâm Bảo trợ Xã hội Đà Nẵng",
        approved: true,
        createdAt: new Date().toISOString(),
        passwordHash: "staff123"
      },
      {
        id: "usr-pending",
        username: "pending_user",
        fullName: "Trần Kim Liên",
        email: "lien.httx@danang.gov.vn",
        role: "STAFF",
        centerId: "httx",
        centerName: "Trung tâm Hỗ trợ Xã hội Đà Nẵng",
        approved: false,
        createdAt: new Date().toISOString(),
        passwordHash: "pending123"
      }
    ],
    centers: DEFAULT_CENTERS,
    subjects: DEFAULT_SUBJECTS,
    sheetsConfig: {
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || "",
      sheetName: "DanhSachDoiTuong",
      syncEnabled: !!process.env.GOOGLE_SPREADSHEET_ID,
      lastSyncedAt: null
    }
  };
}

async function initFirestore() {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (!fs.existsSync(configPath)) {
      console.warn("No firebase-applet-config.json found, using in-memory mock database.");
      currentDB = getInitialDB();
      previousDB = JSON.parse(JSON.stringify(currentDB));
      return;
    }

    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    if (getApps().length === 0) {
      initializeApp({
        apiKey: firebaseConfig.apiKey,
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId,
        appId: firebaseConfig.appId,
      });
    }

    const firestoreDb = firebaseConfig.firestoreDatabaseId 
      ? getFirestore(getApp(), firebaseConfig.firestoreDatabaseId)
      : getFirestore();

    console.log("Firestore successfully initialized. Loading data...");

    // Load users
    const usersSnapshot = await getDocs(collection(firestoreDb, "users"));
    const usersList: any[] = [];
    usersSnapshot.forEach(doc => {
      usersList.push(doc.data());
    });

    // Load centers
    const centersSnapshot = await getDocs(collection(firestoreDb, "centers"));
    const centersList: any[] = [];
    centersSnapshot.forEach(doc => {
      centersList.push(doc.data());
    });

    // Load subjects
    const subjectsSnapshot = await getDocs(collection(firestoreDb, "subjects"));
    const subjectsList: any[] = [];
    subjectsSnapshot.forEach(doc => {
      subjectsList.push(doc.data());
    });

    // Load sheetsConfig
    const configDoc = await getDoc(doc(firestoreDb, "config", "sheetsConfig"));
    let sheetsConfig = configDoc.exists() ? configDoc.data() : null;

    // If Firestore has no users, it means it's a fresh database. We need to seed it with defaults!
    if (usersList.length === 0 && centersList.length === 0 && subjectsList.length === 0) {
      console.log("Firestore is empty. Seeding initial default database...");
      const initialDB = getInitialDB();
      
      // Seed users
      for (const u of initialDB.users) {
        await setDoc(doc(firestoreDb, "users", u.id), u);
      }
      // Seed centers
      for (const c of initialDB.centers) {
        await setDoc(doc(firestoreDb, "centers", c.id), c);
      }
      // Seed subjects
      for (const s of initialDB.subjects) {
        await setDoc(doc(firestoreDb, "subjects", s.id), s);
      }
      // Seed sheetsConfig
      await setDoc(doc(firestoreDb, "config", "sheetsConfig"), initialDB.sheetsConfig);

      currentDB = initialDB;
    } else {
      currentDB = {
        users: usersList.length > 0 ? usersList : getInitialDB().users,
        centers: centersList.length > 0 ? centersList : getInitialDB().centers,
        subjects: subjectsList,
        sheetsConfig: sheetsConfig ? (sheetsConfig as GoogleSheetsConfig) : getInitialDB().sheetsConfig
      };
      console.log(`Loaded from Firestore: ${currentDB.users.length} users, ${currentDB.centers.length} centers, ${currentDB.subjects.length} subjects.`);
    }

    previousDB = JSON.parse(JSON.stringify(currentDB));
  } catch (err) {
    console.error("Failed to initialize or load Firestore:", err);
    // Fallback to local storage
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        currentDB = JSON.parse(raw);
      } else {
        currentDB = getInitialDB();
      }
    } catch (localErr) {
      currentDB = getInitialDB();
    }
    previousDB = JSON.parse(JSON.stringify(currentDB));
  }
}

async function syncFirestoreDiff() {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (!fs.existsSync(configPath)) return;

    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    if (getApps().length === 0) {
      initializeApp({
        apiKey: firebaseConfig.apiKey,
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId,
        appId: firebaseConfig.appId,
      });
    }
    const firestoreDb = firebaseConfig.firestoreDatabaseId 
      ? getFirestore(getApp(), firebaseConfig.firestoreDatabaseId)
      : getFirestore();

    // Sync Users
    const currentUsers = currentDB.users;
    const previousUsers = previousDB.users;

    for (const u of currentUsers) {
      const prev = previousUsers.find(p => p.id === u.id);
      if (!prev || JSON.stringify(prev) !== JSON.stringify(u)) {
        await setDoc(doc(firestoreDb, "users", u.id), u);
      }
    }
    for (const p of previousUsers) {
      if (!currentUsers.some(u => u.id === p.id)) {
        await deleteDoc(doc(firestoreDb, "users", p.id));
      }
    }

    // Sync Centers
    const currentCenters = currentDB.centers;
    const previousCenters = previousDB.centers;

    for (const c of currentCenters) {
      const prev = previousCenters.find(p => p.id === c.id);
      if (!prev || JSON.stringify(prev) !== JSON.stringify(c)) {
        await setDoc(doc(firestoreDb, "centers", c.id), c);
      }
    }
    for (const p of previousCenters) {
      if (!currentCenters.some(c => c.id === p.id)) {
        await deleteDoc(doc(firestoreDb, "centers", p.id));
      }
    }

    // Sync Subjects
    const currentSubjects = currentDB.subjects;
    const previousSubjects = previousDB.subjects;

    for (const s of currentSubjects) {
      const prev = previousSubjects.find(p => p.id === s.id);
      if (!prev || JSON.stringify(prev) !== JSON.stringify(s)) {
        await setDoc(doc(firestoreDb, "subjects", s.id), s);
      }
    }
    for (const p of previousSubjects) {
      if (!currentSubjects.some(s => s.id === p.id)) {
        await deleteDoc(doc(firestoreDb, "subjects", p.id));
      }
    }

    // Sync Config
    if (JSON.stringify(currentDB.sheetsConfig) !== JSON.stringify(previousDB.sheetsConfig)) {
      await setDoc(doc(firestoreDb, "config", "sheetsConfig"), currentDB.sheetsConfig);
    }

    previousDB = JSON.parse(JSON.stringify(currentDB));
  } catch (err) {
    console.error("Error during Firestore background diff sync:", err);
  }
}

function readDB(): DatabaseSchema {
  if (currentDB.users.length === 0) {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        currentDB = JSON.parse(raw);
        previousDB = JSON.parse(JSON.stringify(currentDB));
      } else {
        currentDB = getInitialDB();
        previousDB = JSON.parse(JSON.stringify(currentDB));
      }
    } catch (e) {
      currentDB = getInitialDB();
      previousDB = JSON.parse(JSON.stringify(currentDB));
    }
  }
  return currentDB;
}

function writeDB(data: DatabaseSchema) {
  currentDB = data;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database backup file:", err);
  }

  syncFirestoreDiff().catch(err => {
    console.error("Firestore background sync failed:", err);
  });
}

// Helper to authenticate request
function authenticate(req: express.Request): User | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const userId = authHeader.substring(7);
  const db = readDB();
  const user = db.users.find(u => u.id === userId && u.approved);
  if (!user) return null;
  const { passwordHash, ...userResponse } = user;
  return userResponse;
}

// --------------------------------------------------
// API ENDPOINTS
// --------------------------------------------------

// 1. Auth Endpoint: Login
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.username === username);

  if (!user) {
    return res.status(401).json({ message: "Tên đăng nhập không tồn tại hoặc chưa được duyệt" });
  }

  if (user.passwordHash !== password) {
    return res.status(401).json({ message: "Mật khẩu không chính xác" });
  }

  if (!user.approved) {
    return res.status(403).json({ message: "Tài khoản của bạn đang chờ phê duyệt từ quản trị viên Sở Y tế" });
  }

  const { passwordHash, ...userResponse } = user;
  res.json({ token: user.id, user: userResponse });
});

// 2. Auth Endpoint: Register
app.post("/api/auth/register", (req, res) => {
  const { username, fullName, email, password, centerId, centerName } = req.body;
  const db = readDB();

  if (!username || !fullName || !password || (!centerId && !centerName)) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin đăng ký" });
  }

  if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ message: "Tên đăng nhập đã tồn tại trong hệ thống" });
  }

  let finalCenterId = centerId;
  let finalCenterName = centerName;

  if (centerName && !centerId) {
    // Try to find if a center with this name already exists
    const trimmedName = centerName.trim();
    let center = db.centers.find(c => c.name.toLowerCase() === trimmedName.toLowerCase());
    if (!center) {
      // Create a new center dynamically!
      const newId = "ctr-" + Math.random().toString(36).substr(2, 9);
      center = {
        id: newId,
        name: trimmedName,
        address: "Đang cập nhật"
      };
      db.centers.push(center);
      writeDB(db);
    }
    finalCenterId = center.id;
    finalCenterName = center.name;
  } else if (centerId) {
    const center = db.centers.find(c => c.id === centerId);
    if (!center) {
      return res.status(400).json({ message: "Trung tâm được chọn không tồn tại" });
    }
    finalCenterName = center.name;
  }

  const newUser: User & { passwordHash: string } = {
    id: "usr-" + Math.random().toString(36).substr(2, 9),
    username,
    fullName,
    email: email || "",
    role: "STAFF", // Registered users default to STAFF
    centerId: finalCenterId,
    centerName: finalCenterName,
    approved: false, // Must be approved by Admin (Sở Y tế)
    createdAt: new Date().toISOString(),
    passwordHash: password
  };

  db.users.push(newUser);
  writeDB(db);

  res.json({ message: "Đăng ký thành công! Vui lòng chờ quản trị viên Sở Y tế phê duyệt tài khoản." });
});

// 2.5 DB Auto-Backup & Restore Endpoints
app.get("/api/db/status", (req, res) => {
  const db = readDB();
  res.json({
    initialized: db.subjects.length > 0 || db.users.length > 1, // more than the default admin user
    countSubjects: db.subjects.length,
    countUsers: db.users.length,
    countCenters: db.centers.length
  });
});

app.post("/api/db/restore", (req, res) => {
  const { users, centers, subjects, sheetsConfig } = req.body;
  if (!users && !centers && !subjects && !sheetsConfig) {
    return res.status(400).json({ message: "Dữ liệu khôi phục không hợp lệ" });
  }

  const db = readDB();
  
  // Only restore if the incoming data is richer
  if (subjects && Array.isArray(subjects) && subjects.length > 0) {
    db.subjects = subjects;
  }
  if (users && Array.isArray(users) && users.length > 0) {
    // Merge users, keeping existing users
    const mergedUsers = [...db.users];
    for (const u of users) {
      if (!mergedUsers.some(existingUser => existingUser.id === u.id || existingUser.username === u.username)) {
        mergedUsers.push(u);
      }
    }
    db.users = mergedUsers;
  }
  if (centers && Array.isArray(centers) && centers.length > 0) {
    // Merge centers
    const mergedCenters = [...db.centers];
    for (const c of centers) {
      if (!mergedCenters.some(existingCenter => existingCenter.id === c.id)) {
        mergedCenters.push(c);
      }
    }
    db.centers = mergedCenters;
  }
  if (sheetsConfig && sheetsConfig.spreadsheetId) {
    db.sheetsConfig = sheetsConfig;
  }

  writeDB(db);
  console.log(`[Auto-Restore] Successfully restored database from client backup: ${db.subjects.length} subjects, ${db.users.length} users.`);
  res.json({
    success: true,
    countSubjects: db.subjects.length,
    countUsers: db.users.length
  });
});

// 3. Auth Endpoint: Me
app.get("/api/auth/me", (req, res) => {
  const user = authenticate(req);
  if (!user) {
    return res.status(401).json({ message: "Chưa đăng nhập hoặc phiên làm việc hết hạn" });
  }
  res.json(user);
});

// 4. Centers List
app.get("/api/centers", (req, res) => {
  const db = readDB();
  res.json(db.centers);
});

// 5. Admin: List All Users (Approved or Pending)
app.get("/api/users", (req, res) => {
  const user = authenticate(req);
  if (!user || user.role !== "ADMIN") {
    return res.status(403).json({ message: "Quyền hạn của bạn không thể thực hiện chức năng này" });
  }
  const db = readDB();
  const usersResponse = db.users.map(u => {
    const { passwordHash, ...rest } = u;
    return { ...rest, password: passwordHash };
  });
  res.json(usersResponse);
});

// 6. Admin: Approve User & Update Role/Center
app.post("/api/users/approve", (req, res) => {
  const currentUser = authenticate(req);
  if (!currentUser || currentUser.role !== "ADMIN") {
    return res.status(403).json({ message: "Quyền hạn của bạn không thể thực hiện chức năng này" });
  }

  const { userId, approved, role, centerId } = req.body;
  const db = readDB();
  const userIndex = db.users.findIndex(u => u.id === userId);

  if (userIndex === -1) {
    return res.status(404).json({ message: "Không tìm thấy người dùng" });
  }

  const userToUpdate = db.users[userIndex];
  userToUpdate.approved = approved;
  if (role) userToUpdate.role = role;
  
  if (centerId) {
    const center = db.centers.find(c => c.id === centerId);
    if (center) {
      userToUpdate.centerId = centerId;
      userToUpdate.centerName = center.name;
    }
  }

  writeDB(db);
  res.json({ message: "Cập nhật tài khoản người dùng thành công", user: db.users[userIndex] });
});

// 7. Admin: Delete User
app.delete("/api/users/:id", (req, res) => {
  const currentUser = authenticate(req);
  if (!currentUser || currentUser.role !== "ADMIN") {
    return res.status(403).json({ message: "Quyền hạn của bạn không thể thực hiện chức năng này" });
  }

  const userId = req.params.id;
  if (userId === currentUser.id) {
    return res.status(400).json({ message: "Không thể tự xóa tài khoản của chính mình" });
  }

  const db = readDB();
  const index = db.users.findIndex(u => u.id === userId);
  if (index === -1) {
    return res.status(404).json({ message: "Không tìm thấy người dùng" });
  }

  db.users.splice(index, 1);
  writeDB(db);
  res.json({ message: "Đã xóa tài khoản thành công" });
});

// 8. Subjects Endpoint: GET (List all with filters)
app.get("/api/subjects", (req, res) => {
  const user = authenticate(req);
  if (!user) {
    return res.status(401).json({ message: "Chưa đăng nhập" });
  }

  const db = readDB();
  let list = db.subjects;

  // Search filtering
  const { search, center, hometown, status } = req.query;

  if (search) {
    const searchStr = String(search).toLowerCase();
    list = list.filter(s => 
      s.fullName.toLowerCase().includes(searchStr) || 
      s.cccd.includes(searchStr) ||
      s.hometown.toLowerCase().includes(searchStr)
    );
  }

  if (center && center !== "all") {
    list = list.filter(s => s.centerId === center);
  }

  if (hometown) {
    const htStr = String(hometown).toLowerCase();
    list = list.filter(s => s.hometown.toLowerCase().includes(htStr));
  }

  if (status && status !== "all") {
    list = list.filter(s => {
      // Find current active status (status of last entry in history)
      const currentStatus = s.history.length > 0 ? s.history[s.history.length - 1].status : "RETURNED";
      return currentStatus === status;
    });
  }

  // Auto calculated field added: entriesCount
  const responseData = list.map(s => ({
    ...s,
    entriesCount: s.history.length,
    currentStatus: s.history.length > 0 ? s.history[s.history.length - 1].status : "RETURNED",
    lastEntryDate: s.history.length > 0 ? s.history[s.history.length - 1].entryDate : null,
    lastExitDate: s.history.length > 0 ? s.history[s.history.length - 1].exitDate : null
  }));

  res.json(responseData);
});

// 9. Subjects Endpoint: GET single subject by ID
app.get("/api/subjects/:id", (req, res) => {
  const user = authenticate(req);
  if (!user) return res.status(401).json({ message: "Chưa đăng nhập" });

  const db = readDB();
  const subject = db.subjects.find(s => s.id === req.params.id);
  if (!subject) {
    return res.status(404).json({ message: "Không tìm thấy đối tượng" });
  }

  res.json({
    ...subject,
    entriesCount: subject.history.length,
    currentStatus: subject.history.length > 0 ? subject.history[subject.history.length - 1].status : "RETURNED"
  });
});

// 10. Subjects Endpoint: POST (Create Subject)
app.post("/api/subjects", (req, res) => {
  const user = authenticate(req);
  if (!user) return res.status(401).json({ message: "Chưa đăng nhập" });

  const { fullName, dob, gender, cccd, hometown, relativesInfo, image, initialEntry } = req.body;

  if (!fullName || !dob) {
    return res.status(400).json({ message: "Vui lòng nhập Họ tên và Ngày sinh đối tượng" });
  }

  const db = readDB();

  // If user is STAFF, centerId must be their own center
  const centerId = user.role === "ADMIN" ? (req.body.centerId || "httx") : user.centerId;
  const center = db.centers.find(c => c.id === centerId);
  const centerName = center ? center.name : "Trung tâm Hỗ trợ Xã hội Đà Nẵng";

  // Check unique CCCD if supplied
  if (cccd && db.subjects.some(s => s.cccd === cccd)) {
    return res.status(400).json({ message: "Số CCCD này đã tồn tại trên hệ thống của đối tượng khác" });
  }

  const subjectId = "sub-" + Math.random().toString(36).substr(2, 9);
  
  // Construct initial entry if provided, otherwise default active entry
  const entryHistory: SubjectEntry[] = [];
  if (initialEntry && initialEntry.entryDate) {
    entryHistory.push({
      id: "hist-" + Math.random().toString(36).substr(2, 9),
      entryDate: initialEntry.entryDate,
      exitDate: initialEntry.exitDate || null,
      reason: initialEntry.reason || "Phát hiện lang thang xin ăn",
      status: initialEntry.status || "ACTIVE",
      notes: initialEntry.notes || ""
    });
  } else {
    // Standard default history log
    entryHistory.push({
      id: "hist-" + Math.random().toString(36).substr(2, 9),
      entryDate: new Date().toISOString().substring(0, 10),
      exitDate: null,
      reason: "Tiếp nhận diện đối tượng lang thang xin ăn",
      status: "ACTIVE",
      notes: ""
    });
  }

  const newSubject: BeggingSubject = {
    id: subjectId,
    fullName,
    dob,
    gender: gender || "Nam",
    cccd: cccd || "",
    hometown: hometown || "Không rõ",
    relativesInfo: relativesInfo || "Không rõ",
    image: image || "",
    centerId,
    centerName,
    createdBy: user.id,
    updatedBy: user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: entryHistory
  };

  db.subjects.push(newSubject);
  writeDB(db);

  res.json({ message: "Đăng ký đối tượng mới thành công", subject: newSubject });
});

// 11. Subjects Endpoint: PUT (Edit Subject details)
app.put("/api/subjects/:id", (req, res) => {
  const user = authenticate(req);
  if (!user) return res.status(401).json({ message: "Chưa đăng nhập" });

  const subjectId = req.params.id;
  const db = readDB();
  const index = db.subjects.findIndex(s => s.id === subjectId);

  if (index === -1) {
    return res.status(404).json({ message: "Không tìm thấy đối tượng" });
  }

  const subject = db.subjects[index];

  // Permissions guard: Only staff of this center (or ADMIN) can update
  if (user.role !== "ADMIN" && subject.centerId !== user.centerId) {
    return res.status(403).json({ message: "Bạn không có quyền chỉnh sửa đối tượng của trung tâm khác" });
  }

  const { fullName, dob, gender, cccd, hometown, relativesInfo, image, centerId } = req.body;

  if (fullName) subject.fullName = fullName;
  if (dob) subject.dob = dob;
  if (gender) subject.gender = gender;
  if (relativesInfo !== undefined) subject.relativesInfo = relativesInfo;
  if (hometown !== undefined) subject.hometown = hometown;
  if (image !== undefined) subject.image = image;

  // CCCD validation
  if (cccd !== undefined) {
    if (cccd && db.subjects.some(s => s.cccd === cccd && s.id !== subjectId)) {
      return res.status(400).json({ message: "Số CCCD này trùng với đối tượng khác trên hệ thống" });
    }
    subject.cccd = cccd;
  }

  // Admin can change managed center
  if (user.role === "ADMIN" && centerId && centerId !== subject.centerId) {
    const center = db.centers.find(c => c.id === centerId);
    if (center) {
      subject.centerId = centerId;
      subject.centerName = center.name;
    }
  }

  subject.updatedBy = user.id;
  subject.updatedAt = new Date().toISOString();

  writeDB(db);
  res.json({ message: "Cập nhật thông tin đối tượng thành công", subject });
});

// 12. Subjects Endpoint: DELETE (Delete Subject)
app.delete("/api/subjects/:id", (req, res) => {
  const user = authenticate(req);
  if (!user) return res.status(401).json({ message: "Chưa đăng nhập" });

  const subjectId = req.params.id;
  const db = readDB();
  const index = db.subjects.findIndex(s => s.id === subjectId);

  if (index === -1) {
    return res.status(404).json({ message: "Không tìm thấy đối tượng" });
  }

  const subject = db.subjects[index];

  // Permissions guard
  if (user.role !== "ADMIN" && subject.centerId !== user.centerId) {
    return res.status(403).json({ message: "Bạn không có quyền xóa đối tượng của trung tâm khác" });
  }

  db.subjects.splice(index, 1);
  writeDB(db);
  res.json({ message: "Đã xóa đối tượng thành công" });
});

// 13. Subject History Log Endpoints: Add, Update, Delete Entry
app.post("/api/subjects/:id/history", (req, res) => {
  const user = authenticate(req);
  if (!user) return res.status(401).json({ message: "Chưa đăng nhập" });

  const subjectId = req.params.id;
  const db = readDB();
  const subject = db.subjects.find(s => s.id === subjectId);

  if (!subject) return res.status(404).json({ message: "Không tìm thấy đối tượng" });

  if (user.role !== "ADMIN" && subject.centerId !== user.centerId) {
    return res.status(403).json({ message: "Bạn không có quyền thao tác trên đối tượng của trung tâm khác" });
  }

  const { entryDate, exitDate, reason, status, notes } = req.body;

  if (!entryDate) {
    return res.status(400).json({ message: "Vui lòng nhập Ngày vào trung tâm" });
  }

  const newEntry: SubjectEntry = {
    id: "hist-" + Math.random().toString(36).substr(2, 9),
    entryDate,
    exitDate: exitDate || null,
    reason: reason || "Được phát hiện và tiếp nhận vào trung tâm",
    status: status || "ACTIVE",
    notes: notes || ""
  };

  subject.history.push(newEntry);
  // Sort history chronologically
  subject.history.sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
  subject.updatedAt = new Date().toISOString();
  subject.updatedBy = user.id;

  writeDB(db);
  res.json({ message: "Thêm lịch sử vào trung tâm thành công", subject });
});

// Update an entry log
app.put("/api/subjects/:id/history/:historyId", (req, res) => {
  const user = authenticate(req);
  if (!user) return res.status(401).json({ message: "Chưa đăng nhập" });

  const { id: subjectId, historyId } = req.params;
  const db = readDB();
  const subject = db.subjects.find(s => s.id === subjectId);

  if (!subject) return res.status(404).json({ message: "Không tìm thấy đối tượng" });

  if (user.role !== "ADMIN" && subject.centerId !== user.centerId) {
    return res.status(403).json({ message: "Bạn không có quyền thao tác trên đối tượng của trung tâm khác" });
  }

  const entryIndex = subject.history.findIndex(h => h.id === historyId);
  if (entryIndex === -1) return res.status(404).json({ message: "Không tìm thấy dòng lịch sử" });

  const { entryDate, exitDate, reason, status, notes } = req.body;
  const entry = subject.history[entryIndex];

  if (entryDate) entry.entryDate = entryDate;
  entry.exitDate = exitDate !== undefined ? exitDate : entry.exitDate;
  if (reason !== undefined) entry.reason = reason;
  if (status !== undefined) entry.status = status;
  if (notes !== undefined) entry.notes = notes;

  // Re-sort
  subject.history.sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
  subject.updatedAt = new Date().toISOString();
  subject.updatedBy = user.id;

  writeDB(db);
  res.json({ message: "Cập nhật lịch sử vào ra thành công", subject });
});

// Delete history log
app.delete("/api/subjects/:id/history/:historyId", (req, res) => {
  const user = authenticate(req);
  if (!user) return res.status(401).json({ message: "Chưa đăng nhập" });

  if (user.role === "ADMIN") {
    return res.status(403).json({ message: "Không thể xóa lịch sử ra vào Trung tâm của đối tượng khi đang ở quyền Lãnh đạo Sở Admin nhằm bảo vệ tính toàn vẹn dữ liệu." });
  }

  const { id: subjectId, historyId } = req.params;
  const db = readDB();
  const subject = db.subjects.find(s => s.id === subjectId);

  if (!subject) return res.status(404).json({ message: "Không tìm thấy đối tượng" });

  if (subject.centerId !== user.centerId) {
    return res.status(403).json({ message: "Bạn không có quyền thao tác trên đối tượng của trung tâm khác" });
  }

  const entryIndex = subject.history.findIndex(h => h.id === historyId);
  if (entryIndex === -1) return res.status(404).json({ message: "Không tìm thấy dòng lịch sử" });

  subject.history.splice(entryIndex, 1);
  subject.updatedAt = new Date().toISOString();
  subject.updatedBy = user.id;

  writeDB(db);
  res.json({ message: "Xóa dòng lịch sử thành công", subject });
});

// 14. Google Sheets integration endpoints
app.get("/api/sheets/config", (req, res) => {
  const user = authenticate(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ message: "Chỉ quản trị viên mới xem được cấu hình" });
  const db = readDB();
  res.json(db.sheetsConfig);
});

app.post("/api/sheets/config", (req, res) => {
  const user = authenticate(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ message: "Chỉ quản trị viên mới lưu cấu hình" });
  
  const { spreadsheetId, sheetName, syncEnabled } = req.body;
  const db = readDB();
  db.sheetsConfig = {
    spreadsheetId: spreadsheetId || "",
    sheetName: sheetName || "DanhSachDoiTuong",
    syncEnabled: !!syncEnabled,
    lastSyncedAt: db.sheetsConfig.lastSyncedAt
  };

  writeDB(db);
  res.json({ message: "Lưu cấu hình liên kết Google Sheets thành công", config: db.sheetsConfig });
});

// Live CSV export for Google Sheets sync or local Excel download
app.get("/api/sheets/export", (req, res) => {
  const db = readDB();
  
  // Create UTF-8 CSV with BOM for Vietnamese Excel support
  let csvContent = "\uFEFF";
  
  // Headers
  csvContent += "Mã Đối Tượng,Họ và Tên,Ngày Sinh,Giới Tính,CCCD,Quê Quán,Thông Tin Thân Nhân,Trung Tâm Quản Lý,Số Lần Vào Trung Tâm,Trạng Thái Hiện Tại,Ngày Vào Gần Nhất,Ngày Ra Gần Nhất,Ảnh Đối Tượng,Mã Trung Tâm,Người Tạo,Người Cập Nhật,Ngày Tạo,Ngày Cập Nhật,Lịch Sử Chi Tiết (JSON)\n";
  
  db.subjects.forEach(s => {
    const activeEntry = s.history[s.history.length - 1];
    const entryDateStr = activeEntry ? activeEntry.entryDate : "";
    const exitDateStr = activeEntry ? (activeEntry.exitDate || "") : "";
    const currentStatusStr = activeEntry ? (activeEntry.status === "ACTIVE" ? "Đang ở trung tâm" : "Đã về địa phương") : "Đã về địa phương";
    
    // Clean strings to prevent CSV breaking
    const name = s.fullName.replace(/"/g, '""');
    const cccd = s.cccd ? `'${s.cccd}` : ""; // Force string prefix
    const hometown = s.hometown.replace(/"/g, '""');
    const relatives = s.relativesInfo.replace(/"/g, '""');
    const center = s.centerName.replace(/"/g, '""');
    const gender = s.gender || "Nam";
    
    // Safety check: if image is extremely large (e.g. over 30,000 characters), we clear it on CSV export
    // to prevent Google Sheets from throwing "Your input contains more than the maximum of 50000 characters in a single cell"
    let image = s.image ? s.image.replace(/"/g, '""') : "";
    if (image.length > 30000) {
      image = ""; // Cleared for Sheets safety. The database keeps the local high-res image untouched!
    }
    
    const centerId = s.centerId ? s.centerId.replace(/"/g, '""') : "";
    const createdBy = s.createdBy ? s.createdBy.replace(/"/g, '""') : "";
    const updatedBy = s.updatedBy ? s.updatedBy.replace(/"/g, '""') : "";
    const createdAt = s.createdAt ? s.createdAt.replace(/"/g, '""') : "";
    const updatedAt = s.updatedAt ? s.updatedAt.replace(/"/g, '""') : "";
    const historyJson = JSON.stringify(s.history || []).replace(/"/g, '""');

    csvContent += `"${s.id}","${name}","${s.dob}","${gender}","${cccd}","${hometown}","${relatives}","${center}",${s.history.length},"${currentStatusStr}","${entryDateStr}","${exitDateStr}","${image}","${centerId}","${createdBy}","${updatedBy}","${createdAt}","${updatedAt}","${historyJson}"\n`;
  });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=danh-sach-doi-tuong-lang-thang.csv");
  res.send(csvContent);
});

// Live CSV export for registered user accounts
app.get("/api/sheets/export-users", (req, res) => {
  const db = readDB();
  
  let csvContent = "\uFEFF"; // UTF-8 BOM
  csvContent += "ID Cán Bộ,Tên Đăng Nhập,Họ và Tên,Email,Đơn Vị Công Tác,Chức Vụ,Trạng Thái Phê Duyệt,Ngày Đăng Ký,Mã Trung Tâm,Vai Trò,Phê Duyệt,Mật Khẩu Mã Hóa\n";
  
  db.users.forEach(u => {
    const fullName = u.fullName.replace(/"/g, '""');
    const email = u.email ? u.email.replace(/"/g, '""') : "";
    const centerName = u.centerName.replace(/"/g, '""');
    const roleName = u.role === "ADMIN" ? "Lãnh đạo Sở (ADMIN)" : "Cán bộ trung tâm (STAFF)";
    const approvedName = u.approved ? "Đã phê duyệt" : "Chờ phê duyệt";
    const dateStr = u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString();
    
    csvContent += `"${u.id}","${u.username}","${fullName}","${email}","${centerName}","${roleName}","${approvedName}","${dateStr}","${u.centerId}","${u.role}","${u.approved}","${u.passwordHash}"\n`;
  });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=danh-sach-can-bo.csv");
  res.send(csvContent);
});

// Robust CSV parser that splits an entire CSV string into rows and cells, correctly handling newlines inside quotes
function parseCSVDataIntoRows(csvData: string, delimiter: string = ","): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = "";
  let inQuotes = false;
  
  for (let i = 0; i < csvData.length; i++) {
    const char = csvData[i];
    
    if (char === '"') {
      if (inQuotes && csvData[i + 1] === '"') {
        currentVal += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentVal);
      currentVal = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      currentRow.push(currentVal);
      if (currentRow.length > 0 && (currentRow.length > 1 || currentRow[0] !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = "";
      if (char === '\r' && csvData[i + 1] === '\n') {
        i++;
      }
    } else {
      currentVal += char;
    }
  }
  
  if (currentVal !== "" || currentRow.length > 0) {
    currentRow.push(currentVal);
    rows.push(currentRow);
  }
  
  return rows;
}

// Keep a backward-compatible simple line parser just in case
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      let isEscaped = false;
      let slashCount = 0;
      let j = i - 1;
      while (j >= 0 && line[j] === '\\') {
        slashCount++;
        j--;
      }
      if (slashCount % 2 === 1) {
        isEscaped = true;
      }

      if (isEscaped) {
        current += '"';
      } else if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Resilient helper to convert date strings in various formats (DD/MM/YYYY, ISO, etc.) to YYYY-MM-DD
function formatDateToISO(dateStr: string): string {
  if (!dateStr) return "";
  const trimmed = dateStr.trim();
  if (!trimmed) return "";

  // If already YYYY-MM-DD
  if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(trimmed)) {
    return trimmed;
  }

  // If DD/MM/YYYY or D/M/YYYY
  const slashParts = trimmed.split("/");
  if (slashParts.length === 3) {
    const day = slashParts[0].padStart(2, "0");
    const month = slashParts[1].padStart(2, "0");
    let year = slashParts[2];
    if (year.length === 2) {
      year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    }
    if (/^[0-9]{4}$/.test(year) && /^[0-9]{2}$/.test(month) && /^[0-9]{2}$/.test(day)) {
      return `${year}-${month}-${day}`;
    }
  }

  // If DD-MM-YYYY or D-M-YYYY
  const dashParts = trimmed.split("-");
  if (dashParts.length === 3 && dashParts[0].length <= 2 && dashParts[2].length === 4) {
    const day = dashParts[0].padStart(2, "0");
    const month = dashParts[1].padStart(2, "0");
    const year = dashParts[2];
    return `${year}-${month}-${day}`;
  }

  // Handle ISO date-time strings
  if (trimmed.includes("T")) {
    const part = trimmed.split("T")[0];
    if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(part)) {
      return part;
    }
  }

  // Fallback try standard Date parsing
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  } catch (e) {}

  return trimmed;
}

// Resilient parser to parse the check-in history JSON string, correcting common typos, curly quotes, or extracting from plain text
function parseHistoryJSON(historyJSON: string): any[] {
  if (!historyJSON || historyJSON.trim() === "") {
    return [];
  }

  let toParse = historyJSON.trim();
  
  // Replace smart quotes (curly quotes) commonly inserted by Google Sheets, mobile devices, or Excel
  toParse = toParse.replace(/[“”„‟]/g, '"');
  toParse = toParse.replace(/[‘’‛′″]/g, '"');

  // Try parsing directly
  try {
    const parsed = JSON.parse(toParse);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") return [parsed];
  } catch (e) {}

  // Try unescaping surrounding quotes
  try {
    let cleaned = toParse;
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.substring(1, cleaned.length - 1);
    }
    cleaned = cleaned.replace(/""/g, '"').replace(/\\"/g, '"');
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") return [parsed];
  } catch (e) {}

  // Try raw backslash substitution
  try {
    const cleaned = toParse.replace(/\\"/g, '"').replace(/""/g, '"');
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") return [parsed];
  } catch (e) {}

  // Heavy recovery: Try regex to extract objects from array
  try {
    const objectMatches = toParse.match(/\{[^{}]*\}/g);
    if (objectMatches) {
      const parsedList: any[] = [];
      for (const objStr of objectMatches) {
        try {
          const parsedObj = JSON.parse(objStr);
          if (parsedObj && typeof parsedObj === 'object') {
            parsedList.push(parsedObj);
          }
        } catch (errObj) {
          // Regex key-value extractor fallback
          const entryDateMatch = objStr.match(/["']?entryDate["']?\s*:\s*["']?([0-9]{4}-[0-9]{2}-[0-9]{2})["']?/i);
          const exitDateMatch = objStr.match(/["']?exitDate["']?\s*:\s*["']?([0-9]{4}-[0-9]{2}-[0-9]{2})["']?/i);
          const reasonMatch = objStr.match(/["']?reason["']?\s*:\s*["']?([^"']+)["']?/i);
          const statusMatch = objStr.match(/["']?status["']?\s*:\s*["']?([A-Z_]+)["']?/i);
          const notesMatch = objStr.match(/["']?notes["']?\s*:\s*["']?([^"']+)["']?/i);

          if (entryDateMatch) {
            parsedList.push({
              id: `hist-extracted-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              entryDate: entryDateMatch[1],
              exitDate: exitDateMatch ? exitDateMatch[1] : null,
              reason: reasonMatch ? reasonMatch[1] : "Khôi phục từ chuỗi",
              status: statusMatch ? (statusMatch[1] === "RETURNED" ? "RETURNED" : "ACTIVE") : "ACTIVE",
              notes: notesMatch ? notesMatch[1] : "Phân tích tự động"
            });
          }
        }
      }
      if (parsedList.length > 0) return parsedList;
    }
  } catch (e) {}

  // Extract raw dates if all JSON parsing failed
  try {
    const dates = toParse.match(/[0-9]{4}-[0-9]{2}-[0-9]{2}/g);
    if (dates && dates.length > 0) {
      const parsedList: any[] = [];
      for (let i = 0; i < dates.length; i += 2) {
        const entryDate = dates[i];
        const exitDate = (i + 1 < dates.length) ? dates[i + 1] : null;
        parsedList.push({
          id: `hist-auto-${Date.now()}-${i}`,
          entryDate,
          exitDate,
          reason: "Khôi phục từ văn bản",
          status: exitDate ? "RETURNED" : "ACTIVE",
          notes: "Trích xuất ngày tự động"
        });
      }
      if (parsedList.length > 0) return parsedList;
    }
  } catch (e) {}

  return [];
}

// Helper to import CSV data into the database schema
function importCSVData(csvData: string, db: DatabaseSchema, user: User) {
  try {
    // Detect delimiter (tab vs comma) based on the first line
    let delimiter = ",";
    const firstNewlineIndex = csvData.indexOf("\n");
    const firstLine = firstNewlineIndex !== -1 ? csvData.substring(0, firstNewlineIndex) : csvData;
    if (firstLine.includes("\t") && (firstLine.split("\t").length > firstLine.split(",").length)) {
      delimiter = "\t";
    }

    const rows = parseCSVDataIntoRows(csvData, delimiter);
    if (rows.length < 2) {
      return { success: false, count: 0, message: "Dữ liệu trống hoặc không đúng định dạng" };
    }

    const clean = (str: string) => str.trim();
    const headers = rows[0].map(h => clean(h).replace(/^\uFEFF/, ""));

    let importedCount = 0;

    for (let i = 1; i < rows.length; i++) {
      const values = rows[i];
      if (values.length === 0 || (values.length === 1 && values[0] === "")) continue;

      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (index < values.length) {
          record[header] = values[index];
        }
      });

      // Flexible accent-insensitive and case-insensitive header getter
      const getRecordValue = (keys: string[]): string => {
        for (const key of keys) {
          if (record[key] !== undefined) return record[key];
        }
        
        const normalize = (s: string) => s.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "")
          .trim();
          
        const normalizedKeys = keys.map(normalize);
        for (const k of Object.keys(record)) {
          if (normalizedKeys.includes(normalize(k))) {
            return record[k];
          }
        }
        
        for (const key of keys) {
          const lowerKey = key.toLowerCase();
          for (const k of Object.keys(record)) {
            const lowerK = k.toLowerCase();
            if (lowerK.includes(lowerKey) || lowerKey.includes(lowerK)) {
              return record[k];
            }
          }
        }
        return "";
      };

      const id = clean(getRecordValue(["Mã Đối Tượng", "id", "mã đối tượng", "ID"]));
      const fullName = clean(getRecordValue(["Họ và Tên", "Họ và tên", "fullName", "Họ tên"]));
      const dob = clean(getRecordValue(["Ngày Sinh", "Ngày sinh", "dob"]));
      
      const dobISO = formatDateToISO(dob);
      if (!fullName || !dobISO) continue; // Skip incomplete records

      const rawGender = clean(getRecordValue(["Giới Tính", "Giới tính", "gender"]) || "Nam");
      const gender: "Nam" | "Nữ" | "Khác" = (rawGender === "Nữ" || rawGender === "Khác") ? rawGender : "Nam";
      
      const cccd = clean(getRecordValue(["Số CCCD", "CCCD", "cccd"])).replace(/^'/, "");
      const hometown = clean(getRecordValue(["Quê Quán", "Quê quán", "hometown"]) || "Không rõ");
      const relativesInfo = clean(getRecordValue(["Thông Tin Thân Nhân", "Thông tin thân nhân", "relativesInfo"]) || "Không rõ");
      const image = clean(getRecordValue(["Ảnh Đối Tượng", "Ảnh đối tượng", "image"]));
      const centerId = clean(getRecordValue(["Mã Trung Tâm", "centerId"]) || user.centerId);
      const centerName = clean(getRecordValue(["Trung Tâm Quản Lý", "Trung tâm quản lý", "centerName"]) || user.centerName);
      
      const createdBy = clean(getRecordValue(["Người Tạo", "createdBy"]) || user.id);
      const updatedBy = clean(getRecordValue(["Người Cập Nhật", "updatedBy"]) || user.id);
      const createdAt = clean(getRecordValue(["Ngày Tạo", "createdAt"]) || new Date().toISOString());
      const updatedAt = clean(getRecordValue(["Ngày Cập Nhật", "updatedAt"]) || new Date().toISOString());
      
      const historyJSON = clean(getRecordValue(["Lịch Sử Chi Tiết (JSON)", "Lịch sử chi tiết (JSON)", "history", "Lịch sử"]));
      let parsedHistory = parseHistoryJSON(historyJSON);

      const entryDateColRaw = clean(getRecordValue(["Ngày Vào Gần Nhất", "entryDate"]));
      const exitDateColRaw = clean(getRecordValue(["Ngày Ra Gần Nhất", "exitDate"]));
      const statusColStr = clean(getRecordValue(["Trạng Thái Hiện Tại", "status"]));
      
      const entryDateCol = formatDateToISO(entryDateColRaw);
      const exitDateCol = exitDateColRaw ? formatDateToISO(exitDateColRaw) : null;
      const statusCol: "ACTIVE" | "RETURNED" = (statusColStr.includes("địa phương") || statusColStr === "RETURNED" || exitDateCol !== null) ? "RETURNED" : "ACTIVE";

      // Reconcile changes from sheet columns directly with the history entries
      if (parsedHistory.length > 0) {
        // Find the latest history entry (chronologically, which is the last item in the array)
        const latestEntry = parsedHistory[parsedHistory.length - 1];
        
        if (entryDateCol) {
          if (latestEntry.entryDate === entryDateCol) {
            // Edit of the existing latest stay
            latestEntry.exitDate = exitDateCol;
            latestEntry.status = statusCol;
          } else {
            // If the entry date is different and is newer than the previous latest entry's entryDate/exitDate,
            // we assume the user added a NEW admission.
            const isNewStay = latestEntry.exitDate && entryDateCol > latestEntry.entryDate;
            
            if (isNewStay) {
              parsedHistory.push({
                id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                entryDate: entryDateCol,
                exitDate: exitDateCol,
                reason: "Đồng bộ ngược từ bảng tính (Lần vào mới)",
                status: statusCol,
                notes: "Tự động tạo mới do ngày vào gần nhất thay đổi"
              });
            } else {
              // Otherwise, update/correct the existing latest entry
              latestEntry.entryDate = entryDateCol;
              latestEntry.exitDate = exitDateCol;
              latestEntry.status = statusCol;
            }
          }
        }
      } else {
        // Fallback: construct history if empty or parsed history is not valid
        if (entryDateCol) {
          parsedHistory = [
            {
              id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              entryDate: entryDateCol,
              exitDate: exitDateCol,
              reason: "Đồng bộ ngược từ bảng tính",
              status: statusCol,
              notes: "Tự động khôi phục từ cột ngày vào/ngày ra"
            }
          ];
        } else {
          parsedHistory = [
            {
              id: `hist-${Date.now()}`,
              entryDate: new Date().toISOString().split("T")[0],
              exitDate: null,
              reason: "Đồng bộ ngược từ bảng tính",
              status: "ACTIVE",
              notes: "Khởi tạo tự động"
            }
          ];
        }
      }

      const existingIndex = db.subjects.findIndex(s => (id && s.id === id) || (cccd && s.cccd === cccd));
      
      // Safety preservation: keep the existing local high-resolution base64 image 
      // if the sheet has an empty value or a web placeholder image (which keeps image quality intact)
      let finalImage = image;
      if (existingIndex !== -1) {
        const localImg = db.subjects[existingIndex].image || "";
        if (localImg.startsWith("data:image/") && (!image || image.startsWith("http"))) {
          finalImage = localImg;
        }
      }

      if (existingIndex !== -1) {
        // Update existing subject
        db.subjects[existingIndex] = {
          id: db.subjects[existingIndex].id,
          fullName,
          dob: dobISO,
          gender,
          cccd,
          hometown,
          relativesInfo,
          image: finalImage,
          centerId,
          centerName,
          createdBy: db.subjects[existingIndex].createdBy || createdBy,
          updatedBy,
          createdAt: db.subjects[existingIndex].createdAt || createdAt,
          updatedAt,
          history: parsedHistory
        };
      } else {
        // Add new subject
        const finalId = id || `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        db.subjects.push({
          id: finalId,
          fullName,
          dob: dobISO,
          gender,
          cccd,
          hometown,
          relativesInfo,
          image: finalImage,
          centerId,
          centerName,
          createdBy,
          updatedBy,
          createdAt,
          updatedAt,
          history: parsedHistory
        });
      }
      importedCount++;
    }
    return { success: true, count: importedCount, message: `Đồng bộ thành công ${importedCount} đối tượng.` };
  } catch (err) {
    return { success: false, count: 0, message: "Lỗi phân tích dữ liệu: " + (err as Error).message };
  }
}

// Helper to import User (Staff) CSV data into database
function importUsersCSVData(csvData: string, db: DatabaseSchema) {
  try {
    let delimiter = ",";
    const firstNewlineIndex = csvData.indexOf("\n");
    const firstLine = firstNewlineIndex !== -1 ? csvData.substring(0, firstNewlineIndex) : csvData;
    if (firstLine.includes("\t") && (firstLine.split("\t").length > firstLine.split(",").length)) {
      delimiter = "\t";
    }

    const rows = parseCSVDataIntoRows(csvData, delimiter);
    if (rows.length < 2) {
      return { success: false, count: 0, message: "Dữ liệu cán bộ trống hoặc không đúng định dạng" };
    }

    const clean = (str: string) => str.trim();
    const headers = rows[0].map(h => clean(h).replace(/^\uFEFF/, ""));

    let importedCount = 0;

    for (let i = 1; i < rows.length; i++) {
      const values = rows[i];
      if (values.length === 0 || (values.length === 1 && values[0] === "")) continue;

      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (index < values.length) {
          record[header] = values[index];
        }
      });

      // Flexible accent-insensitive and case-insensitive header getter
      const getRecordValue = (keys: string[]): string => {
        for (const key of keys) {
          if (record[key] !== undefined) return record[key];
        }
        
        const normalize = (s: string) => s.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "")
          .trim();
          
        const normalizedKeys = keys.map(normalize);
        for (const k of Object.keys(record)) {
          if (normalizedKeys.includes(normalize(k))) {
            return record[k];
          }
        }
        
        for (const key of keys) {
          const lowerKey = key.toLowerCase();
          for (const k of Object.keys(record)) {
            const lowerK = k.toLowerCase();
            if (lowerK.includes(lowerKey) || lowerKey.includes(lowerK)) {
              return record[k];
            }
          }
        }
        return "";
      };

      const id = clean(getRecordValue(["ID Cán Bộ", "id", "ID"]));
      const username = clean(getRecordValue(["Tên Đăng Nhập", "username"]));
      const fullName = clean(getRecordValue(["Họ và Tên", "fullName", "Họ tên"]));
      const email = clean(getRecordValue(["Email", "email"]));
      const centerName = clean(getRecordValue(["Đơn Vị Công Tác", "centerName"]));
      const centerId = clean(getRecordValue(["Mã Trung Tâm", "Mã Đơn Vị", "centerId"]) || "httx");
      const roleStr = clean(getRecordValue(["Vai Trò", "role"]));
      
      const approvedStr = clean(getRecordValue(["Phê Duyệt", "approved", "Trạng Thái Phê Duyệt"]));
      let parsedApproved = false;
      if (approvedStr.toLowerCase() === "true" || approvedStr.toLowerCase().includes("đã phê duyệt") || approvedStr === "1") {
        parsedApproved = true;
      }

      const createdAt = clean(getRecordValue(["Ngày Đăng Ký", "Ngày Tạo", "createdAt"]) || new Date().toISOString());
      const passwordHash = clean(getRecordValue(["Mật Khẩu Mã Hóa", "passwordHash"]) || "staff123");

      if (!username || !fullName) continue;

      const existingIndex = db.users.findIndex(u => (id && u.id === id) || u.username === username);
      if (existingIndex !== -1) {
        // Prevent modifying the default admin account
        if (db.users[existingIndex].username === "admin") {
           continue;
        }

        // If the CSV column is empty, preserve the existing status/role. Otherwise use the parsed one.
        const finalApproved = approvedStr === "" ? db.users[existingIndex].approved : parsedApproved;
        const finalRole = roleStr === "" ? db.users[existingIndex].role : (roleStr.toUpperCase() === "ADMIN" ? "ADMIN" : "STAFF");
        
        db.users[existingIndex] = {
          id: db.users[existingIndex].id,
          username,
          fullName,
          email,
          role: finalRole,
          centerId,
          centerName,
          approved: finalApproved,
          createdAt: db.users[existingIndex].createdAt || createdAt,
          passwordHash: passwordHash || db.users[existingIndex].passwordHash || "staff123"
        };
      } else {
        const finalRole = roleStr.toUpperCase() === "ADMIN" ? "ADMIN" : "STAFF";
        const finalId = id || `usr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        db.users.push({
          id: finalId,
          username,
          fullName,
          email,
          role: finalRole,
          centerId,
          centerName,
          approved: parsedApproved,
          createdAt,
          passwordHash
        });
      }
      importedCount++;
    }
    return { success: true, count: importedCount, message: `Đồng bộ thành công ${importedCount} cán bộ.` };
  } catch (err) {
    return { success: false, count: 0, message: "Lỗi phân tích dữ liệu cán bộ: " + (err as Error).message };
  }
}

// Import endpoint to sync back from pasted Sheet CSV or TSV data
app.post("/api/sheets/import", (req, res) => {
  const user = authenticate(req);
  if (!user) return res.status(401).json({ message: "Chưa đăng nhập" });

  const { csvData } = req.body;
  if (!csvData) return res.status(400).json({ message: "Không tìm thấy dữ liệu để nhập" });

  const db = readDB();
  
  // Detect if the CSV data is for users or subjects
  const isUserCSV = csvData.includes("ID Cán Bộ") || csvData.includes("Tên Đăng Nhập") || csvData.includes("username");
  
  if (isUserCSV) {
    const result = importUsersCSVData(csvData, db);
    if (result.success) {
      writeDB(db);
      res.json({ message: result.message + " Đã khôi phục hoàn chỉnh danh sách cán bộ vào cơ sở dữ liệu." });
    } else {
      res.status(500).json({ message: result.message });
    }
  } else {
    const result = importCSVData(csvData, db, user);
    if (result.success) {
      writeDB(db);
      res.json({ message: result.message + " Đã thêm mới hoặc cập nhật các thông tin (kể cả ảnh và lịch sử) vào cơ sở dữ liệu." });
    } else {
      res.status(500).json({ message: result.message });
    }
  }
});

// RESTORE API: Fetches CSV directly from Google Sheet and restores/syncs the database
app.post("/api/sheets/restore", async (req, res) => {
  const user = authenticate(req);
  if (!user) return res.status(401).json({ message: "Chưa đăng nhập" });

  const db = readDB();
  const { spreadsheetId, sheetName, syncEnabled } = db.sheetsConfig;

  if (!spreadsheetId) {
    return res.status(400).json({ message: "Chưa cấu hình Spreadsheet ID trong phần cài đặt" });
  }

  let successCountSubjects = 0;
  let successCountUsers = 0;
  let errorMsgs: string[] = [];

  // A. Restore Subjects
  try {
    const urlSubjects = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName || "DanhSachDoiTuong")}`;
    const fetchResponse = await fetch(urlSubjects);
    if (fetchResponse.ok) {
      const csvData = await fetchResponse.text();
      if (!csvData.includes("<!DOCTYPE html") && !csvData.includes("<html")) {
        const result = importCSVData(csvData, db, user);
        if (result.success) {
          successCountSubjects = result.count;
        } else {
          errorMsgs.push("Lỗi đồng bộ tab Đối tượng: " + result.message);
        }
      } else {
        errorMsgs.push("Vui lòng đảm bảo Google Sheet ở chế độ công khai: 'Bất kỳ ai có đường liên kết đều có thể xem'!");
      }
    } else {
      errorMsgs.push(`Không thể tải dữ liệu Đối tượng (Mã lỗi HTTP ${fetchResponse.status})`);
    }
  } catch (err) {
    errorMsgs.push("Lỗi tải tab Đối tượng: " + (err as Error).message);
  }

  // B. Restore Users
  try {
    const urlUsers = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("DanhSachCanBo")}`;
    const fetchResponse = await fetch(urlUsers);
    if (fetchResponse.ok) {
      const csvData = await fetchResponse.text();
      if (!csvData.includes("<!DOCTYPE html") && !csvData.includes("<html")) {
        const result = importUsersCSVData(csvData, db);
        if (result.success) {
          successCountUsers = result.count;
        } else {
          errorMsgs.push("Lỗi đồng bộ tab Cán bộ: " + result.message);
        }
      }
    } else {
      errorMsgs.push(`Không thể tải dữ liệu Cán bộ (Mã lỗi HTTP ${fetchResponse.status})`);
    }
  } catch (err) {
    errorMsgs.push("Lỗi tải tab Cán bộ: " + (err as Error).message);
  }

  if (successCountSubjects > 0 || successCountUsers > 0) {
    writeDB(db);
    let msg = `Khôi phục thành công! Đã đồng bộ `;
    if (successCountSubjects > 0) msg += `${successCountSubjects} đối tượng`;
    if (successCountSubjects > 0 && successCountUsers > 0) msg += " và ";
    if (successCountUsers > 0) msg += `${successCountUsers} cán bộ`;
    msg += ` trực tiếp từ Google Sheet.`;
    
    if (errorMsgs.length > 0) {
      msg += ` Có cảnh báo phụ: ${errorMsgs.join("; ")}`;
    }
    res.json({ message: msg });
  } else {
    res.status(400).json({ message: "Không có dữ liệu nào được đồng bộ. " + errorMsgs.join("; ") });
  }
});

// Auto-restore database from Google Sheet on server startup
async function autoRestoreFromSheetsOnBoot() {
  const db = readDB();
  const { spreadsheetId, sheetName, syncEnabled } = db.sheetsConfig;
  if (syncEnabled && spreadsheetId) {
    console.log(`[Auto-Restore] Khởi động: Đang tự động khôi phục dữ liệu từ Google Sheet (${spreadsheetId})...`);
    
    let subjectsSuccess = false;
    let usersSuccess = false;

    // Fetch subjects
    try {
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName || "DanhSachDoiTuong")}`;
      const response = await fetch(url);
      if (response.ok) {
        const csvData = await response.text();
        if (!csvData.includes("<!DOCTYPE html") && !csvData.includes("<html")) {
          const systemUser = db.users[0]; // Admin user context
          const result = importCSVData(csvData, db, systemUser);
          if (result.success) {
            subjectsSuccess = true;
            console.log(`[Auto-Restore] Thành công! Đã tự động khôi phục ${result.count} đối tượng từ Google Sheet.`);
          }
        }
      }
    } catch (err) {
      console.error(`[Auto-Restore] Lỗi khôi phục đối tượng:`, err);
    }

    // Fetch users
    try {
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("DanhSachCanBo")}`;
      const response = await fetch(url);
      if (response.ok) {
        const csvData = await response.text();
        if (!csvData.includes("<!DOCTYPE html") && !csvData.includes("<html")) {
          const result = importUsersCSVData(csvData, db);
          if (result.success) {
            usersSuccess = true;
            console.log(`[Auto-Restore] Thành công! Đã tự động khôi phục ${result.count} cán bộ từ Google Sheet.`);
          }
        }
      }
    } catch (err) {
      console.error(`[Auto-Restore] Lỗi khôi phục cán bộ:`, err);
    }

    if (subjectsSuccess || usersSuccess) {
      writeDB(db);
    }
  }
}

// --------------------------------------------------
// VITE DEV SERVER / PRODUCTION CONFIGURATION
// --------------------------------------------------
async function startServer() {
  await initFirestore();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running in ${process.env.NODE_ENV || "development"} mode on http://localhost:${PORT}`);
    // Auto restore database from Google Sheet if configured
    autoRestoreFromSheetsOnBoot();
  });
}

startServer();

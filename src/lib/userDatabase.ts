/**
 * User Database — local-first user registration, authentication, and data ownership
 * All data stored in localStorage. Zero external dependencies. Fully local.
 * Users own their data completely — full export/import support.
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  company: string;
  role: "admin" | "user";
  createdAt: string;
  updatedAt: string;
  lastLogin: string;
  passwordHash: string;
  salt: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  defaultCampaignId: string;
  apiBase: string;
  theme: "dark" | "light";
  emailSignature: string;
  notifications: boolean;
}

export interface UserSession {
  token: string;
  userId: string;
  username: string;
  displayName: string;
  role: string;
  createdAt: string;
  expiresAt: string;
}

export interface DataExport {
  version: string;
  exportedAt: string;
  exportedBy: string;
  user: Omit<User, "passwordHash" | "salt">;
  data: {
    businessProfile: any;
    targetMarkets: any[];
    pitches: any[];
    approvals: any;
    investorDeck: any;
    emailTemplates: any[];
    sentEmails: any[];
    sequences: any[];
    adCampaigns: any[];
    contacts: any[];
    researchDossiers: any[];
    savedDecisionMakers: any[];
    crmData: any;
    analytics: any;
  };
}

// ─── Storage Keys ────────────────────────────────────────────────────

const DB_KEYS = {
  users: "sw_users",
  sessions: "sw_sessions",
  currentUser: "sw_current_user",
  preferences: "sw_preferences",
} as const;

// ─── Crypto Helpers (lightweight, no external deps) ─────────────────

function generateSalt(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let salt = "";
  for (let i = 0; i < 16; i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return salt;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// ─── Low-level Storage ───────────────────────────────────────────────

function getStorage<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* silent */ }
  return [];
}

function setStorage<T>(key: string, data: T[]): void {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* silent */ }
}

// ─── User CRUD ───────────────────────────────────────────────────────

export async function registerUser(input: {
  username: string;
  password: string;
  email: string;
  displayName: string;
  company: string;
}): Promise<{ success: boolean; user?: User; error?: string }> {
  const users = getStorage<User>(DB_KEYS.users);

  // Validate
  if (!input.username || input.username.length < 3) {
    return { success: false, error: "Username must be at least 3 characters" };
  }
  if (!input.password || input.password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters" };
  }
  if (!input.email || !input.email.includes("@")) {
    return { success: false, error: "Valid email required" };
  }
  if (users.some(u => u.username.toLowerCase() === input.username.toLowerCase())) {
    return { success: false, error: "Username already taken" };
  }
  if (users.some(u => u.email.toLowerCase() === input.email.toLowerCase())) {
    return { success: false, error: "Email already registered" };
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(input.password, salt);
  const now = new Date().toISOString();

  const user: User = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    username: input.username,
    email: input.email,
    displayName: input.displayName || input.username,
    company: input.company || "",
    role: users.length === 0 ? "admin" : "user", // First user is admin
    createdAt: now,
    updatedAt: now,
    lastLogin: now,
    passwordHash,
    salt,
    preferences: {
      defaultCampaignId: "",
      apiBase: "",
      theme: "dark",
      emailSignature: "",
      notifications: true,
    },
  };

  users.push(user);
  setStorage(DB_KEYS.users, users);

  // Create session
  const session = createSession(user);
  storeSession(session);
  storeCurrentUser(user);

  return { success: true, user: { ...user, passwordHash: "", salt: "" } as User };
}

export async function loginUser(
  usernameOrEmail: string,
  password: string
): Promise<{ success: boolean; user?: Omit<User, "passwordHash" | "salt">; error?: string }> {
  const users = getStorage<User>(DB_KEYS.users);
  const user = users.find(
    u =>
      u.username.toLowerCase() === usernameOrEmail.toLowerCase() ||
      u.email.toLowerCase() === usernameOrEmail.toLowerCase()
  );

  if (!user) {
    return { success: false, error: "Invalid username or password" };
  }

  const hash = await hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    return { success: false, error: "Invalid username or password" };
  }

  // Update last login
  user.lastLogin = new Date().toISOString();
  setStorage(
    DB_KEYS.users,
    users.map(u => (u.id === user.id ? user : u))
  );

  // Create session
  const session = createSession(user);
  storeSession(session);
  storeCurrentUser(user);

  const { passwordHash: _, salt: __, ...safeUser } = user;
  return { success: true, user: safeUser };
}

export function logoutUser(): void {
  const sessions = getStorage<UserSession>(DB_KEYS.sessions);
  const current = getStorage<{ token: string }>(DB_KEYS.currentUser)[0];
  if (current) {
    setStorage(
      DB_KEYS.sessions,
      sessions.filter(s => s.token !== current.token)
    );
  }
  localStorage.removeItem(DB_KEYS.currentUser);
}

export function getCurrentUser(): Omit<User, "passwordHash" | "salt"> | null {
  try {
    const raw = localStorage.getItem(DB_KEYS.currentUser);
    if (!raw) return null;
    const current = JSON.parse(raw);
    if (!current || !current.id) return null;

    // Validate session
    const sessions = getStorage<UserSession>(DB_KEYS.sessions);
    const validSession = sessions.find(
      s => s.token === current.token && new Date(s.expiresAt) > new Date()
    );
    if (!validSession) {
      localStorage.removeItem(DB_KEYS.currentUser);
      return null;
    }

    const users = getStorage<User>(DB_KEYS.users);
    const user = users.find(u => u.id === current.id);
    if (!user) return null;

    const { passwordHash: _, salt: __, ...safeUser } = user;
    return safeUser;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

export function updateUserProfile(
  userId: string,
  updates: Partial<Pick<User, "displayName" | "email" | "company" | "preferences">>
): { success: boolean; error?: string } {
  const users = getStorage<User>(DB_KEYS.users);
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return { success: false, error: "User not found" };

  users[idx] = { ...users[idx], ...updates, updatedAt: new Date().toISOString() };
  setStorage(DB_KEYS.users, users);

  // Update current user cache
  const current = getCurrentUser();
  if (current && current.id === userId) {
    storeCurrentUser(users[idx]);
  }

  return { success: true };
}

export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (newPassword.length < 6) {
    return { success: false, error: "New password must be at least 6 characters" };
  }

  const users = getStorage<User>(DB_KEYS.users);
  const user = users.find(u => u.id === userId);
  if (!user) return { success: false, error: "User not found" };

  const oldHash = await hashPassword(oldPassword, user.salt);
  if (oldHash !== user.passwordHash) {
    return { success: false, error: "Current password is incorrect" };
  }

  const newSalt = generateSalt();
  user.passwordHash = await hashPassword(newPassword, newSalt);
  user.salt = newSalt;
  user.updatedAt = new Date().toISOString();

  setStorage(
    DB_KEYS.users,
    users.map(u => (u.id === userId ? user : u))
  );

  return { success: true };
}

// ─── Session Management ──────────────────────────────────────────────

function createSession(user: User): UserSession {
  const now = Date.now();
  const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days
  return {
    token: generateToken(),
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + expiresIn).toISOString(),
  };
}

function storeSession(session: UserSession): void {
  const sessions = getStorage<UserSession>(DB_KEYS.sessions);
  // Remove expired sessions
  const now = new Date();
  const valid = sessions.filter(s => new Date(s.expiresAt) > now);
  valid.push(session);
  setStorage(DB_KEYS.sessions, valid);
}

function storeCurrentUser(user: User): void {
  const { passwordHash: _, salt: __, ...safeUser } = user;
  try {
    localStorage.setItem(DB_KEYS.currentUser, JSON.stringify(safeUser));
  } catch { /* silent */ }
}

// ─── Data Ownership: Export / Import ─────────────────────────────────

export function exportAllUserData(userId: string): DataExport | null {
  const users = getStorage<User>(DB_KEYS.users);
  const user = users.find(u => u.id === userId);
  if (!user) return null;

  const { passwordHash: _, salt: __, ...safeUser } = user;

  return {
    version: "2.5",
    exportedAt: new Date().toISOString(),
    exportedBy: user.username,
    user: safeUser as any,
    data: {
      businessProfile: loadFromStorage("sw_business"),
      targetMarkets: loadFromStorage("sw_markets") || [],
      pitches: loadFromStorage("sw_pitches") || [],
      approvals: loadFromStorage("sw_approvals"),
      investorDeck: loadFromStorage("sw_investor_deck"),
      emailTemplates: loadFromStorage("sw_email_templates") || [],
      sentEmails: loadFromStorage("sw_sent_emails") || [],
      sequences: loadFromStorage("sw_email_sequences") || [],
      adCampaigns: loadFromStorage("sw_ad_campaigns") || [],
      contacts: loadFromStorage("sw_contacts") || [],
      researchDossiers: loadFromStorage("sw_research_dossiers") || [],
      savedDecisionMakers: loadFromStorage("sw_saved_decision_makers") || [],
      crmData: loadFromStorage("sw_crm_data"),
      analytics: loadFromStorage("sw_analytics"),
    },
  };
}

export function importUserData(exportData: DataExport): { success: boolean; error?: string } {
  try {
    // Validate
    if (!exportData.version || !exportData.data) {
      return { success: false, error: "Invalid export file" };
    }

    const data = exportData.data;
    if (data.businessProfile) saveToStorage("sw_business", data.businessProfile);
    if (data.targetMarkets) saveToStorage("sw_markets", data.targetMarkets);
    if (data.pitches) saveToStorage("sw_pitches", data.pitches);
    if (data.approvals) saveToStorage("sw_approvals", data.approvals);
    if (data.investorDeck) saveToStorage("sw_investor_deck", data.investorDeck);
    if (data.emailTemplates) saveToStorage("sw_email_templates", data.emailTemplates);
    if (data.sentEmails) saveToStorage("sw_sent_emails", data.sentEmails);
    if (data.sequences) saveToStorage("sw_email_sequences", data.sequences);
    if (data.adCampaigns) saveToStorage("sw_ad_campaigns", data.adCampaigns);
    if (data.contacts) saveToStorage("sw_contacts", data.contacts);
    if (data.researchDossiers) saveToStorage("sw_research_dossiers", data.researchDossiers);
    if (data.savedDecisionMakers) saveToStorage("sw_saved_decision_makers", data.savedDecisionMakers);
    if (data.crmData) saveToStorage("sw_crm_data", data.crmData);
    if (data.analytics) saveToStorage("sw_analytics", data.analytics);

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Import failed" };
  }
}

export function downloadDataExport(userId: string): void {
  const data = exportAllUserData(userId);
  if (!data) return;

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `squidweave-export-${data.exportedBy}-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── User List (admin) ───────────────────────────────────────────────

export function listAllUsers(): Omit<User, "passwordHash" | "salt">[] {
  const users = getStorage<User>(DB_KEYS.users);
  return users.map(({ passwordHash: _, salt: __, ...safe }) => safe as User);
}

export function deleteUser(userId: string): boolean {
  const users = getStorage<User>(DB_KEYS.users);
  const filtered = users.filter(u => u.id !== userId);
  if (filtered.length === users.length) return false;
  setStorage(DB_KEYS.users, filtered);
  return true;
}

export function getUserCount(): number {
  return getStorage<User>(DB_KEYS.users).length;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function loadFromStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* silent */ }
  return null;
}

function saveToStorage<T>(key: string, value: T): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* silent */ }
}

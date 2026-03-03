// ─── Auth & User ────────────────────────────────────────────────

export type Role = 'ADMIN' | 'USER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ─── Subscription & Packages ────────────────────────────────────

export type PackageName = 'FREE' | 'SILVER' | 'GOLD' | 'DIAMOND';

export type FileType = 'IMAGE' | 'VIDEO' | 'PDF' | 'AUDIO';

export interface SubscriptionPackage {
  id: string;
  name: PackageName;
  displayName: string;
  description?: string;
  maxFolders: number;
  maxNestingLevel: number;
  allowedFileTypes: FileType[];
  maxFileSizeMB: number;
  totalFileLimit: number;
  filesPerFolder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    userSubscriptions: number;
  };
}

export interface UserSubscription {
  id: string;
  userId: string;
  packageId: string;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
  createdAt: string;
  package: SubscriptionPackage;
}

export interface StorageStats {
  totalFolders: number;
  totalFiles: number;
  totalStorageBytes: number;
  totalStorageMB: number;
}

export interface ActiveSubscriptionResponse {
  subscription: UserSubscription | null;
  stats: StorageStats;
}

// ─── Folders ────────────────────────────────────────────────────

export interface Folder {
  id: string;
  name: string;
  userId: string;
  parentId: string | null;
  nestingLevel: number;
  createdAt: string;
  updatedAt: string;
  parent?: {
    id: string;
    name: string;
  } | null;
  subfolders?: Folder[];
  _count?: {
    subfolders: number;
    files: number;
  };
}

export interface BreadcrumbItem {
  id: string;
  name: string;
}

export interface CreateFolderRequest {
  name: string;
  parentId?: string;
}

// ─── Files ──────────────────────────────────────────────────────

export interface FileItem {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  fileType: FileType;
  size: number;
  path: string;
  folderId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  folder?: {
    id: string;
    name: string;
  };
}

// ─── Admin ──────────────────────────────────────────────────────

export interface AdminDashboardStats {
  totalUsers: number;
  totalFiles: number;
  totalFolders: number;
  totalStorageGB: number;
  planDistribution: PlanDistribution[];
}

export interface PlanDistribution {
  name: PackageName;
  displayName: string;
  count: number;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isEmailVerified: boolean;
  createdAt: string;
  _count: {
    files: number;
    folders: number;
  };
  subscriptions: UserSubscription[];
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── API Response Wrappers ──────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── Forms ──────────────────────────────────────────────────────

export interface PackageFormData {
  name: PackageName;
  displayName: string;
  description: string;
  maxFolders: number;
  maxNestingLevel: number;
  allowedFileTypes: FileType[];
  maxFileSizeMB: number;
  totalFileLimit: number;
  filesPerFolder: number;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

// ─── UI ─────────────────────────────────────────────────────────

export interface ContextMenuItem {
  icon?: any;
  label: string;
  action: () => void;
  danger?: boolean;
}

export interface RenameItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
}

// ─── Constants ──────────────────────────────────────────────────

export const TIER_COLORS: Record<PackageName, string> = {
  FREE: '#8888a8',
  SILVER: '#94a3b8',
  GOLD: '#f59e0b',
  DIAMOND: '#818cf8',
};

export const FILE_TYPE_COLORS: Record<FileType, string> = {
  IMAGE: '#10b981',
  VIDEO: '#ef4444',
  AUDIO: '#f59e0b',
  PDF: '#3b82f6',
};

export const FILE_TYPE_LABELS: Record<FileType, string> = {
  IMAGE: 'Image',
  VIDEO: 'Video',
  AUDIO: 'Audio',
  PDF: 'PDF',
};
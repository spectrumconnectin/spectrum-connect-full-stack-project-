const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/backend';

// ── Token helpers ────────────────────────────────────────────────────────────
const COOKIE_NAME = 'spectrum_token';
const REMEMBER_ME_KEY = 'spectrum_remember_me';

function setCookie(token: string, rememberMe: boolean = false) {
  // 30 days if "Remember me" is checked, otherwise 7 days
  const daysToExpire = rememberMe ? 30 : 7;
  const expires = new Date(Date.now() + daysToExpire * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + COOKIE_NAME + '=([^;]+)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function clearCookie() {
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export const tokenStore = {
  get: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(COOKIE_NAME) || getCookie();
  },
  set: (token: string, rememberMe: boolean = false) => {
    localStorage.setItem(COOKIE_NAME, token);
    if (rememberMe) {
      localStorage.setItem(REMEMBER_ME_KEY, 'true');
    } else {
      localStorage.removeItem(REMEMBER_ME_KEY);
    }
    setCookie(token, rememberMe);
  },
  isRemembered: (): boolean => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(REMEMBER_ME_KEY) === 'true';
  },
  clear: () => {
    localStorage.removeItem(COOKIE_NAME);
    localStorage.removeItem(REMEMBER_ME_KEY);
    clearCookie();
  },
};

// ── Core fetch wrapper ───────────────────────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = tokenStore.get();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    if (res.status === 401) {
      tokenStore.clear();
      // Redirect to login on the client side (skip during SSR)
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      throw new Error('HTTP_401');
    }
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    let msg: string;
    if (typeof body.detail === 'string') {
      msg = body.detail;
    } else if (Array.isArray(body.detail)) {
      // Pydantic v2 validation errors — format into readable bullet list
      msg = body.detail
        .map((e: { loc?: string[]; msg?: string }) => {
          const field = e.loc ? e.loc.filter(l => l !== 'body').join('.') : '';
          return field ? `${field}: ${e.msg}` : e.msg ?? 'Validation error';
        })
        .join('\n');
    } else {
      msg = body.detail?.message ?? body.message ?? `HTTP ${res.status}`;
    }
    throw new Error(msg || `HTTP ${res.status}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Auth types ───────────────────────────────────────────────────────────────
export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterResponse {
  id: string;
  email: string;
  username: string;
  account_type: string;
  dev_otp?: string;
}

export interface MeResponse {
  id: string;
  email: string;
  username: string;
  phone_number?: string;
  account_type: string;
  user_role: string;
  is_verified: boolean;
  is_online?: boolean;
  last_seen?: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    display_name?: string;
    headline?: string;
    tagline?: string;
    bio?: string;
    profile_picture?: string;
    cover_image?: string;
    website?: string;
    location?: { city?: string; country?: string; state?: string };
    social_links?: { linkedin?: string; imdb?: string; vimeo?: string; portfolio?: string };
    skills?: { name: string; level?: string }[];
    experience?: object[];
    education?: object[];
    certifications?: object[];
    hourly_rate_min?: number;
    hourly_rate_max?: number;
  };
  settings?: {
    email_notifications?: boolean;
    push_notifications?: boolean;
    sms_notifications?: boolean;
    marketing_emails?: boolean;
    profile_visibility?: string;
    show_location?: boolean;
    show_earnings?: boolean;
    two_factor_auth?: boolean;
  };
  stats?: object;
}

// ── Authentication ───────────────────────────────────────────────────────────
export const auth = {
  login: async (email: string, password: string, rememberMe: boolean = false): Promise<LoginResponse> => {
    const form = new URLSearchParams();
    form.append('username', email);
    form.append('password', password);
    const data = await request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: form.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }, false);
    tokenStore.set(data.access_token, rememberMe);
    return data;
  },

  register: async (payload: {
    email: string;
    username: string;
    password: string;
    phone_number: string;
    phone_country_code?: string;
    account_type: string;
    name?: string;
  }): Promise<RegisterResponse> =>
    request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, false),

  sendOtp: async (email: string, purpose = 'verification') =>
    request<{ success: boolean; message: string; dev_otp?: string }>('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ email, purpose }),
    }, false),

  verifyOtp: async (email: string, otp: string) =>
    request<{ success: boolean; message: string }>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }, false),

  forgotPassword: async (email: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }, false),

  resetPassword: async (token: string, new_password: string) =>
    request<{ message: string }>('/auth/reset-password/confirm', {
      method: 'POST',
      body: JSON.stringify({ token, new_password }),
    }, false),

  me: (): Promise<MeResponse> => request<MeResponse>('/auth/me/role'),

  logout: () => tokenStore.clear(),

  googleLogin: () => { window.location.href = `${BASE_URL}/auth/google_login`; },
};

// ── Profile types matching backend schemas ────────────────────────────────────
export interface ProfileUpdate {
  first_name?: string;
  last_name?: string;
  display_name?: string;
  profile_picture?: string;
  cover_image?: string;
  bio?: string;
  tagline?: string;
  headline?: string;
  website?: string;
  location?: { city?: string; country?: string; state?: string };
  social_links?: { linkedin?: string; imdb?: string; vimeo?: string; portfolio?: string };
  hourly_rate_min?: number;
  hourly_rate_max?: number;
  availability_status?: string;
  availability_label?: string;
}

export interface ExperienceCreate {
  title: string;
  company?: string;
  location?: string;
  start_date: string;
  end_date?: string;
  current?: boolean;
  description?: string;
}

export interface EducationCreate {
  degree: string;
  institution: string;
  field_of_study?: string;
  start_date: string;
  end_date?: string;
  description?: string;
}

export interface CertificationCreate {
  name: string;
  issuing_organization: string;
  issue_date: string;
  expiry_date?: string;
  credential_id?: string;
  credential_url?: string;
}

export interface UserProfileUpdate {
  username?: string;
  profile?: ProfileUpdate;
}

export interface UserSettingsUpdate {
  email_notifications?: boolean;
  push_notifications?: boolean;
  sms_notifications?: boolean;
  marketing_emails?: boolean;
  profile_visibility?: string;
  availability_status?: string;
  show_location?: boolean;
  show_earnings?: boolean;
  two_factor_auth?: boolean;
}

// ── Notifications ─────────────────────────────────────────────────────────────
export interface NotificationItem {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  action_url?: string;
  action_text?: string;
  actor_name?: string;
  actor_image?: string;
  is_read: boolean;
  created_at?: string;
}

export const notifications = {
  getAll: (limit = 20): Promise<{ notifications: NotificationItem[]; unread_count: number }> =>
    request(`/header/notifications?limit=${limit}`),

  markAllRead: (): Promise<{ success: boolean }> =>
    request('/header/notifications/read-all', { method: 'POST' }),

  markOneRead: (id: string): Promise<{ success: boolean }> =>
    request(`/header/notifications/${id}/read`, { method: 'POST' }),

  send: (data: {
    user_id: string;
    type: string;
    category: string;
    title: string;
    message: string;
    action_url?: string;
    action_text?: string;
  }): Promise<{ success: boolean }> =>
    request('/header/notifications/send', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Profile ──────────────────────────────────────────────────────────────────
export const profile = {
  getMe: (): Promise<MeResponse> => request<MeResponse>('/profiles/me'),

  updateMe: (data: UserProfileUpdate): Promise<MeResponse> =>
    request<MeResponse>('/profiles/me', { method: 'PUT', body: JSON.stringify(data) }),

  updateSettings: (data: UserSettingsUpdate): Promise<object> =>
    request('/profiles/me/settings', { method: 'PUT', body: JSON.stringify(data) }),

  updateProfilePicture: (picture_url: string): Promise<object> =>
    request('/profiles/me/profile-picture', { method: 'PUT', body: JSON.stringify({ picture_url }) }),

  updateCoverImage: (cover_url: string): Promise<object> =>
    request('/profiles/me/cover-image', { method: 'PUT', body: JSON.stringify({ cover_url }) }),

  uploadAvatar: async (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append('file', file);
    return request<{ url: string }>('/upload/avatar', { method: 'POST', body: form });
  },

  uploadCover: async (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append('file', file);
    return request<{ url: string }>('/upload/cover', { method: 'POST', body: form });
  },

  addSkill: (data: { name: string; level?: string; years_of_experience?: number }) =>
    request('/profiles/me/skills', { method: 'POST', body: JSON.stringify(data) }),

  deleteSkill: (index: number) =>
    request(`/profiles/me/skills/${index}`, { method: 'DELETE' }),

  addExperience: (data: ExperienceCreate) =>
    request('/profiles/me/experience', { method: 'POST', body: JSON.stringify(data) }),

  updateExperience: (index: number, data: Partial<ExperienceCreate>) =>
    request(`/profiles/me/experience/${index}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteExperience: (index: number) =>
    request(`/profiles/me/experience/${index}`, { method: 'DELETE' }),

  addEducation: (data: EducationCreate) =>
    request('/profiles/me/education', { method: 'POST', body: JSON.stringify(data) }),

  updateEducation: (index: number, data: Partial<EducationCreate>) =>
    request(`/profiles/me/education/${index}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteEducation: (index: number) =>
    request(`/profiles/me/education/${index}`, { method: 'DELETE' }),

  addCertification: (data: CertificationCreate) =>
    request('/profiles/me/certifications', { method: 'POST', body: JSON.stringify(data) }),

  updateCertification: (index: number, data: Partial<CertificationCreate>) =>
    request(`/profiles/me/certifications/${index}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteCertification: (index: number) =>
    request(`/profiles/me/certifications/${index}`, { method: 'DELETE' }),

  getPublic: (userId: string): Promise<PublicProfile> => request<PublicProfile>(`/profiles/${userId}`),
};

// ── Account Settings ─────────────────────────────────────────────────────────
export const account = {
  getSettings: () => request('/account/settings'),

  updateProfile: (data: object) =>
    request('/account/profile', { method: 'PATCH', body: JSON.stringify(data) }),

  updateEmail: (new_email: string) =>
    request('/account/email', { method: 'PATCH', body: JSON.stringify({ new_email }) }),

  updatePassword: (current_password: string, new_password: string) =>
    request('/account/password', {
      method: 'PATCH',
      body: JSON.stringify({ current_password, new_password }),
    }),

  updatePhone: (new_phone: string) =>
    request('/account/phone', { method: 'PATCH', body: JSON.stringify({ new_phone }) }),

  updateNotifications: (data: object) =>
    request('/account/notifications', { method: 'PATCH', body: JSON.stringify(data) }),

  updatePrivacy: (data: { profile_visibility?: string; show_location?: boolean; show_earnings?: boolean; two_factor_auth?: boolean }) =>
    request('/account/privacy', { method: 'PATCH', body: JSON.stringify(data) }),

  deactivate: () => request('/account/deactivate', { method: 'DELETE' }),
};

// ── Dashboard types ──────────────────────────────────────────────────────────
export interface CreatorDashboardStats {
  name: string;
  total_earnings: number;
  active_projects: number;
  projects_completed: number;
  client_satisfaction: number;
  response_time_hours: number;
}

export interface DashboardOpportunity {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  skills: string[];
  match_percent: number;
  department?: string;
  budget_type?: string;
  budget_min?: number;
  budget_max?: number;
  deadline?: string;
}

export interface DashboardActiveTeam {
  project_id: string;
  title: string;
  role?: string;
  status?: string;
  time_remaining_days?: number;
  avatar_urls: string[];
}

export interface DashboardMessage {
  id: string;
  name: string;
  text?: string;
  timestamp?: string;
  avatar?: string;
}

export interface DashboardTask {
  id: string;
  title: string;
  project_name?: string;
  due_date?: string;
  priority?: string;
  status?: string;
}

export interface CreatorDashboardResponse {
  stats: CreatorDashboardStats;
  opportunities: DashboardOpportunity[];
  active_teams: DashboardActiveTeam[];
  messages: DashboardMessage[];
  tasks: DashboardTask[];
}

export interface ClientDashboardJob {
  id: string;
  title: string;
  description?: string;
  status: string;
  tags: string[];
  deadline?: string;
  proposal_count: number;
  budget?: { min?: number; max?: number };
  workspace?: { progress: number; roles_required: number; roles_filled: number };
}

export interface ClientDashboardResponse {
  jobs: ClientDashboardJob[];
  activity_feed: { id: string; type: string; message: string; actor_name: string; created_at: string }[];
  messages: DashboardMessage[];
  deadlines: { id: string; title: string; project_title: string; due_date: string; priority: string; days_remaining: number }[];
  community_spotlight: { id: string; title: string; creator_name: string; category?: string; tags?: string[] }[];
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboard = {
  getCreator: (): Promise<CreatorDashboardResponse> =>
    request<CreatorDashboardResponse>('/creator/dashboard'),

  getClient: (): Promise<ClientDashboardResponse> =>
    request<ClientDashboardResponse>('/client/dashboard'),
};

// ── Job Postings ──────────────────────────────────────────────────────────────
export interface JobPostItem {
  id: string;
  client_id: string;
  title: string;
  description?: string;
  department: string;
  role?: string;
  tags: string[];
  crew_size: string;
  complexity: string;
  budget_type: string;
  budget?: { min?: number; max?: number; currency?: string };
  hourly_rate?: { min?: number; max?: number };
  daily_rate?: { min?: number; max?: number };
  weekly_rate?: { min?: number; max?: number };
  duration?: string;
  estimated_duration?: number;
  start_date?: string;
  deadline?: string;
  skills?: string[];
  experience_level: string;
  status: string;
  proposal_count: number;
  view_count: number;
  cover_image?: string;
  published_at?: string;
  created_at?: string;
  workspace?: { progress: number; roles_required: number; roles_filled: number };
  location?: string;
  goals?: string[];
  deliverables?: string[];
}

export interface JobSearchResponse {
  total: number;
  skip: number;
  limit: number;
  jobs: JobPostItem[];
}

export interface JobCreatePayload {
  title: string;
  description: string;
  department: string;
  role?: string;
  tags?: string[];
  crew_size?: string;
  complexity?: string;
  budget_type?: string;
  budget?: { min?: number; max?: number };
  hourly_rate?: { min?: number; max?: number };
  daily_rate?: { min?: number; max?: number };
  weekly_rate?: { min?: number; max?: number };
  duration?: string;
  estimated_duration?: number;
  skills?: string[];
  experience_level?: string;
  goals?: string[];
  deliverables?: string[];
  status?: string;
}

function buildQS(params: Record<string, string | number | undefined>): string {
  const filtered = Object.fromEntries(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '' && v !== null)
      .map(([k, v]) => [k, String(v)])
  );
  return Object.keys(filtered).length ? '?' + new URLSearchParams(filtered).toString() : '';
}

export const jobs = {
  search: (params?: Record<string, string | number | undefined>): Promise<JobSearchResponse> =>
    request<JobSearchResponse>(`/jobs/search${buildQS(params || {})}`),

  getMe: (status?: string): Promise<JobPostItem[]> =>
    request<JobPostItem[]>(`/jobs/me${status ? `?status_filter=${encodeURIComponent(status)}` : ''}`),

  getById: (id: string): Promise<JobPostItem> =>
    request<JobPostItem>(`/jobs/${id}`),

  create: (data: JobCreatePayload): Promise<JobPostItem> =>
    request<JobPostItem>('/jobs', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<JobCreatePayload>): Promise<JobPostItem> =>
    request<JobPostItem>(`/jobs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  updateStatus: (id: string, status: string): Promise<JobPostItem> =>
    request<JobPostItem>(`/jobs/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  delete: (id: string): Promise<void> =>
    request<void>(`/jobs/${id}`, { method: 'DELETE' }),
};

// ── Service Listings ──────────────────────────────────────────────────────────
export interface ServicePackage {
  name: string;
  description: string;
  price: number;
  delivery_time: number;
  revisions: number;
  features: string[];
  is_active?: boolean;
}

export interface ServiceItem {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description?: string;
  department: string;
  role?: string;
  tags: string[];
  packages: ServicePackage[];
  stats: { orders: number; completed_orders: number; revenue: number; views: number };
  rating: { overall: number; total_reviews: number };
  status: string;
  is_premium: boolean;
}

export interface ServiceCreatePayload {
  title: string;
  description: string;
  department: string;
  role?: string;
  tags: string[];
  packages: Array<{
    name: string;
    description: string;
    price: number;
    delivery_time: number;
    revisions: number;
    features: string[];
  }>;
}

export const services = {
  getMe: (status?: string): Promise<ServiceItem[]> =>
    request<ServiceItem[]>(`/services/me${status ? `?status_filter=${encodeURIComponent(status)}` : ''}`),

  getById: (id: string): Promise<ServiceItem> =>
    request<ServiceItem>(`/services/${id}`),

  create: (data: ServiceCreatePayload): Promise<ServiceItem> =>
    request<ServiceItem>('/services', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<ServiceCreatePayload>): Promise<ServiceItem> =>
    request<ServiceItem>(`/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  updateStatus: (id: string, status: string): Promise<ServiceItem> =>
    request<ServiceItem>(`/services/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  delete: (id: string): Promise<void> =>
    request<void>(`/services/${id}`, { method: 'DELETE' }),
};

// ── Talent Discovery ──────────────────────────────────────────────────────────
export interface TalentItem {
  id: string;
  name: string;
  title?: string;
  location?: string;
  avatar?: string;
  skills: string[];
  hourly_rate_min?: number;
  hourly_rate_max?: number;
  rating?: number;
  review_count?: number;
  etf_level?: string;
  availability_status?: string;
  portfolio_has_video?: boolean;
  portfolio_item_count?: number;
}

export const talent = {
  search: (params?: { q?: string; location?: string; skill?: string; limit?: number }): Promise<{ talent: TalentItem[] }> =>
    request<{ talent: TalentItem[] }>(`/talent/search${buildQS(params as Record<string, string | number | undefined> || {})}`),
};

// ── Public Profile ────────────────────────────────────────────────────────────

export interface PublicSkill    { name: string; level?: string; years_of_experience?: number }
export interface PublicExp      { title: string; company?: string; location?: string; start_date?: string; end_date?: string; current?: boolean; description?: string }
export interface PublicEdu      { degree: string; institution: string; field_of_study?: string; start_date?: string; end_date?: string }
export interface PublicCert     { name: string; issuing_organization: string; issue_date?: string }

export interface PublicProfile {
  id: string;
  username: string;
  account_type: string;
  is_verified: boolean;
  availability_status?: string;
  availability_label?: string;
  rating?: number;
  review_count?: number;
  profile?: {
    first_name?: string;
    last_name?: string;
    display_name?: string;
    profile_picture?: string;
    cover_image?: string;
    bio?: string;
    tagline?: string;
    headline?: string;
    website?: string;
    location?: { city?: string; country?: string; state?: string };
    social_links?: { linkedin?: string; imdb?: string; vimeo?: string; portfolio?: string };
    hourly_rate_min?: number;
    hourly_rate_max?: number;
    skills?: PublicSkill[];
    experience?: PublicExp[];
    education?: PublicEdu[];
    certifications?: PublicCert[];
  };
  stats?: {
    active_projects?: number;
    success_rate?: number;
    response_time?: number;
    profile_views?: number;
    total_connections?: number;
    completed_credits?: number;
  };
}

// ── Creator Projects ──────────────────────────────────────────────────────────

export interface ProjectTeamMember {
  user_id: string;
  username: string;
  avatar_url?: string;
  role: string;
  joined_at?: string;
  invitation_status?: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  description?: string;
  client_id: string;
  status: string;
  progress_percentage: number;
  team_members: ProjectTeamMember[];
  total_roles: number;
  filled_roles: number;
  tags: string[];
  category?: string;
  icon_type?: string;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
  budget_min?: number;
  budget_max?: number;
  location?: string;
  job_post_id?: string;
}

export interface ProjectListResponse {
  projects: ProjectItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface ActivityLogItem {
  id: string;
  activity_type: string;
  project_id: string;
  project_title?: string;
  actor_id?: string;
  actor_name?: string;
  actor_avatar?: string;
  message: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface DeadlineItem {
  id: string;
  project_id: string;
  project_title: string;
  title: string;
  description?: string;
  due_date: string;
  priority: string;
  status: string;
  days_remaining: number;
  assigned_to: string[];
  created_by: string;
  created_at: string;
  completed_at?: string;
}

export const creatorProjects = {
  list: (params?: { status?: string; search?: string; page?: number }): Promise<ProjectListResponse> =>
    request<ProjectListResponse>(`/projects${buildQS(params as Record<string, string | number | undefined> || {})}`),

  getById: (id: string): Promise<ProjectItem> =>
    request<ProjectItem>(`/projects/${id}`),

  getActivity: (id: string, limit = 20): Promise<ActivityLogItem[]> =>
    request<ActivityLogItem[]>(`/projects/${id}/activity?limit=${limit}`),

  updateProgress: (id: string, progress_percentage: number): Promise<ProjectItem> =>
    request<ProjectItem>(`/projects/${id}/progress`, {
      method: 'PATCH',
      body: JSON.stringify({ progress_percentage }),
    }),

  create: (data: {
    title: string;
    description: string;
    category: string;
    tags?: string[];
    budget_min?: number;
    budget_max?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<ProjectItem> =>
    request<ProjectItem>('/projects', { method: 'POST', body: JSON.stringify({ ...data, icon_type: 'film', is_public: false, total_roles: 1 }) }),

  getDeadlines: (projectId: string): Promise<{ deadlines: DeadlineItem[]; total: number }> =>
    request(`/projects/${projectId}/deadlines`),

  createDeadline: (data: {
    project_id: string;
    title: string;
    description?: string;
    due_date: string;
    priority?: string;
  }): Promise<DeadlineItem> =>
    request<DeadlineItem>('/projects/deadlines', { method: 'POST', body: JSON.stringify(data) }),

  deleteDeadline: (deadlineId: string): Promise<void> =>
    request<void>(`/projects/deadlines/${deadlineId}`, { method: 'DELETE' }),

  completeDeadline: (deadlineId: string): Promise<DeadlineItem> =>
    request<DeadlineItem>(`/projects/deadlines/${deadlineId}/complete`, { method: 'POST' }),
};

// ── Earnings ──────────────────────────────────────────────────────────────────

export interface EarningTransaction {
  id: string;
  transaction_id: string;
  type: string;
  amount: number;
  net_amount: number;
  platform_fee: number;           // total platform take (creator_fee + client_fee)
  creator_fee?: number;           // deducted from this creator's payout
  client_fee?: number;            // added to the client's charge (informational)
  commission_version?: string;
  currency: string;
  status: string;
  payment_method?: string;
  from_user_id?: string;
  initiated_at?: string;
  completed_at?: string;
  description?: string;
  project_title?: string;
  milestone_title?: string;
}

export interface EarningsStats {
  total_earned: number;
  pending: number;
  this_month: number;
  monthly_breakdown: { month: string; amount: number }[];
  transaction_count: number;
}

export const earnings = {
  getTransactions: (params?: { status?: string; type?: string; limit?: number; skip?: number }): Promise<EarningTransaction[]> =>
    request<EarningTransaction[]>(`/earnings/me${buildQS(params as Record<string, string | number | undefined> || {})}`),

  getStats: (): Promise<EarningsStats> =>
    request<EarningsStats>('/earnings/stats'),
};

// ── Proposals ─────────────────────────────────────────────────────────────────

export interface ProposalItem {
  id: string;
  job_id: string;
  job_title: string;
  job_department: string;
  job_status: string;
  client_id?: string;
  cover_letter: string;
  proposed_budget?: number;
  role?: string;
  status: string; // submitted | shortlisted | interviewing | accepted | rejected | withdrawn
  submitted_at?: string;
}

export interface JobProposalItem {
  id: string;
  creator_id: string;
  creator_name: string;
  creator_avatar?: string;
  creator_title?: string;
  creator_location?: string;
  creator_skills: string[];
  cover_letter: string;
  proposed_budget?: number;
  role?: string;
  status: string;
  client_viewed: boolean;
  submitted_at?: string;
}

export interface ProposalSubmitPayload {
  cover_letter: string;
  proposed_budget?: number;
  role?: string;
  proposed_duration?: number;
}

export const proposals = {
  submit: (jobId: string, data: ProposalSubmitPayload): Promise<{ id: string; status: string; job_id: string }> =>
    request(`/proposals/${jobId}`, { method: 'POST', body: JSON.stringify(data) }),

  getMe: (): Promise<ProposalItem[]> =>
    request<ProposalItem[]>('/proposals/me'),

  getForJob: (jobId: string): Promise<JobProposalItem[]> =>
    request<JobProposalItem[]>(`/proposals/job/${jobId}`),

  updateStatus: (proposalId: string, status: string): Promise<{ id: string; status: string }> =>
    request(`/proposals/${proposalId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  withdraw: (proposalId: string): Promise<void> =>
    request<void>(`/proposals/${proposalId}`, { method: 'DELETE' }),

  rate: (proposalId: string, data: {
    ratings: Record<string, number>;
    review: string;
    tags?: string[];
    private_note?: string;
  }): Promise<{ success: boolean; message: string }> =>
    request(`/proposals/${proposalId}/rate`, { method: 'POST', body: JSON.stringify(data) }),

  directHire: (data: {
    job_id: string;
    creator_id: string;
    note?: string;
  }): Promise<{ id: string; status: string; job_id: string; already_hired?: boolean }> =>
    request('/proposals/direct-hire', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Escrow & Payments ─────────────────────────────────────────────────────────

export interface EscrowMilestone {
  milestone_id: string;
  title: string;
  amount: number;
  status: string; // pending | funded | released | disputed | refunded
  funded_at?: string;
  released_at?: string;
  refunded_at?: string;
  release_transaction_id?: string;
  deadline_id?: string;
  /** Per-milestone fee breakdown (v1 8/4 commission). */
  fees?: CommissionBreakdown;
}

export interface EscrowFeesSummary {
  subtotal: number;
  client_fee_total: number;
  creator_fee_total: number;
  platform_take_total: number;
  client_charge_total: number;
  creator_payout_total: number;
  commission_version: string;
}

export interface EscrowUserBrief {
  user_id: string;
  username: string;
  profile_picture?: string;
}

export interface EscrowDetail {
  escrow_id: string;
  status: string; // active | completed | disputed | refunded | cancelled
  total_amount: number;
  funded_amount: number;
  released_amount: number;
  refunded_amount: number;
  currency: string;
  description?: string;
  project_id?: string;
  client?: EscrowUserBrief;
  creator?: EscrowUserBrief;
  milestones: EscrowMilestone[];
  /** Aggregated v1 8/4 commission summary across all milestones. */
  fees_summary?: EscrowFeesSummary;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface EscrowListItem {
  escrow_id: string;
  status: string;
  total_amount: number;
  funded_amount: number;
  released_amount: number;
  currency: string;
  project_id?: string;
  job_post_id?: string;
  client_id: string;
  creator_id: string;
  milestone_count: number;
  funded_milestones: number;
  released_milestones: number;
  created_at: string;
}

export interface EscrowListResponse {
  escrows: EscrowListItem[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export const escrow = {
  list: (params?: { role?: string; status_filter?: string; limit?: number; offset?: number }): Promise<EscrowListResponse> =>
    request<EscrowListResponse>(`/escrow/my-escrows${buildQS(params as Record<string, string | number | undefined> || {})}`),

  getById: (id: string): Promise<EscrowDetail> =>
    request<EscrowDetail>(`/escrow/${id}`),

  create: (data: {
    creator_id: string;
    milestones: Array<{ title: string; amount: number; currency?: string }>;
    job_post_id?: string;
    project_id?: string;
    description?: string;
    currency?: string;
  }): Promise<{ escrow_id: string; status: string; total_amount: number; milestones: Array<{ milestone_id: string; title: string; amount: number; status: string }> }> =>
    request('/escrow/', { method: 'POST', body: JSON.stringify(data) }),

  fundMilestone: (escrowId: string, milestoneId: string): Promise<{ success: boolean; funded_amount: number; transaction_id?: string; mock_transaction_id?: string }> =>
    request(`/escrow/${escrowId}/fund-milestone`, {
      method: 'POST',
      body: JSON.stringify({ milestone_id: milestoneId }),
    }),

  refund: (escrowId: string, reason: string): Promise<{ success: boolean; refund_amount: number; transaction_id?: string }> =>
    request(`/escrow/${escrowId}/refund`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  releaseMilestone: (escrowId: string, milestoneId: string): Promise<{ success: boolean; escrow_id: string; message: string; creator_payout?: number; fees?: CommissionBreakdown }> =>
    request(`/escrow/${escrowId}/release-milestone`, {
      method: 'POST',
      body: JSON.stringify({ milestone_id: milestoneId }),
    }),

  deliverMilestone: (escrowId: string, milestoneId: string): Promise<{ success: boolean; milestone_id: string; status: string }> =>
    request(`/escrow/${escrowId}/milestone/${milestoneId}/deliver`, { method: 'POST' }),

  requestRevision: (escrowId: string, milestoneId: string): Promise<{ success: boolean; milestone_id: string; status: string }> =>
    request(`/escrow/${escrowId}/milestone/${milestoneId}/request-revision`, { method: 'POST' }),
};

// ── Commission (v1 split 8/4) ────────────────────────────────────────────────
// Mirrors app/services/commission_service.py::CommissionBreakdown.
export interface CommissionBreakdown {
  project_subtotal: number;
  creator_fee: number;
  client_fee: number;
  platform_take: number;
  client_total: number;
  creator_payout: number;
  commission_version: string;
  currency: string;
}

export const commission = {
  /** Preview platform fees for a hypothetical subtotal. No auth required. */
  preview: (subtotal: number, currency = 'USD'): Promise<CommissionBreakdown> =>
    request<CommissionBreakdown>('/billing/commission/preview', {
      method: 'POST',
      body: JSON.stringify({ subtotal, currency }),
    }, false),
};

// ── Portfolio ─────────────────────────────────────────────────────────────────

export interface PortfolioItem {
  id: string;
  type: 'video' | 'image';
  media_type: 'youtube' | 'vimeo' | 'mp4' | 'jpg' | 'png' | 'webp';
  url: string;
  thumbnail?: string;
  title: string;
  description?: string;
  created_at: string;
}

export interface PortfolioResponse {
  items: PortfolioItem[];
  video_count: number;
  image_count: number;
  max_videos: number;
  max_images: number;
}

export interface PortfolioItemCreate {
  url: string;
  title: string;
  description?: string;
  thumbnail?: string;
}

export interface PortfolioItemUpdate {
  title?: string;
  description?: string;
  thumbnail?: string;
}

export const portfolio = {
  getMe: (): Promise<PortfolioResponse> =>
    request<PortfolioResponse>('/portfolio/me'),

  getPublic: (userId: string): Promise<PortfolioResponse> =>
    request<PortfolioResponse>(`/portfolio/${userId}`, {}, false),

  addItem: (data: PortfolioItemCreate): Promise<PortfolioItem> =>
    request<PortfolioItem>('/portfolio/items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateItem: (itemId: string, data: PortfolioItemUpdate): Promise<PortfolioItem> =>
    request<PortfolioItem>(`/portfolio/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteItem: (itemId: string): Promise<void> =>
    request<void>(`/portfolio/items/${itemId}`, { method: 'DELETE' }),
};

// ── ETF Points (Earn Trust Framework) ────────────────────────────────────────
// All units are POINTS. The internal USD value of points is intentionally
// never returned by the backend and must never be inferred client-side.

export type EtfLevelName = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface EtfLevelInfo {
  name: EtfLevelName;
  label: string;
  icon: string;            // Font Awesome class hint, e.g. "fa-medal"
  color: string;           // Hex color hint
  min_points: number;
  next_min_points: number | null;
  progress_pct: number;    // 0–100 distance to the next level
}

export interface EtfBalance {
  user_id: string;
  balance: number;
  lifetime_points: number;
  redeemed_points: number;
  level: EtfLevelInfo;
  updated_at?: string;
}

export interface EtfEvent {
  id: string;
  action: string;          // e.g. "milestone.released.creator"
  points: number;          // positive = earned, negative = spent
  balance_after: number;
  source_type?: string;
  source_id?: string;
  description: string;
  created_at: string;
}

export interface EtfEventsResponse {
  events: EtfEvent[];
  skip: number;
  limit: number;
}

export interface EtfCashoutEligibility {
  eligible: boolean;
  reasons: string[];
  balance: number;
  min_points: number;
  account_age_days: number;
  min_account_age_days: number;
}

export const etfPoints = {
  /** Authenticated read: my current balance, level, badge, progress. */
  me: (): Promise<EtfBalance> => request<EtfBalance>('/etf/me'),

  /** Authenticated read: paginated activity feed. */
  events: (params?: { limit?: number; skip?: number }): Promise<EtfEventsResponse> =>
    request<EtfEventsResponse>(`/etf/me/events${buildQS(params as Record<string, string | number | undefined> || {})}`),

  /** Public read: just the level info for a user — used by cards and chips. */
  badge: (userId: string): Promise<EtfLevelInfo> =>
    request<EtfLevelInfo>(`/etf/badge/${userId}`, {}, false),

  /** Authenticated read: cash-out eligibility report. */
  cashoutEligibility: (): Promise<EtfCashoutEligibility> =>
    request<EtfCashoutEligibility>('/etf/me/cashout'),

  /** Authenticated write: request a cash-out (admin reviews; Phase 1 stub). */
  requestCashout: (points: number): Promise<{ success: boolean; requested_points: number; message: string }> =>
    request('/etf/me/cashout', { method: 'POST', body: JSON.stringify({ points }) }),
};

// ── Disputes ──────────────────────────────────────────────────────────────────

export interface DisputeListItem {
  dispute_id: string;
  escrow_id: string;
  status: string; // open | under_review | resolved_creator_favor | resolved_client_favor | escalated
  reason: string;
  raised_by: string;
  raised_against: string;
  resolution_type?: string;
  created_at: string;
  resolved_at?: string;
  evidence_count: number;
}

export interface DisputeListResponse {
  disputes: DisputeListItem[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export const disputes = {
  getMyDisputes: (params?: { status_filter?: string; limit?: number; offset?: number }): Promise<DisputeListResponse> =>
    request<DisputeListResponse>(`/disputes/my-disputes${buildQS(params as Record<string, string | number | undefined> || {})}`),

  create: (data: { escrow_id: string; reason: string; details?: string; milestone_id?: string }): Promise<{ success?: boolean; dispute_id?: string; message?: string }> =>
    request('/disputes', { method: 'POST', body: JSON.stringify(data) }),
};


// ── Skill Challenges ──────────────────────────────────────────────────────────

export interface SkillChallengeItem {
  challenge_id: string;
  title: string;
  description: string;
  skill_category: string;
  difficulty: string;
  challenge_type: string;
  badge_level: string;
  pass_threshold: number;
  time_limit_minutes?: number;
  submission_count: number;
  average_score: number;
  pass_rate: number;
  criteria_count: number;
  created_at: string;
}

export interface SkillChallengeListResponse {
  challenges: SkillChallengeItem[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface SkillBadge {
  badge_id: string;
  skill_name: string;
  badge_level: string;
  challenge_title: string;
  challenge_difficulty?: string;
  awarded_at: string;
  expires_at?: string;
  is_active: boolean;
}

export interface SkillBadgeListResponse {
  badges: SkillBadge[];
  total: number;
}

export interface SkillSubmissionItem {
  submission_id: string;
  challenge_id: string;
  challenge_title: string;
  skill_category?: string;
  difficulty?: string;
  evaluation_status: string; // pending | evaluating | passed | failed
  overall_score?: number;
  pass_threshold: number;
  badge_awarded: boolean;
  attempt_number: number;
  submitted_at: string;
  evaluated_at?: string;
}

export interface SkillSubmissionListResponse {
  submissions: SkillSubmissionItem[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export const skillChallenges = {
  list: (params?: { skill_category?: string; difficulty?: string; limit?: number; offset?: number }): Promise<SkillChallengeListResponse> =>
    request<SkillChallengeListResponse>(`/skill-challenges${buildQS(params as Record<string, string | number | undefined> || {})}`),

  getMyBadges: (active_only = true): Promise<SkillBadgeListResponse> =>
    request<SkillBadgeListResponse>(`/skill-challenges/my-badges?active_only=${active_only}`),

  getMySubmissions: (params?: { status_filter?: string; limit?: number }): Promise<SkillSubmissionListResponse> =>
    request<SkillSubmissionListResponse>(`/skill-challenges/my-submissions${buildQS(params as Record<string, string | number | undefined> || {})}`),

  submit: (challengeId: string, value: string, content_type = 'link', notes?: string): Promise<{ success?: boolean; message?: string; submission_id?: string }> =>
    request(`/skill-challenges/${challengeId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ content_type, value, notes }),
    }),
};

// ── Messaging ─────────────────────────────────────────────────────────────────

export interface ConversationParticipant {
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  is_online: boolean;
  last_seen?: string;
}

export interface ConversationItem {
  id: string;
  participants: ConversationParticipant[];
  job_id?: string;
  job_title?: string;
  last_message?: string;
  last_message_at?: string;
  last_message_sender_id?: string;
  created_at: string;
  conversation_type: string;
  unread_count: number;
  is_archived: boolean;
}

export interface ConversationListResponse {
  conversations: ConversationItem[];
  active_projects: ConversationItem[];
  recent: ConversationItem[];
  total: number;
}

export interface MessageAttachmentItem {
  id: string;
  filename: string;
  file_size: number;
  file_type: string;
  file_url: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface MessageItem {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  attachments: MessageAttachmentItem[];
  sent_at: string;
  edited_at?: string;
  is_deleted: boolean;
  read_by: string[];
  message_type: string;
}

export interface MessageListResponse {
  messages: MessageItem[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export const messaging = {
  listConversations: (params?: { limit?: number; offset?: number; include_archived?: boolean }): Promise<ConversationListResponse> =>
    request<ConversationListResponse>(`/messages/conversations${buildQS(params as Record<string, string | number | undefined> || {})}`),

  getMessages: (conversationId: string, params?: { limit?: number; before_message_id?: string }): Promise<MessageListResponse> =>
    request<MessageListResponse>(`/messages/conversations/${conversationId}/messages${buildQS(params as Record<string, string | number | undefined> || {})}`),

  send: (conversationId: string, content: string): Promise<MessageItem> =>
    request<MessageItem>('/messages', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId, content }),
    }),

  createConversation: (participantIds: string[], jobId?: string, initialMessage?: string): Promise<ConversationItem> =>
    request<ConversationItem>('/messages/conversations', {
      method: 'POST',
      body: JSON.stringify({ participant_ids: participantIds, job_id: jobId, initial_message: initialMessage }),
    }),

  markAsRead: (conversationId: string): Promise<void> =>
    request<void>(`/messages/conversations/${conversationId}/read`, { method: 'POST' }),
};

// ── Smart Connect ─────────────────────────────────────────────────────────────

export interface CreatorSmartMatch {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  skills: string[];
  match_percent: number;
  budget_type?: string;
  budget_min?: number;
  budget_max?: number;
  client_name?: string;
  client_avatar?: string;
  project_type?: string;
  roles_open?: number;
  created_at?: string;
}

export interface CreatorSmartConnectResponse {
  matches: CreatorSmartMatch[];
}

export interface SmartCreativeProfile {
  user_id: string;
  name: string;
  title: string;
  role?: string;
  avatar?: string;
  location?: string | { city?: string; country?: string };
  rating: number;
  total_reviews: number;
  skills: string[];
  specializations: string[];
  bio?: string;
  daily_rate?: number;
  availability?: string;
  active_project_count: number;
  workload_capacity: number;
  trust_tier: string;
  workload_score: number;
  trust_score: number;
  /** ETF Points level — bronze/silver/gold/platinum. Inline so cards
   *  don't need an N+1 fetch to render the badge. */
  etf_level?: EtfLevelName;
  portfolio_item_count?: number;
  portfolio_has_video?: boolean;
}

export interface SmartMatchResultItem {
  profile: SmartCreativeProfile;
  match_score: number;
  match_level: string;
  match_reasons: string[];
}

export interface SmartMatchApiResponse {
  matches: SmartMatchResultItem[];
  total_matches: number;
  search_criteria: Record<string, unknown>;
}

export interface CreativeSearchApiResponse {
  creatives: SmartCreativeProfile[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface SavedProfilesApiResponse {
  profiles: SmartCreativeProfile[];
  total: number;
}

export const smartConnect = {
  getCreatorMatches: (limit = 9): Promise<CreatorSmartConnectResponse> =>
    request<CreatorSmartConnectResponse>(`/creator/smart-connect?limit=${limit}`),

  search: (data: {
    query?: string;
    roles?: string[];
    skills?: string[];
    location?: string;
    min_rating?: number;
    max_rate?: number;
    limit?: number;
    offset?: number;
  }): Promise<CreativeSearchApiResponse> =>
    request<CreativeSearchApiResponse>('/smart-connect/search', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  match: (data: {
    project_description: string;
    project_type: string;
    roles_needed?: string[];
    skills_required?: string[];
    location?: string;
    is_remote?: boolean;
    timeline?: string;
  }): Promise<SmartMatchApiResponse> =>
    request<SmartMatchApiResponse>('/smart-connect/match', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  matchForProject: (jobId: string, limit = 12): Promise<SmartMatchApiResponse> =>
    request<SmartMatchApiResponse>(`/smart-connect/match-for-project/${jobId}?limit=${limit}`),

  getFeatured: (limit = 6): Promise<SavedProfilesApiResponse> =>
    request<SavedProfilesApiResponse>(`/smart-connect/featured?limit=${limit}`, {}, false),

  getSaved: (): Promise<SavedProfilesApiResponse> =>
    request<SavedProfilesApiResponse>('/smart-connect/saved'),

  save: (profile_user_id: string): Promise<{ success?: boolean; message?: string }> =>
    request('/smart-connect/save', {
      method: 'POST',
      body: JSON.stringify({ profile_user_id }),
    }),

  updateCapacity: (capacity: number): Promise<{ success: boolean; capacity: number; active_project_count: number; message: string }> =>
    request('/smart-connect/workload-capacity', {
      method: 'PATCH',
      body: JSON.stringify({ capacity }),
    }),

  recordHistory: (data: {
    match_title: string;
    match_subtitle?: string;
    match_avatar?: string;
    match_score?: number;
    match_user_id?: string;
    match_job_id?: string;
    action: 'applied' | 'invited' | 'saved' | 'messaged';
  }): Promise<{ success: boolean }> =>
    request('/smart-connect/history/record', { method: 'POST', body: JSON.stringify(data) }),

  getHistory: (): Promise<{ history: MatchHistoryItem[] }> =>
    request('/smart-connect/history'),
};

export interface MatchHistoryItem {
  id: string;
  match_title: string;
  match_subtitle?: string;
  match_avatar?: string;
  match_score?: number;
  match_user_id?: string;
  match_job_id?: string;
  action: string;
  created_at: string;
}

// ── Admin Panel ───────────────────────────────────────────────────────────────

export interface AdminStats {
  users: { total: number; creators: number; clients: number; admins: number; verified: number; suspended: number; new_last_30_days: number };
  escrow: { total_volume_usd: number; platform_fees_usd: number; active_count: number; completed_count: number; disputed_count: number };
  etf: { total_points_awarded: number; platinum_users: number; gold_users: number };
}

export interface AdminUser {
  id: string; email: string; username: string; account_type: string; user_role: string;
  is_verified: boolean; is_active: boolean; created_at: string;
  display_name: string; profile_picture: string; trust_score: number; trust_tier: string;
  profile?: { bio?: string; tagline?: string; location?: string; skills?: string[]; hourly_rate_min?: number; hourly_rate_max?: number; portfolio_item_count?: number };
}

export interface AdminUsersResponse { total: number; page: number; page_size: number; has_more: boolean; users: AdminUser[] }

export interface AdminJob { id: string; title: string; status: string; client_id: string; department: string; proposal_count: number; created_at: string; published_at?: string }
export interface AdminJobsResponse { total: number; page: number; page_size: number; has_more: boolean; jobs: AdminJob[] }

export interface AdminDispute { id: string; escrow_id?: string; status: string; reason?: string; opened_by?: string; created_at: string }
export interface AdminDisputesResponse { total: number; page: number; page_size: number; has_more: boolean; disputes: AdminDispute[] }

export interface AdminTransaction { id: string; status: string; type?: string; amount: number; currency: string; platform_fee: number; client_id?: string; creator_id?: string; created_at: string }
export interface AdminTransactionsResponse { total: number; page: number; page_size: number; has_more: boolean; transactions: AdminTransaction[] }

export interface AdminEtfStats { total_accounts: number; total_lifetime_points: number; total_redeemed_points: number; level_breakdown: Record<string, number> }

export const adminApi = {
  getStats: (): Promise<AdminStats> => request<AdminStats>('/admin/stats'),
  getUsers: (params?: { page?: number; page_size?: number; search?: string; account_type?: string; user_role?: string; is_verified?: boolean; is_active?: boolean }): Promise<AdminUsersResponse> =>
    request<AdminUsersResponse>(`/admin/users${buildQS(params as Record<string, string | number | undefined> || {})}`),
  getUser: (id: string): Promise<AdminUser> => request<AdminUser>(`/admin/users/${id}`),
  updateRole: (id: string, user_role: string): Promise<{id: string; user_role: string}> =>
    request(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ user_role }) }),
  suspendUser: (id: string): Promise<{id: string; is_active: boolean}> =>
    request(`/admin/users/${id}/suspend`, { method: 'PATCH' }),
  activateUser: (id: string): Promise<{id: string; is_active: boolean}> =>
    request(`/admin/users/${id}/activate`, { method: 'PATCH' }),
  toggleVerify: (id: string): Promise<{id: string; is_verified: boolean}> =>
    request(`/admin/users/${id}/verify`, { method: 'PATCH' }),
  getJobs: (params?: { page?: number; page_size?: number; search?: string; status?: string }): Promise<AdminJobsResponse> =>
    request<AdminJobsResponse>(`/admin/jobs${buildQS(params as Record<string, string | number | undefined> || {})}`),
  updateJobStatus: (id: string, status: string): Promise<{id: string; status: string}> =>
    request(`/admin/jobs/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getDisputes: (params?: { page?: number; page_size?: number; status?: string }): Promise<AdminDisputesResponse> =>
    request<AdminDisputesResponse>(`/admin/disputes${buildQS(params as Record<string, string | number | undefined> || {})}`),
  getTransactions: (params?: { page?: number; page_size?: number; status?: string }): Promise<AdminTransactionsResponse> =>
    request<AdminTransactionsResponse>(`/admin/transactions${buildQS(params as Record<string, string | number | undefined> || {})}`),
  getEtfStats: (): Promise<AdminEtfStats> => request<AdminEtfStats>('/admin/etf/stats'),
};

// ── User Presence ────────────────────────────────────────────────────────────
export const presence = {
  setOnline: (): Promise<{ status: string; user_id: string }> =>
    request(`/presence/online`, { method: 'POST' }),
  setOffline: (): Promise<{ status: string; user_id: string }> =>
    request(`/presence/offline`, { method: 'POST' }),
  updateActivity: (): Promise<{ status: string; user_id: string }> =>
    request(`/presence/activity`, { method: 'POST' }),
  getPresence: (userId: string): Promise<{ user_id: string; is_online: boolean; last_seen: string | null }> =>
    request(`/presence/${userId}`),
};

const api = { auth, profile, account, dashboard, jobs, services, talent, creatorProjects, earnings, proposals, escrow, disputes, etfPoints, commission, skillChallenges, messaging, smartConnect, notifications, tokenStore, portfolio, adminApi, presence };
export default api;

// ── AI Assistant ─────────────────────────────────────────────────────────────
export const aiChat = {
  send: (messages: Array<{ role: string; content: string }>): Promise<{ response: string }> =>
    request('/ai/chat', { method: 'POST', body: JSON.stringify({ messages }) }),
};

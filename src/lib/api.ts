export const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://erpapi.erphubtechnologies.in/api"

const TRANSIENT_HTTP = new Set([502, 503, 504])

export class ApiError extends Error {
  status: number
  code?: string
  limit?: number
  current?: number

  constructor(
    message: string,
    status: number,
    extras?: { code?: string; limit?: number; current?: number }
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = extras?.code
    this.limit = extras?.limit
    this.current = extras?.current
  }

  get transient() {
    return TRANSIENT_HTTP.has(this.status)
  }

  get isCapacityLimit() {
    return this.code === "CAPACITY_LIMIT"
  }
}

function isNetworkError(error: unknown) {
  return error instanceof TypeError
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function uploadAPI(endpoint: string, formData: FormData) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    body: formData,
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Upload failed: ${response.status}`)
  }

  return response.json()
}

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const maxAttempts = endpoint === "/auth/me" ? 8 : 4
  let lastError: unknown

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      }

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const err = new ApiError(
          errorData.message || `API error: ${response.status}`,
          response.status,
          {
            code: errorData.code,
            limit: errorData.limit,
            current: errorData.current,
          }
        )
        if (err.transient && attempt < maxAttempts - 1) {
          await sleep(400 * (attempt + 1))
          continue
        }
        throw err
      }

      if (response.status === 204) return null
      return await response.json()
    } catch (error) {
      lastError = error
      if (isNetworkError(error) && attempt < maxAttempts - 1) {
        await sleep(400 * (attempt + 1))
        continue
      }
      throw error
    }
  }

  throw lastError
}

export const api = {
  // Auth
  login: (data: any) => fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: any) => fetchAPI('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  verifySession: () => fetchAPI('/auth/me'),

  
  // Dashboard
  getDashboardMetrics: () => fetchAPI('/dashboard/metrics'),
  getAnalyticsOverview: () => fetchAPI('/analytics/overview'),
  getTrainerProfile: () => fetchAPI('/trainers/profile/me'),
  getTrainerStudents: () => fetchAPI('/students/mine'),
  getMySessionFeedback: () => fetchAPI('/session-feedback/me'),

  // Session feedback (students)
  getPendingSessionFeedback: () => fetchAPI('/session-feedback/pending'),
  submitSessionFeedback: (data: {
    batchId: string
    sessionDate: string
    sessionTopic?: string
    trainerName?: string
    rating?: number
    comment?: string
    skipped?: boolean
  }) => fetchAPI('/session-feedback', { method: 'POST', body: JSON.stringify(data) }),
  getTrainerSessionFeedback: (trainerId: string) => fetchAPI(`/session-feedback/trainer/${trainerId}`),
  
  // BDE
  getLeads: () => fetchAPI('/bde/leads'),
  createLead: (data: any) => fetchAPI('/bde/leads', { method: 'POST', body: JSON.stringify(data) }),
  importLeads: (leads: any[]) =>
    fetchAPI('/bde/leads/import', { method: 'POST', body: JSON.stringify({ leads }) }),
  updateLeadStage: (id: string, stage: string) => fetchAPI(`/bde/leads/${id}/stage`, { method: 'PUT', body: JSON.stringify({ stage }) }),
  updateLead: (id: string, data: any) => fetchAPI(`/bde/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLead: (id: string) => fetchAPI(`/bde/leads/${id}`, { method: 'DELETE' }),
  getTasks: () => fetchAPI('/bde/tasks'),
  updateTaskStatus: (id: string, status: string) => fetchAPI(`/bde/tasks/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  punchBdeAttendance: (action: 'login' | 'pause' | 'resume' | 'logout') =>
    fetchAPI('/bde/attendance/punch', { method: 'POST', body: JSON.stringify({ action }) }),
  resetBdeShift: () => fetchAPI('/bde/attendance/reset', { method: 'POST' }),
  getFollowUps: () => fetchAPI('/bde/followups'),
  createFollowUp: (data: any) => fetchAPI('/bde/followups', { method: 'POST', body: JSON.stringify(data) }),
  updateFollowUp: (id: string, data: any) => fetchAPI(`/bde/followups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  logCall: (data: {
    leadId: string;
    leadName: string;
    outcome: 'connected' | 'no_answer' | 'busy' | 'switched_off';
    notes?: string;
    talkDurationSeconds?: number;
  }) => fetchAPI('/bde/call-logs', { method: 'POST', body: JSON.stringify(data) }),
  getBdePerformance: (months?: number) =>
    fetchAPI(`/bde/performance${months ? `?months=${months}` : ''}`),

  // Reports
  getCallSummary: (month?: string) =>
    fetchAPI(`/reports/call-summary${month ? `?month=${month}` : ''}`),

  // Conversion requests (BDE → Owner approval)
  getConversionRequests: (status?: string) =>
    fetchAPI(`/conversions/requests${status ? `?status=${status}` : ''}`),
  createConversionRequest: (data: any) =>
    fetchAPI('/conversions/requests', { method: 'POST', body: JSON.stringify(data) }),
  approveConversionRequest: (id: string) =>
    fetchAPI(`/conversions/requests/${id}/approve`, { method: 'PUT' }),
  rejectConversionRequest: (id: string, note?: string) =>
    fetchAPI(`/conversions/requests/${id}/reject`, { method: 'PUT', body: JSON.stringify({ note }) }),
  
  // Jobs
  getJobs: () => fetchAPI('/jobs'),
  generateJobContent: (data: {
    title: string
    company?: string
    type?: string
    location?: string
  }) => fetchAPI('/jobs/generate', { method: 'POST', body: JSON.stringify(data) }),
  createJob: (data: any) => fetchAPI('/jobs', { method: 'POST', body: JSON.stringify(data) }),
  deleteJob: (id: string) => fetchAPI(`/jobs/${id}`, { method: 'DELETE' }),
  applyForJob: (id: string, data: any) => fetchAPI(`/jobs/${id}/apply`, { method: 'POST', body: JSON.stringify(data) }),
  getApplications: () => fetchAPI('/jobs/applications'),
  updateApplicationStatus: (id: string, status: string) => fetchAPI(`/jobs/applications/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  
  // Batches (existing)
  getBatches: () => fetchAPI("/batches"),
  getBatchById: (id: string) => fetchAPI(`/batches/${id}`),
  createBatch: (data: any) => fetchAPI("/batches", { method: "POST", body: JSON.stringify(data) }),
  updateBatch: (id: string, data: any) => fetchAPI(`/batches/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  updateBatchStatus: (id: string, status: "active" | "completed") =>
    fetchAPI(`/batches/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  deleteBatch: (id: string) => fetchAPI(`/batches/${id}`, { method: "DELETE" }),
  addStudentToBatch: (batchId: string, studentData: any) => fetchAPI(`/batches/${batchId}/students`, { method: "POST", body: JSON.stringify(studentData) }),
  uploadLmsMedia: (batchId: string, file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    return uploadAPI(`/lms/batches/${batchId}/upload`, formData)
  },
  uploadFile: (file: File, scope = "documents") => {
    const formData = new FormData()
    formData.append("file", file)
    return uploadAPI(`/upload?scope=${encodeURIComponent(scope)}`, formData)
  },
  generateLmsContent: (data: {
    type: "quizzes" | "assignments" | "codingTests" | "projects"
    topic?: string
    courseName?: string
    difficulty?: string
    count?: number
    existingTopics?: string[]
    excludeQuestions?: string[]
  }) => fetchAPI("/lms/generate", { method: "POST", body: JSON.stringify(data) }),
  fetchVideoMetadata: (url: string) =>
    fetchAPI("/lms/video-metadata", { method: "POST", body: JSON.stringify({ url }) }),

  // Students
  getStudents: () => fetchAPI('/students'),
  getStudentProfile: () => fetchAPI('/students/profile/me'),
  createStudent: (data: any) => fetchAPI('/students', { method: 'POST', body: JSON.stringify(data) }),
  updateStudentStatus: (id: string, status: string) => fetchAPI(`/students/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  updateStudentFees: (id: string, data: {
    feesPaid?: number
    feesTotal?: number
    nextDueDate?: string | null
    installmentsCount?: number
    installmentSchedule?: Array<{ amount: number; dueDate: string; label?: string }>
    scholarshipAmount?: number
    scholarshipNotes?: string
  }) => fetchAPI(`/students/${id}/fees`, { method: 'PUT', body: JSON.stringify(data) }),
  updateBatchStudentRemarks: (batchId: string, studentName: string, remarks: string) =>
    fetchAPI(`/batches/${batchId}/remarks`, {
      method: 'PUT',
      body: JSON.stringify({ studentName, remarks }),
    }),

  // Centers
  getCenters: () => fetchAPI('/centers'),
  getCenterPolicy: () => fetchAPI(`/centers/policy/me?t=${Date.now()}`),
  getPublicCenterPortal: (tenant: string) => fetchAPI(`/centers/public/${encodeURIComponent(tenant)}`),
  getCenterById: (id: string) => fetchAPI(`/centers/${id}`),
  createCenter: (data: any) => fetchAPI('/centers', { method: 'POST', body: JSON.stringify(data) }),
  updateCenter: (id: string, data: any) => fetchAPI(`/centers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCenter: (id: string) => fetchAPI(`/centers/${id}`, { method: 'DELETE' }),

  // BDE Management
  getBdes: () => fetchAPI('/admin/bdes'),
  createBde: (data: any) => fetchAPI('/admin/bdes', { method: 'POST', body: JSON.stringify(data) }),
  updateBde: (id: string, data: any) => fetchAPI(`/admin/bdes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBde: (id: string) => fetchAPI(`/admin/bdes/${id}`, { method: 'DELETE' }),

  // Trainers
  getTrainers: () => fetchAPI('/trainers'),
  getTrainerById: (id: string) => fetchAPI(`/trainers/${id}`),
  createTrainer: (data: any) => fetchAPI('/trainers', { method: 'POST', body: JSON.stringify(data) }),
  updateTrainer: (id: string, data: any) => fetchAPI(`/trainers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTrainer: (id: string) => fetchAPI(`/trainers/${id}`, { method: 'DELETE' }),

  // Courses
  getCourses: () => fetchAPI('/courses'),
  createCourse: (data: any) => fetchAPI('/courses', { method: 'POST', body: JSON.stringify(data) }),
  updateCourse: (id: string, data: any) => fetchAPI(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCourse: (id: string) => fetchAPI(`/courses/${id}`, { method: 'DELETE' }),

  // Attendance
  getAttendance: (date: string, type: string) => fetchAPI(`/attendance?date=${date}&type=${type}`),
  getAttendanceByEntity: (entityId: string, type: string = 'student') => fetchAPI(`/attendance?entityId=${entityId}&type=${type}`),
  getMyAttendance: () => fetchAPI('/attendance'),
  getMyBdeShiftLogs: () => fetchAPI('/attendance'),
  saveAttendance: (date: string, type: string, records: any[]) => fetchAPI('/attendance', {
    method: 'POST',
    body: JSON.stringify({ date, type, records })
  }),

  // HR & Payroll
  getHROverview: (month?: string) => fetchAPI(`/hr/overview${month ? `?month=${month}` : ''}`),
  submitHRPayroll: (data: any) => fetchAPI('/hr/payroll', { method: 'POST', body: JSON.stringify(data) }),
  updateHRPayrollStatus: (id: string, data: any) => fetchAPI(`/hr/payroll/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),
  upsertHRCommissionRule: (data: any) => fetchAPI('/hr/commission-rules', { method: 'PUT', body: JSON.stringify(data) }),
  createHRClaim: (data: any) => fetchAPI('/hr/claims', { method: 'POST', body: JSON.stringify(data) }),
  updateHRClaimStatus: (id: string, status: string) => fetchAPI(`/hr/claims/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  assignHRSubstitute: (data: any) => fetchAPI('/hr/substitutes', { method: 'POST', body: JSON.stringify(data) }),
  createHRDocument: (data: any) => fetchAPI('/hr/documents', { method: 'POST', body: JSON.stringify(data) }),

  // Campaigns
  getCampaigns: () => fetchAPI('/campaigns'),
  getCampaignStats: () => fetchAPI('/campaigns/stats'),
  getCampaignById: (id: string) => fetchAPI(`/campaigns/${id}`),
  getCampaignAudienceEstimate: (audience: string) => fetchAPI(`/campaigns/audience-estimate?audience=${encodeURIComponent(audience)}`),
  createCampaign: (data: any) => fetchAPI('/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  updateCampaign: (id: string, data: any) => fetchAPI(`/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCampaign: (id: string) => fetchAPI(`/campaigns/${id}`, { method: 'DELETE' }),
  duplicateCampaign: (id: string) => fetchAPI(`/campaigns/${id}/duplicate`, { method: 'POST' }),
  getCampaignTemplates: () => fetchAPI('/campaigns/templates'),
  createCampaignTemplate: (data: any) => fetchAPI('/campaigns/templates', { method: 'POST', body: JSON.stringify(data) }),

  // Notifications
  getNotifications: () => fetchAPI('/notifications'),
  createNotification: (data: {
    title: string
    description: string
    type?: string
    targetRoles?: string[]
    targetUserId?: string
    link?: string
  }) => fetchAPI('/notifications', { method: 'POST', body: JSON.stringify(data) }),
  markNotificationRead: (id: string) =>
    fetchAPI(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () =>
    fetchAPI('/notifications/read-all', { method: 'PATCH' }),
  clearNotifications: () =>
    fetchAPI('/notifications/clear', { method: 'DELETE' }),

  // Roles & permissions (institute-scoped)
  getRoles: (tenantId?: string) =>
    fetchAPI(tenantId ? `/roles?tenantId=${encodeURIComponent(tenantId)}` : "/roles"),
  getRoleFeatures: () => fetchAPI('/roles/features'),
  getRoleById: (id: string) => fetchAPI(`/roles/${id}`),
  createRole: (data: {
    name: string;
    description?: string;
    permissions?: Record<string, { view: boolean; add: boolean; edit: boolean; delete: boolean }>;
    baseRole?: string;
  }) => fetchAPI('/roles', { method: 'POST', body: JSON.stringify(data) }),
  updateRole: (id: string, data: {
    name?: string;
    description?: string;
    permissions?: Record<string, { view: boolean; add: boolean; edit: boolean; delete: boolean }>;
  }) => fetchAPI(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRole: (id: string) => fetchAPI(`/roles/${id}`, { method: 'DELETE' }),
  duplicateRole: (id: string) => fetchAPI(`/roles/${id}/duplicate`, { method: 'POST' }),

  // Platform usage (super admin)
  getPlatformUsage: () => fetchAPI('/platform/usage'),
  getInstituteProfile: () => fetchAPI('/platform/institute-profile'),

  // Support
  getSupportQueueCount: () =>
    fetchAPI('/support/tickets/queue-count?t=' + Date.now()) as Promise<{
      open: number
      inProgress: number
      pending: number
    }>,
  getSupportTickets: () => fetchAPI('/support/tickets'),
  createSupportTicket: (data: {
    subject: string;
    category: string;
    priority: 'low' | 'medium' | 'high';
    message: string;
  }) => fetchAPI('/support/tickets', { method: 'POST', body: JSON.stringify(data) }),
  updateSupportTicket: (id: string, data: { status?: string; response?: string }) =>
    fetchAPI(`/support/tickets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getAnnouncements: () => fetchAPI('/support/announcements'),
};

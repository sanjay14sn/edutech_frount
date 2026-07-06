import { create } from "zustand"
import { persist } from "zustand/middleware"
import { api } from "@/lib/api"
import { type CenterPolicy, DEFAULT_CENTER_POLICY } from "@/lib/centerPolicyClient"

export type UserRole = "super_admin" | "owner" | "trainer" | "student" | "bde"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  tenantId?: string
}

export type LeadStage = "new" | "contacted" | "interested" | "demo_scheduled" | "follow_up" | "requested_as_student" | "converted" | "lost"

export interface Trainer {
  id: string
  tenantId?: string
  name: string
  email: string
  phone: string
  specialization: string
  activeBatches: number
  hoursThisWeek: number
  rating: number
  status: "available" | "busy" | "on_leave"
}

export interface CourseLMS {
  id: string
  tenantId?: string
  title: string
  code: string
  batch: string
  trainer: string
  schedule: string
  enrolled: number
  capacity: number
  meetLink?: string
  platform?: "gmeet" | "zoom" | "teams" | "discord"
  centerName?: string
  studentNames: string[]
  mode: "online" | "offline" | "recorded"
  roomName?: string
  features: {
    videos: boolean
    assignments: boolean
    quizzes: boolean
    codingTests: boolean
    projects: boolean
    aiTutor: boolean
  }
  lmsPortalAccess: boolean
  studentLmsAccess: { [studentName: string]: boolean }
  lmsContent?: {
    videos?: Array<{
      id: string
      title: string
      description?: string
      duration: string
      src: string
      isCompleted: boolean
      resources?: Array<{ name: string; url: string } | string>
      createdAt?: string
    }>
    assignments?: Array<Record<string, unknown>>
    quizzes?: Array<{
      id: string
      title: string
      topic?: string
      timerMinutes?: number
      negativeMarking?: string
      difficulty?: string
      questions: Array<{
        q: string
        options: string[]
        correct: number
        explanation?: string
        difficulty?: string
      }>
      createdAt?: string
    }>
    quizSubmissions?: Record<
      string,
      Record<string, { completed: boolean; score: number; total: number }>
    >
    codingTests?: Array<Record<string, unknown>>
    projects?: Array<Record<string, unknown>>
    notes?: Array<{
      id: string
      title: string
      fileName: string
      url: string
      uploadedAt: string
    }>
    quizMeta?: {
      title: string
      timerMinutes?: number
      negativeMarking?: string
    }
    aiTutor?: { guidelines?: string }
    certificates?: { template?: string; rules?: string }
  }
}

export interface Lead {
  id: string
  tenantId?: string
  name: string
  email: string
  phone: string
  course: string
  stage: LeadStage
  counsellor: string
  assignedBdeId?: string
  value: number
  notes: { id: string; text: string; date: string }[]
  createdDate: string
  createdAt?: string
  updatedAt?: string
  city?: string
  source?: string
  priority?: "low" | "medium" | "high"
  nextFollowUpDate?: string
}

export interface BDE {
  id: string
  employeeId: string
  name: string
  email: string
  phone: string
  gender: string
  dob: string
  address: string
  qualification: string
  experience: string
  joiningDate: string
  weeklyOffDays?: number[]
  monthlyTarget: number
  targetType?: "revenue" | "leads"
  commissionEnabled?: boolean
  commissionPercentage: number
  commissionApplyFrom?: "from_start" | "after_target" | "after_threshold"
  commissionThreshold?: number
  profilePhoto?: string
  status: "active" | "inactive"
  activeLeads: number
  convertedLeads: number
  lostLeads: number
  revenueGenerated: number
}

export interface LeadAssignment {
  id: string
  leadId: string
  bdeId: string
  assignedBy: string
  assignedDate: string
  status: "active" | "reassigned"
}

export interface FollowUp {
  id: string
  leadId: string
  bdeId: string
  followupDate: string
  notes: string
  status: string
  nextFollowupDate: string
}

export interface BDETarget {
  id: string
  bdeId: string
  month: string
  targetCount: number
  achievedCount: number
  revenue: number
  incentive: number
}

export interface BDEAttendance {
  id: string
  bdeId: string
  loginTime: string
  logoutTime?: string
  totalHours?: number
  date: string
}

export interface BDETask {
  id: string
  bdeId: string
  title: string
  description: string
  status: "pending" | "in_progress" | "completed" | "delayed"
  dueDate: string
  remarks?: string
}

export interface BDESupportTicket {
  id: string
  bdeId: string
  title: string
  category: "lead_issue" | "technical" | "general"
  description: string
  status: "open" | "in_progress" | "resolved"
  createdAt: string
  messages: { sender: string; text: string; time: string }[]
}

export interface Tenant {
  id: string
  name: string
  logo?: string
  domain: string
  plan: "starter" | "growth" | "enterprise"
}

export interface Notification {
  id: string
  title: string
  description: string
  type: "fees" | "attendance" | "admissions" | "assignments" | "system" | "leads" | "tasks"
  read: boolean
  timestamp: string
  link?: string
  source?: "system" | "user"
}

// All navigable module keys available for owner/center
export type ModuleKey = "crm" | "students" | "trainers" | "courses" | "attendance" | "fees" | "jobs" | "analytics"

export const ALL_MODULES: ModuleKey[] = ["crm", "students", "trainers", "courses", "attendance", "fees", "jobs", "analytics"]

interface AppState {
  // Auth state
  user: User | null
  isAuthenticated: boolean
  login: (user: User) => void
  logout: () => void
  
  // Tenant state
  tenants: Tenant[]
  activeTenant: Tenant | null
  setActiveTenant: (tenantId: string) => void
  
  // Module permissions — set by Super Admin per center; owner sidebar renders conditionally
  ownerEnabledModules: ModuleKey[]
  setOwnerEnabledModules: (modules: ModuleKey[]) => void

  // Center policy — caps and feature gates for current tenant
  centerPolicy: CenterPolicy | null
  fetchCenterPolicy: () => Promise<void>
  setCenterPolicy: (policy: CenterPolicy | null) => void

  // Center Operations
  centers: TrainingCenter[]
  setCenters: (centers: TrainingCenter[]) => void
  addCenter: (center: TrainingCenter) => void
  updateCenter: (center: TrainingCenter) => void
  deleteCenter: (id: string) => void

  // BDE & CRM database tables
  bdes: BDE[]
  leads: Lead[]
  leadAssignments: LeadAssignment[]
  followUps: FollowUp[]
  bdeTargets: BDETarget[]
  bdeAttendance: BDEAttendance[]
  bdeTasks: BDETask[]
  bdeSupportTickets: BDESupportTicket[]

  // Trainers & LMS
  trainers: Trainer[]
  lmsCourses: CourseLMS[]
  
  // Trainer Actions
  setTrainers: (trainers: Trainer[]) => void
  addTrainer: (trainer: Trainer) => void
  
  // LMS Actions
  setLmsCourses: (courses: CourseLMS[]) => void
  addLmsCourse: (course: CourseLMS) => void

  // BDE Actions
  setBdes: (bdes: BDE[]) => void
  addBde: (bde: BDE) => void
  updateBde: (bde: BDE) => void
  deleteBde: (id: string) => void

  // Lead Actions
  setLeads: (leads: Lead[]) => void
  addLead: (lead: Lead) => void
  updateLead: (lead: Lead) => void
  deleteLead: (id: string) => void
  assignLead: (leadId: string, bdeId: string, assignedBy: string) => void

  // Follow-up Actions
  addFollowUp: (followUp: FollowUp) => void

  // Attendance punch action
  punchAttendance: (bdeId: string, action: "login" | "logout") => void

  // BDE Tasks
  setBdeTasks: (tasks: BDETask[]) => void
  addBdeTask: (task: BDETask) => void
  updateBdeTask: (taskId: string, status: BDETask["status"], remarks?: string) => void
  deleteBdeTask: (taskId: string) => void

  // Support
  addSupportTicket: (ticket: BDESupportTicket) => void
  replyToTicket: (ticketId: string, sender: string, text: string) => void

  // UI state
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  theme: "light" | "dark"
  toggleTheme: () => void
  setTheme: (theme: "light" | "dark") => void
  
  // Notifications
  notifications: Notification[]
  fetchNotifications: () => Promise<void>
  setNotifications: (notifications: Notification[]) => void
  addNotification: (
    notification: Omit<Notification, "id" | "read" | "timestamp" | "source"> & {
      targetRoles?: UserRole[]
      targetUserId?: string
    }
  ) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotifications: () => void

  // Super admin support queue badge
  supportQueueCount: number
  fetchSupportQueueCount: () => Promise<void>
}

export interface TrainingCenter {
  id: string
  name: string
  tenantName: string
  location: string
  manager: string
  email: string
  phone?: string
  status: "active" | "inactive" | "maintenance"
  enabledModules: ModuleKey[]
  // Social & Public Links
  website?: string
  linkedin?: string
  instagram?: string
  whatsapp?: string
  googleMaps?: string
  // Notification Preferences
  smsProvider?: string
  whatsappAlerts?: boolean
  emailSender?: string
  reminderTimings?: string
  // Tax & Billing Config
  gstVatNumber?: string
  invoicePrefix?: string
  currency?: string
  paymentGateway?: string
  // Logo + branding
  logoUrl?: string
  brandColor?: string
}

const initialCenters: TrainingCenter[] = []


const mockUsers: Record<UserRole, User> = {
  super_admin: {
    id: "u-1",
    name: "Alex Rivera",
    email: "alex@eduadmin.com",
    role: "super_admin",
    avatar: "AR"
  },
  owner: {
    id: "u-2",
    name: "Sarah Jenkins",
    email: "sarah@apexacademy.com",
    role: "owner",
    tenantId: "t-1",
    avatar: "SJ"
  },
  trainer: {
    id: "u-3",
    name: "Marcus Vance",
    email: "marcus@apexacademy.com",
    role: "trainer",
    tenantId: "t-1",
    avatar: "MV"
  },
  student: {
    id: "u-4",
    name: "Emily Parker",
    email: "emily@apexacademy.com",
    role: "student",
    tenantId: "t-1",
    avatar: "EP"
  },
  bde: {
    id: "bde-1",
    name: "Emma Watson",
    email: "emma@apexacademy.com",
    role: "bde",
    tenantId: "t-1",
    avatar: "EW"
  }
}

const initialBdes: BDE[] = []

const initialLeads: Lead[] = []

const initialLeadAssignments: LeadAssignment[] = [
  { id: "la-1", leadId: "lead-1", bdeId: "bde-1", assignedBy: "u-2", assignedDate: "2026-05-18", status: "active" },
  { id: "la-2", leadId: "lead-2", bdeId: "bde-1", assignedBy: "u-2", assignedDate: "2026-05-16", status: "active" },
  { id: "la-3", leadId: "lead-3", bdeId: "bde-2", assignedBy: "u-2", assignedDate: "2026-05-14", status: "active" },
  { id: "la-4", leadId: "lead-4", bdeId: "bde-2", assignedBy: "u-2", assignedDate: "2026-05-12", status: "active" }
]

const initialFollowUps: FollowUp[] = [
  { id: "f-1", leadId: "lead-2", bdeId: "bde-1", followupDate: "2026-05-17", notes: "Called candidate, she was busy. Rescheduled to tomorrow.", status: "completed", nextFollowupDate: "2026-05-23" },
  { id: "f-2", leadId: "lead-3", bdeId: "bde-2", followupDate: "2026-05-15", notes: "Sent invoice structure. He will confirm by Monday.", status: "pending", nextFollowupDate: "2026-05-24" }
]

const initialBdeTargets: BDETarget[] = [
  { id: "t-1", bdeId: "bde-1", month: "2026-05", targetCount: 30, achievedCount: 12, revenue: 21600, incentive: 1080 },
  { id: "t-2", bdeId: "bde-2", month: "2026-05", targetCount: 40, achievedCount: 25, revenue: 45000, incentive: 3150 }
]

const initialBdeAttendance: BDEAttendance[] = [
  { id: "a-1", bdeId: "bde-1", loginTime: "09:00 AM", logoutTime: "06:00 PM", totalHours: 9, date: "2026-05-21" },
  { id: "a-2", bdeId: "bde-2", loginTime: "08:45 AM", logoutTime: "06:15 PM", totalHours: 9.5, date: "2026-05-21" }
]

const initialBdeTasks: BDETask[] = [
  { id: "tsk-1", bdeId: "bde-1", title: "Follow-up with Boston Leads", description: "Reach out to leads in Boston area for the UI/UX batch.", status: "pending", dueDate: "2026-05-23" },
  { id: "tsk-2", bdeId: "bde-2", title: "Send Quote to David Miller", description: "Email corporate pricing proposal.", status: "completed", dueDate: "2026-05-21", remarks: "Quote emailed on 21st May." }
]

const initialBdeSupportTickets: BDESupportTicket[] = [
  {
    id: "st-1",
    bdeId: "bde-1",
    title: "Lead #2 Email Bounce",
    category: "lead_issue",
    description: "The email for Alice Cooper is bouncing back. Please verify correct records.",
    status: "open",
    createdAt: "2026-05-21T10:00:00Z",
    messages: [
      { sender: "Emma Watson", text: "Emails are returning delivery failure notices.", time: "10:00 AM" }
    ]
  }
]

export const mockTenants: Tenant[] = []

export const initialTrainers: Trainer[] = [
  { id: "tr-1", name: "Marcus Vance", email: "marcus@example.com", phone: "+1 555-0201", specialization: "React, Node.js, Next.js", activeBatches: 3, hoursThisWeek: 18.5, rating: 4.9, status: "available" },
  { id: "tr-2", name: "Samantha Cole", email: "samantha@example.com", phone: "+1 555-0202", specialization: "UI/UX, Figma, Webflow", activeBatches: 2, hoursThisWeek: 12.0, rating: 4.8, status: "available" },
  { id: "tr-3", name: "David Beckham", email: "david@example.com", phone: "+1 555-0203", specialization: "Data Science, Python, SQL", activeBatches: 1, hoursThisWeek: 6.0, rating: 4.5, status: "busy" },
  { id: "tr-4", name: "Elena Rostova", email: "elena@example.com", phone: "+1 555-0204", specialization: "Java, Spring Boot, DevOps", activeBatches: 0, hoursThisWeek: 0, rating: 4.7, status: "on_leave" }
]

export const initialLmsCourses: CourseLMS[] = []

export const initialBatches = [
  {
    id: "b-1",
    title: "Fullstack Web Dev",
    code: "Apex-B12",
    batch: "Apex-B12",
    trainer: "Marcus Vance",
    schedule: "Mon, Wed, Fri • 09:00 AM - 10:30 AM",
    enrolled: 4,
    capacity: 30,
    meetLink: "https://meet.google.com/abc-defg-hij",
    platform: "gmeet",
    centerName: "Apex Downtown Hub",
    studentNames: ["David Miller", "Elena Rostova", "Emily Parker", "Chloe Dupont"],
    mode: "online",
    features: { videos: true, assignments: true, quizzes: true, codingTests: false, projects: true, aiTutor: true },
    lmsPortalAccess: true,
    studentLmsAccess: { "David Miller": true, "Elena Rostova": true, "Emily Parker": true, "Chloe Dupont": true }
  }
]

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth state
      user: null,
      isAuthenticated: false,
      login: (user) => {
        const tenant = mockTenants.find(t => t.name === user.tenantId) || { 
          id: `t-${Date.now()}`, 
          name: user.tenantId || "Unknown", 
          domain: "", 
          plan: "starter" 
        }
        set({
          user: user,
          isAuthenticated: true,
          activeTenant: user.role === "super_admin" ? null : tenant
        })
      },
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("token")
        }
        set({ user: null, isAuthenticated: false, activeTenant: null, notifications: [], centerPolicy: null, supportQueueCount: 0 })
      },
      
      // Tenant state
      tenants: mockTenants,
      activeTenant: null as Tenant | null,
      setActiveTenant: (tenantId) => {
        // Find in mockTenants or state.tenants if we added dynamic ones later
        const tenant = get().tenants.find(t => t.id === tenantId) || mockTenants.find(t => t.id === tenantId) || null
        set({ activeTenant: tenant })
      },

      // BDE & CRM database tables
      bdes: initialBdes,
      leads: initialLeads,
      leadAssignments: initialLeadAssignments,
      followUps: initialFollowUps,
      bdeTargets: initialBdeTargets,
      bdeAttendance: initialBdeAttendance,
      bdeTasks: initialBdeTasks,
      bdeSupportTickets: initialBdeSupportTickets,

      // Trainers & LMS
      trainers: initialTrainers,
      lmsCourses: initialLmsCourses,
      
      setTrainers: (trainers) => set({ trainers }),
      addTrainer: (trainer) => set((state) => ({ trainers: [trainer, ...state.trainers] })),
      
      setLmsCourses: (courses) => set({ lmsCourses: courses }),
      addLmsCourse: (course) => set((state) => ({ lmsCourses: [course, ...state.lmsCourses] })),

      // BDE Actions
      setBdes: (bdes) => set({ bdes }),
      addBde: (bde) => set((state) => ({ bdes: [...state.bdes, bde] })),
      updateBde: (bde) => set((state) => ({
        bdes: state.bdes.map((b) => b.id === bde.id ? bde : b)
      })),
      deleteBde: (id) => set((state) => ({
        bdes: state.bdes.filter((b) => b.id !== id)
      })),

      // Lead Actions
      setLeads: (leads) => set({ leads }),
      addLead: (lead) => set((state) => ({ leads: [lead, ...state.leads] })),
      updateLead: (lead) => set((state) => ({
        leads: state.leads.map((l) => l.id === lead.id ? lead : l)
      })),
      deleteLead: (id) => set((state) => ({
        leads: state.leads.filter((l) => l.id !== id)
      })),
      assignLead: (leadId, bdeId, assignedBy) => set((state) => {
        const bde = state.bdes.find(b => b.id === bdeId);
        const bdeName = bde ? bde.name : "Emma Watson";
        return {
          leads: state.leads.map((l) =>
            l.id === leadId
              ? { ...l, assignedBdeId: bdeId, counsellor: bdeName }
              : l
          ),
          leadAssignments: [
            {
              id: `la-${Date.now()}`,
              leadId,
              bdeId,
              assignedBy,
              assignedDate: new Date().toISOString().split("T")[0],
              status: "active"
            },
            ...state.leadAssignments
          ]
        };
      }),

      // Follow-up Actions
      addFollowUp: (followUp) => set((state) => ({
        followUps: [followUp, ...state.followUps]
      })),

      // Attendance punch action
      punchAttendance: (bdeId, action) => set((state) => {
        const todayStr = new Date().toISOString().split("T")[0];
        const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (action === "login") {
          const newPunch: BDEAttendance = {
            id: `a-${Date.now()}`,
            bdeId,
            loginTime: nowTimeStr,
            date: todayStr
          };
          return { bdeAttendance: [newPunch, ...state.bdeAttendance] };
        } else {
          return {
            bdeAttendance: state.bdeAttendance.map((a) => {
              if (a.bdeId === bdeId && a.date === todayStr && !a.logoutTime) {
                return {
                  ...a,
                  logoutTime: nowTimeStr,
                  totalHours: 9
                };
              }
              return a;
            })
          };
        }
      }),

      // BDE Tasks
      setBdeTasks: (tasks) => set({ bdeTasks: tasks }),
      addBdeTask: (task) => set((state) => ({ bdeTasks: [...state.bdeTasks, task] })),
      updateBdeTask: (taskId, status, remarks) => set((state) => ({
        bdeTasks: state.bdeTasks.map((t) =>
          t.id === taskId ? { ...t, status, remarks: remarks || t.remarks } : t
        )
      })),
      deleteBdeTask: (taskId) => set((state) => ({
        bdeTasks: state.bdeTasks.filter((t) => t.id !== taskId)
      })),

      // Support
      addSupportTicket: (ticket) => set((state) => ({
        bdeSupportTickets: [ticket, ...state.bdeSupportTickets]
      })),
      replyToTicket: (ticketId, sender, text) => set((state) => ({
        bdeSupportTickets: state.bdeSupportTickets.map((t) => {
          if (t.id === ticketId) {
            return {
              ...t,
              messages: [...t.messages, { sender, text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]
            };
          }
          return t;
        })
      })),

      // Module permissions — Super Admin configures which modules owners can access
      ownerEnabledModules: ["crm", "students", "trainers", "courses", "attendance", "fees", "jobs", "analytics"] as import("./useStore").ModuleKey[],
      setOwnerEnabledModules: (modules) => set({ ownerEnabledModules: modules }),

      centerPolicy: null as CenterPolicy | null,
      setCenterPolicy: (policy) => set({ centerPolicy: policy }),
      fetchCenterPolicy: async () => {
        const user = get().user
        if (!user?.tenantId || user.role === "super_admin") {
          set({ centerPolicy: null })
          return
        }
        try {
          const policy = (await api.getCenterPolicy()) as CenterPolicy
          set({ centerPolicy: policy })
        } catch {
          set({ centerPolicy: { ...DEFAULT_CENTER_POLICY, tenantId: user.tenantId } })
        }
      },
      
      // Center Operations
      centers: initialCenters,
      setCenters: (centers) => set({ centers }),
      addCenter: (center) => set((state) => ({ centers: [center, ...state.centers] })),
      updateCenter: (center) => set((state) => ({
        centers: state.centers.map((c) => c.id === center.id ? center : c)
      })),
      deleteCenter: (id) => set((state) => ({
        centers: state.centers.filter((c) => c.id !== id)
      })),

      // UI state
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      theme: "light", // default theme is light
      toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
      setTheme: (theme) => set({ theme }),
      
      // Notifications
      notifications: [],
      fetchNotifications: async () => {
        try {
          const data = await api.getNotifications()
          set({ notifications: Array.isArray(data) ? data : [] })
        } catch {
          // Keep existing notifications on transient errors
        }
      },
      setNotifications: (notifications) => set({ notifications }),
      addNotification: (notification) => {
        void (async () => {
          try {
            await api.createNotification(notification)
            await get().fetchNotifications()
          } catch {
            const fallback: Notification = {
              ...notification,
              id: `local-${Date.now()}`,
              read: false,
              timestamp: new Date().toISOString(),
              source: "user",
            }
            set((state) => ({ notifications: [fallback, ...state.notifications] }))
          }
        })()
      },
      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }))
        void api.markNotificationRead(id).catch(() => get().fetchNotifications())
      },
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }))
        void api.markAllNotificationsRead().catch(() => get().fetchNotifications())
      },
      clearNotifications: () => {
        void (async () => {
          try {
            await api.clearNotifications()
            await get().fetchNotifications()
          } catch {
            await get().fetchNotifications()
          }
        })()
      },

      supportQueueCount: 0,
      fetchSupportQueueCount: async () => {
        const user = get().user
        if (user?.role !== "super_admin") {
          set({ supportQueueCount: 0 })
          return
        }
        try {
          const data = await api.getSupportQueueCount()
          set({ supportQueueCount: data.pending ?? 0 })
        } catch {
          // Keep last known count on transient errors
        }
      },
    }),
    {
      name: "education-crm-erp-storage-v3",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        activeTenant: state.activeTenant,
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        ownerEnabledModules: state.ownerEnabledModules,
        // All server-side data intentionally excluded — always fetched fresh from API
        // bdes, leads, trainers, etc. are not persisted to avoid stale cache issues
      })
    }
  )
)

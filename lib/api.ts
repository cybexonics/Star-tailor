// API utility functions for backend communication
let OFFLINE_MODE = false
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://star-tailor-xppm.vercel.app/"

// Helper function to get auth token
const getAuthToken = () => {
  if (typeof window !== "undefined") {
    // Support both new and legacy token keys
    return localStorage.getItem("auth_token") || localStorage.getItem("token")
  }
  return null
}

// Helper function to make authenticated requests
const makeRequest = async (endpoint: string, options: RequestInit = {}) => {
  if (OFFLINE_MODE) {
    // Return offline fallbacks without making a network call
    return offlineFallback(endpoint)
  }
  const token = getAuthToken()
  const url = `${API_BASE_URL}${endpoint}`

  const headers = new Headers()
  headers.append("Content-Type", "application/json")
  if (token) {
    headers.append("Authorization", `Bearer ${token}`)
  }

  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      headers.append(key, value)
    })
  }

  // Add AbortController-based timeout (defaults to 15s)
  const controller = new AbortController()
  const timeoutMs = (options as any)?.timeoutMs ?? 30000
  const config: RequestInit = {
    headers,
    ...options,
    // Respect caller-provided signal if present; otherwise attach ours
    signal: (options as any)?.signal ? (options as any).signal : controller.signal,
  }
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, config)

    if (response.status === 401) {
      localStorage.removeItem("auth_token")
      localStorage.removeItem("user")
      throw new Error("Session expired. Please login again.")
    }

    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch {
        errorData = { message: `HTTP error! status: ${response.status}` }
      }
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  } catch (error: any) {
    // Offline/demo fallback when backend is not reachable
    const isNetworkError =
      error?.name === 'TypeError' ||
      /Failed to fetch|NetworkError|ERR_CONNECTION_REFUSED/i.test(String(error?.message || error))

    if (isNetworkError) {
      OFFLINE_MODE = true
      return offlineFallback(endpoint)
      // For network errors we silently return fallbacks without noisy logs
      return {}
    }
    // Non-network errors: log for visibility
    console.error(`API Error (${endpoint}):`, error)
    if (error?.name === "AbortError") {
      throw new Error("Request timed out. Please try again.")
    }
    throw error
  }
  finally {
    clearTimeout(timeoutId)
  }
}

// Helpers
function normalizeList<T = any>(data: any, key: string): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && Array.isArray(data[key])) return data[key] as T[]
  if (data && Array.isArray(data.data)) return data.data as T[]
  if (data && data.results && Array.isArray(data.results)) return data.results as T[]
  return []
}

// Authentication API
export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await makeRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    })

    if (response.token) {
      localStorage.setItem("auth_token", response.token)
      localStorage.setItem("user", JSON.stringify(response.user))
    }

    return response
  },

  register: async (name: string, email: string, password: string, role = "user") => {
    return makeRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role }),
    })
  },

  verify: async () => {
    return makeRequest("/auth/verify")
  },

  logout: () => {
    localStorage.removeItem("auth_token")
    localStorage.removeItem("token")
    localStorage.removeItem("user")
  },

  getCurrentUser: () => {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("user")
      return user ? JSON.parse(user) : null
    }
    return null
  },
}

// Customer API
export const customerAPI = {
  getAll: async (params: { search?: string; page?: number; limit?: number } = {}) => {
    const searchParams = new URLSearchParams()
    if (params.search) searchParams.append("search", params.search)
    if (params.page) searchParams.append("page", params.page.toString())
    if (params.limit) searchParams.append("limit", params.limit.toString())

    return makeRequest(`/customers?${searchParams.toString()}`)
  },

  getById: async (id: string) => {
    return makeRequest(`/customers/${id}`)
  },

  create: async (customer: { name: string; phone: string; email?: string; address?: string; notes?: string }) => {
    return makeRequest("/customers", {
      method: "POST",
      body: JSON.stringify(customer),
    })
  },

  update: async (
    id: string,
    customer: { name: string; phone: string; email?: string; address?: string; notes?: string },
  ) => {
    return makeRequest(`/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(customer),
    })
  },

  delete: async (id: string) => {
    return makeRequest(`/customers/${id}`, {
      method: "DELETE",
    })
  },

  getStats: async () => {
    return makeRequest("/customers/stats")
  },
}

// Bills API - UPDATED with complete implementation
export const billsAPI = {
  getAll: async (
    params: {
      search?: string
      status?: string
      customer_id?: string
      page?: number
      limit?: number
    } = {},
  ): Promise<{ bills: any[] }> => {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, value.toString())
      }
    })

    const data = await makeRequest(`/bills?${searchParams.toString()}`)
    return { bills: normalizeList<any>(data, "bills") }
  },

  getById: async (id: string) => {
    return makeRequest(`/bills/${id}`)
  },

  create: async (bill: {
    customer_id: string
    customer_name: string
    customer_phone?: string
    customer_address?: string
    items: Array<{
      type: string
      description: string
      quantity: number
      price: number
      measurements: Record<string, any>
    }>
    subtotal: number
    discount: number
    total: number
    advance: number
    balance: number
    due_date?: string
    special_instructions?: string
    design_images?: string[]
    drawings?: string[]
    signature?: string
    status?: string
  }) => {
    return makeRequest("/bills", {
      method: "POST",
      body: JSON.stringify(bill),
    })
  },

  update: async (id: string, bill: any) => {
    return makeRequest(`/bills/${id}`, {
      method: "PUT",
      body: JSON.stringify(bill),
    })
  },

  delete: async (id: string) => {
    return makeRequest(`/bills/${id}`, {
      method: "DELETE",
    })
  },

  updateStatus: async (id: string, status: string) => {
    return makeRequest(`/bills/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    })
  },

  getStats: async (params: { from_date?: string; to_date?: string } = {}) => {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.append(key, value)
    })

    return makeRequest(`/bills/stats?${searchParams.toString()}`)
  },

  // NEW: Get bills for customer
  getByCustomerId: async (customerId: string) => {
    return makeRequest(`/bills?customer_id=${customerId}`)
  },

  // NEW: Search bills with multiple parameters
  search: async (params: {
    customer_name?: string
    phone?: string
    status?: string
    from_date?: string
    to_date?: string
  }) => {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.append(key, value.toString())
    })

    return makeRequest(`/bills/search?${searchParams.toString()}`)
  },
}

// Tailors API - UPDATED with complete implementation
export const tailorsAPI = {
  getAll: async (
    params: {
      search?: string
      status?: string
      page?: number
      limit?: number
    } = {},
  ): Promise<{ tailors: any[] }> => {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, value.toString())
      }
    })

    const data = await makeRequest(`/tailors?${searchParams.toString()}`)
    const tailors = normalizeList<any>(data, "tailors").map((t: any) => ({ ...t, id: t?.id || t?._id }))
    return { tailors }
  },

  getById: async (id: string) => {
    return makeRequest(`/tailors/${id}`)
  },

  create: async (tailor: {
    name: string
    phone: string
    email?: string
    specialization?: string
    experience?: string
    status?: string
  }) => {
    return makeRequest("/tailors", {
      method: "POST",
      body: JSON.stringify(tailor),
    })
  },

  update: async (id: string, tailor: any) => {
    return makeRequest(`/tailors/${id}`, {
      method: "PUT",
      body: JSON.stringify(tailor),
    })
  },

  delete: async (id: string) => {
    return makeRequest(`/tailors/${id}`, {
      method: "DELETE",
    })
  },

  getJobs: async (id: string, params: { status?: string; page?: number; limit?: number } = {}) => {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.append(key, value.toString())
    })

    return makeRequest(`/tailors/${id}/jobs?${searchParams.toString()}`)
  },

    getStats: async () => {
      return makeRequest("/jobs/stats")
    },

    // Workflow Management
    getWorkflow: async (jobId: string) => {
      return makeRequest(`/jobs/${jobId}/workflow`)
    },

    updateWorkflowStage: async (jobId: string, stageName: string, data: { 
      status: string; 
      notes?: string; 
      assigned_tailor?: string 
    }) => {
      return makeRequest(`/jobs/${jobId}/workflow/${stageName}`, {
        method: "PUT",
        body: JSON.stringify(data)
      })
    },

  // NEW: Update tailor status
  updateStatus: async (id: string, status: string) => {
    return makeRequest(`/tailors/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    })
  },
}

// Jobs API - UPDATED with complete implementation
export const jobsAPI = {
  getAll: async (
    params: {
      search?: string
      status?: string
      tailor_id?: string
      priority?: string
      page?: number
      limit?: number
    } = {},
  ): Promise<{ jobs: any[] }> => {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, value.toString())
      }
    })

    // Ask backend for a lightweight payload to avoid heavy joins on initial load
    const connector = searchParams.toString() ? '&' : ''
    const data = await makeRequest(`/jobs?${searchParams.toString()}${connector}light=true`, { timeoutMs: 60000 })
    const jobs = normalizeList<any>(data, "jobs").map((j: any) => ({
      ...j,
      id: j?.id || j?._id,
      assigned_date: j?.assigned_date || j?.createdAt || j?.created_at || j?.assignedAt,
    }))
    return { jobs }
  },

  getById: async (id: string) => {
    return makeRequest(`/jobs/${id}`)
  },

  create: async (job: {
    bill_id: string
    tailor_id: string
    customer_name: string
    customer_phone?: string
    items: Array<{
      type: string
      description: string
      measurements: Record<string, any>
    }>
    instructions?: string
    priority?: "low" | "medium" | "high"
    due_date?: string
  }) => {
    return makeRequest("/jobs", {
      method: "POST",
      body: JSON.stringify(job),
    })
  },

  update: async (id: string, job: any) => {
    return makeRequest(`/jobs/${id}`, {
      method: "PUT",
      body: JSON.stringify(job),
    })
  },

  updateStatus: async (id: string, status: string) => {
    return makeRequest(`/jobs/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    })
  },

  // Workflow stage update
  updateWorkflowStage: async (
    id: string,
    stageName: string,
    data: { status: string; notes?: string; assigned_tailor?: string }
  ) => {
    return makeRequest(`/jobs/${id}/workflow/${stageName}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    return makeRequest(`/jobs/${id}`, {
      method: "DELETE",
    })
  },

  // NEW: Get jobs by status
  getByStatus: async (status: string, params: { page?: number; limit?: number } = {}) => {
    const searchParams = new URLSearchParams()
    searchParams.append("status", status)
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.append(key, value.toString())
    })

    return makeRequest(`/jobs?${searchParams.toString()}`, { timeoutMs: 60000 })
  },

  // NEW: Get jobs by tailor with filters
  getByTailor: async (tailorId: string, params: { status?: string; priority?: string } = {}) => {
    const searchParams = new URLSearchParams()
    searchParams.append("tailor_id", tailorId)
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.append(key, value.toString())
    })

    return makeRequest(`/jobs?${searchParams.toString()}`, { timeoutMs: 60000 })
  },
}

// Settings API
export const settingsAPI = {
  getUPI: async () => {
    return makeRequest("/settings/upi")
  },

  updateUPI: async (upi_id: string, business_name: string) => {
    return makeRequest("/settings/upi", {
      method: "PUT",
      body: JSON.stringify({ upi_id, business_name }),
    })
  },

  getBusiness: async () => {
    return makeRequest("/settings/business")
  },

  updateBusiness: async (payload: { business_name: string; address?: string; phone?: string; email?: string }) => {
    return makeRequest("/settings/business", {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },
}

// Reports API
export const reportsAPI = {
  getRevenue: async (params: { from_date?: string; to_date?: string } = {}) => {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.append(key, value)
    })

    return makeRequest(`/reports/revenue?${searchParams.toString()}`)
  },

  getCustomers: async () => {
    return makeRequest("/reports/customers")
  },

  getTailors: async () => {
    return makeRequest("/reports/tailors")
  },

  getOutstanding: async () => {
    return makeRequest("/reports/outstanding")
  },

  export: async (report_type: string, format: "csv" | "pdf" = "csv") => {
    return makeRequest(`/reports/export/${report_type}/${format}`, {
      method: "GET",
    })
  },
}

// Dashboard API
export const dashboardAPI = {
  getStats: async () => {
    return makeRequest("/dashboard/stats")
  },
}

// NEW: Health check API
export const healthAPI = {
  check: async () => {
    return makeRequest("/health")
  },
}

// Workflow API
export const workflowAPI = {
  getDashboard: async () => {
    return makeRequest("/workflow/dashboard")
  },
  backfill: async (options: { dry_run?: boolean; limit?: number } = {}) => {
    const payload: any = {}
    if (typeof options.dry_run === 'boolean') payload.dry_run = options.dry_run
    if (typeof options.limit === 'number') payload.limit = options.limit
    return makeRequest("/workflow/backfill", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },
}

// Complete API export with all endpoints
export const api = {
  auth: authAPI,
  customers: customerAPI,
  bills: billsAPI,
  tailors: tailorsAPI,
  jobs: jobsAPI,
  reports: reportsAPI,
  dashboard: dashboardAPI,
  health: healthAPI,
  workflow: workflowAPI,
  settings: {
    getUpi: settingsAPI.getUPI,
    updateUpi: settingsAPI.updateUPI,
    getBusiness: settingsAPI.getBusiness,
    updateBusiness: settingsAPI.updateBusiness,
  },
}

export default api

// Offline fallback generator
function offlineFallback(endpoint: string): any {
  if (endpoint.startsWith('/dashboard/stats')) {
    return {
      total_customers: 0,
      total_bills: 0,
      total_tailors: 0,
      total_jobs: 0,
      pending_jobs: 0,
      today_bills: 0,
      total_revenue: 0,
    }
  }
  if (endpoint.startsWith('/customers')) {
    return { customers: [] }
  }
  if (endpoint.startsWith('/bills')) {
    return { bills: [] }
  }
  if (endpoint.startsWith('/tailors')) {
    return { tailors: [] }
  }
  if (endpoint.startsWith('/jobs')) {
    return { jobs: [] }
  }
  if (endpoint.startsWith('/settings/upi')) {
    return { upi_id: 'startailors@paytm', business_name: 'STAR TAILORS' }
  }
  if (endpoint.startsWith('/settings/business')) {
    return { business_name: 'STAR TAILORS', address: '', phone: '', email: '' }
  }
  return {}
}

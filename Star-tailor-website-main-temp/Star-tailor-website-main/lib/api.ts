// API utility functions for backend communication
let OFFLINE_MODE = false

// 🔥 FIX: use relative /api in production to avoid CORS, keep localhost for dev
const API_BASE_URL =
  typeof window !== "undefined" && window.location.origin.includes("vercel.app")
    ? "/api"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

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
      headers.append(key, value as string)
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
    return makeRequest("/customers/create", {   // ✅ updated to hit Vercel function
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

// Bills API - (unchanged)
export const billsAPI = { /* ... same as your code ... */ }

// Tailors API - (unchanged)
export const tailorsAPI = { /* ... same as your code ... */ }

// Jobs API - (unchanged)
export const jobsAPI = { /* ... same as your code ... */ }

// Settings API - (unchanged)
export const settingsAPI = { /* ... same as your code ... */ }

// Reports API - (unchanged)
export const reportsAPI = { /* ... same as your code ... */ }

// Dashboard API
export const dashboardAPI = {
  getStats: async () => {
    return makeRequest("/dashboard/stats")
  },
}

// Health check API
export const healthAPI = {
  check: async () => {
    return makeRequest("/health")
  },
}

// Workflow API - (unchanged)
export const workflowAPI = { /* ... same as your code ... */ }

// Complete API export
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

// Offline fallback generator (unchanged)
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

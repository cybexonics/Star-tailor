"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MobileNav } from "@/components/mobile-nav"
import { BottomNav } from "@/components/bottom-nav"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import {
  Users,
  Receipt,
  Scissors,
  BarChart3,
  LogOut,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  IndianRupee,
  Bell,
  Settings,
  Sparkles,
  Loader2,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Package,
  Calendar,
  RefreshCw,
  FileText,
  Paintbrush,
} from "lucide-react"

interface Customer {
  _id: string
  name: string
  phone: string
  email?: string
  address?: string
  notes?: string
  createdAt: string
}

interface Bill {
  _id: string
  customerName: string
  customer_id: string
  items: Array<{
    itemType: string
    quantity: number
    rate: number
    amount: number
  }>
  subtotal: number
  discount: number
  advanceAmount: number
  totalAmount: number
  status: "pending" | "in_progress" | "completed"
  createdAt: string
  notes?: string
  // Augmented fields: job status coming from tailor-management (jobs)
  jobStatus?: "pending" | "assigned" | "acknowledged" | "in_progress" | "completed" | "delivered"
  jobId?: string
}

interface Tailor {
  _id: string
  name: string
  phone: string
  email?: string
  specialization?: string
  status: "active" | "inactive"
  createdAt: string
}

interface Job {
  _id: string
  bill_id: string
  tailor_id: string | null
  itemType: string
  status: "assigned" | "acknowledged" | "in_progress" | "completed" | "delivered"
  priority: "low" | "medium" | "high"
  createdAt: string
  instructions?: string
  // Workflow fields (optional, provided by backend)
  title?: string
  description?: string
  current_stage?: "cutting" | "stitching" | "finishing" | "packaging"
  progress_percentage?: number
  workflow_stages?: Array<{
    name: "cutting" | "stitching" | "finishing" | "packaging"
    status: "pending" | "in_progress" | "completed" | "on_hold"
    started_at?: string | null
    completed_at?: string | null
    assigned_tailor?: string | null
    assigned_tailor_name?: string | null
    assigned_tailor_phone?: string | null
    notes?: string | null
    updated_at?: string
  }>
  bill?: {
    _id: string
    bill_no?: number
    bill_no_str?: string
    customer_id?: string
    customer_name?: string
    customer_phone?: string
    customer_address?: string
    items?: Array<{ type?: string; description?: string; quantity?: number; measurements?: Record<string, any> }>
    special_instructions?: string
    design_images?: string[]
    drawings?: string[]
    signature?: string
    subtotal?: number
    discount?: number
    total?: number
    advance?: number
    balance?: number
  }
}

interface DashboardStats {
  totalCustomers: number
  activeOrders: number
  completedOrders: number
  totalRevenue: number
  monthlyRevenue: number
  outstandingAmount: number
  activeTailors: number
  pendingJobs: number
}

interface RecentActivity {
  id: string
  type: "order" | "payment" | "job" | "customer"
  message: string
  timestamp: string
  status: "success" | "warning" | "error" | "info"
}

interface Alert {
  id: string
  type: "overdue" | "payment" | "job" | "system"
  title: string
  message: string
  priority: "high" | "medium" | "low"
  timestamp: string
}

export function AdminDashboard() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    activeOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    outstandingAmount: 0,
    activeTailors: 0,
    pendingJobs: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [activeTab, setActiveTab] = useState("overview")
  const [upiId, setUpiId] = useState("")
  const [businessName, setBusinessName] = useState("STAR TAILORS")
  const [businessInfo, setBusinessInfo] = useState<{ address?: string; phone?: string; email?: string }>({})
  const [isEditingUpi, setIsEditingUpi] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()
  const [orders, setOrders] = useState<Bill[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Bill[]>([])
  const [isBackfilling, setIsBackfilling] = useState(false)
  const [orderSearchTerm, setOrderSearchTerm] = useState("")
  const [orderStatusFilter, setOrderStatusFilter] = useState("all")
  const [orderSortBy, setOrderSortBy] = useState("newest")
  const [selectedOrder, setSelectedOrder] = useState<Bill | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [jobsList, setJobsList] = useState<Job[]>([])
  const [activeWorkflowTab, setActiveWorkflowTab] = useState("all")

  // Component for workflow table rows
  const WorkflowTableRow = ({ job, customerName, customerPhone, customerAddress, billNo, itemType, measurements, description, designImages, designDrawings, curStage, progress, showStageActions = false }: {
    job: any,
    customerName: string,
    customerPhone: string,
    customerAddress: string,
    billNo: string,
    itemType: string,
    measurements: Record<string, any>,
    description: string,
    designImages: string[],
    designDrawings: string[],
    curStage: 'cutting' | 'stitching' | 'finishing' | 'packaging',
    progress: number,
    showStageActions?: boolean
  }) => (
    <tr key={job._id} className="bg-card/80 hover:bg-muted/30 transition-colors border border-border rounded-lg">
      <td className="px-4 py-4">
        <div className="space-y-1">
          <div className="font-medium text-foreground">{customerName}</div>
          <div className="text-xs text-muted-foreground">📞 {customerPhone}</div>
          {customerAddress !== 'N/A' && (
            <div className="text-xs text-muted-foreground max-w-32 truncate" title={customerAddress}>
              📍 {customerAddress}
            </div>
          )}
        </div>
      </td>
      
      <td className="px-4 py-4">
        <div className="space-y-1">
          <div className="font-medium text-sm text-foreground">{billNo}</div>
          <div className="text-xs text-muted-foreground">
            {job?.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A'}
          </div>
          <div className="text-xs text-muted-foreground">
            Total: ₹{job?.bill?.total?.toLocaleString() || '0'}
          </div>
        </div>
      </td>
      
      <td className="px-4 py-4">
        <Badge variant="outline" className="text-xs">
          {itemType}
        </Badge>
      </td>
      
      <td className="px-4 py-4">
        <div className="max-w-40">
          {Object.keys(measurements).length > 0 ? (
            <div className="space-y-1">
              {Object.entries(measurements).slice(0, 3).map(([key, value]) => (
                <div key={key} className="text-xs text-muted-foreground">
                  <span className="font-medium">{key}:</span> {value}
                </div>
              ))}
              {Object.keys(measurements).length > 3 && (
                <div className="text-xs text-muted-foreground">+{Object.keys(measurements).length - 3} more</div>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No measurements</span>
          )}
        </div>
      </td>
      
      <td className="px-4 py-4">
        <div className="max-w-40">
          <p className="text-xs text-muted-foreground line-clamp-3" title={description}>
            {description}
          </p>
        </div>
      </td>
      
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-1">
          {designImages.length > 0 ? (
            designImages.slice(0, 2).map((image: string, index: number) => (
              <div key={index} className="relative">
                <img 
                  src={image} 
                  alt={`Design ${index + 1}`}
                  className="w-12 h-12 object-cover rounded border border-border cursor-pointer hover:scale-110 transition-transform"
                  onClick={() => window.open(image, '_blank')}
                />
              </div>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">No images</span>
          )}
          {designImages.length > 2 && (
            <div className="w-12 h-12 bg-muted rounded border border-border flex items-center justify-center">
              <span className="text-xs text-muted-foreground">+{designImages.length - 2}</span>
            </div>
          )}
        </div>
      </td>
      
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-1">
          {designDrawings.length > 0 ? (
            designDrawings.slice(0, 2).map((drawing: string, index: number) => (
              <div key={index} className="relative">
                <img 
                  src={drawing} 
                  alt={`Drawing ${index + 1}`}
                  className="w-12 h-12 object-cover rounded border border-border cursor-pointer hover:scale-110 transition-transform"
                  onClick={() => window.open(drawing, '_blank')}
                />
              </div>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">No drawings</span>
          )}
          {designDrawings.length > 2 && (
            <div className="w-12 h-12 bg-muted rounded border border-border flex items-center justify-center">
              <span className="text-xs text-muted-foreground">+{designDrawings.length - 2}</span>
            </div>
          )}
        </div>
      </td>
      
      <td className="px-4 py-4">
        <div className="space-y-2">
          <Badge className={getStatusColor(curStage)} variant="outline">
            {getStatusIcon(curStage)}
            <span className="ml-1 capitalize">{curStage.replace('_', ' ')}</span>
          </Badge>
          {showStageActions && (
            <div className="flex gap-1">
              {curStage === 'cutting' && getStageStatus(job, 'cutting') === 'pending' && (
                <Button size="sm" variant="outline" className="text-xs" onClick={() => updateStage(job._id, 'cutting', 'in_progress')}>Start</Button>
              )}
              {curStage === 'cutting' && getStageStatus(job, 'cutting') === 'in_progress' && (
                <Button size="sm" variant="outline" className="text-xs" onClick={() => updateStage(job._id, 'cutting', 'completed')}>Complete</Button>
              )}
              {curStage === 'stitching' && getStageStatus(job, 'stitching') === 'pending' && (
                <Button size="sm" variant="outline" className="text-xs" onClick={() => updateStage(job._id, 'stitching', 'in_progress')}>Start</Button>
              )}
              {curStage === 'stitching' && getStageStatus(job, 'stitching') === 'in_progress' && (
                <Button size="sm" variant="outline" className="text-xs" onClick={() => updateStage(job._id, 'stitching', 'completed')}>Complete</Button>
              )}
              {curStage === 'finishing' && getStageStatus(job, 'finishing') === 'pending' && (
                <Button size="sm" variant="outline" className="text-xs" onClick={() => updateStage(job._id, 'finishing', 'in_progress')}>Start</Button>
              )}
              {curStage === 'finishing' && getStageStatus(job, 'finishing') === 'in_progress' && (
                <Button size="sm" variant="outline" className="text-xs" onClick={() => updateStage(job._id, 'finishing', 'completed')}>Complete</Button>
              )}
              {curStage === 'packaging' && (
                (job as any)?.status === 'delivered' ? (
                  <Badge className="bg-green-100 text-green-800 border-green-300">Delivered</Badge>
                ) : (
                  <Button size="sm" className="text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => deliverOrder(job._id)}>🚚 Deliver</Button>
                )
              )}
            </div>
          )}
        </div>
      </td>
      
      <td className="px-4 py-4">
        <div className="space-y-2 min-w-20">
          <div className="text-xs text-muted-foreground text-center">{progress}%</div>
          <Progress value={progress} className="h-2" />
          <div className="text-xs text-muted-foreground text-center">
            Stage {['cutting', 'stitching', 'finishing', 'packaging'].indexOf(curStage) + 1}/4
          </div>
        </div>
      </td>
    </tr>
  )

  const generateAdminQRCode = (upiId: string, amount = 100) => {
    if (!upiId.trim()) return ""

    const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent("STAR TAILORS")}&am=${amount}&cu=INR&tn=${encodeURIComponent("Sample Bill Payment")}`
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`
  }

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    }

    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError("")

      // Fetch lightweight stats first for a faster initial render
      try {
        const statsRes = await api.dashboard.getStats()
        setStats((prev) => ({
          ...prev,
          totalCustomers: statsRes.total_customers ?? prev.totalCustomers,
          activeOrders: statsRes.total_bills ?? prev.activeOrders,
          activeTailors: statsRes.total_tailors ?? prev.activeTailors,
          pendingJobs: statsRes.pending_jobs ?? prev.pendingJobs,
          totalRevenue: statsRes.total_revenue ?? prev.totalRevenue,
        }))
      } catch (e: any) {
        console.warn("Failed to load fast stats:", e?.message || e)
      }

      // Load heavier lists in parallel with reasonable limits
      const [customersRes, billsRes, tailorsRes, jobsRes, upiRes, bizRes] = await Promise.all([
        api.customers.getAll({ limit: 50 }).catch((e) => ({ customers: [], error: e.message })),
        api.bills.getAll({ limit: 50 }).catch((e) => ({ bills: [], error: e.message })),
        api.tailors.getAll({ limit: 50 }).catch((e) => ({ tailors: [], error: e.message })),
        api.jobs.getAll({ limit: 50, page: 1 }).catch((e) => ({ jobs: [], error: e.message })),
        api.settings.getUpi().catch((e) => ({ upiId: "startailors@paytm", error: e.message })),
        api.settings.getBusiness().catch((e) => ({ business_name: "STAR TAILORS", error: e.message })),
      ])

      // Check for errors in responses
      const errors = [customersRes.error, billsRes.error, tailorsRes.error, jobsRes.error, upiRes.error, bizRes.error].filter(Boolean)

      if (errors.length > 0) {
        console.error("Errors loading data:", errors)
        setError("Partial data loaded. Some features may not work.")
      }

      // Process data
      const customers: Customer[] = customersRes.customers || []
      const rawBills: any[] = billsRes.bills || []
      const tailors: Tailor[] = tailorsRes.tailors || []
      const jobs: Job[] = jobsRes.jobs || []

      // Normalize bill fields from backend -> UI shape
      const normalizedBills: Bill[] = rawBills.map((b: any) => ({
        _id: b._id,
        customerName: b.customer_name || b.customer?.name || b.customerName,
        customer_id: b.customer_id,
        items: Array.isArray(b.items)
          ? b.items.map((it: any) => ({
              itemType: it.itemType || it.type || "",
              quantity: it.quantity ?? it.qty ?? 0,
              rate: it.rate ?? it.price ?? 0,
              amount: it.amount ?? it.total ?? (it.quantity ?? 0) * (it.price ?? 0),
            }))
          : [],
        subtotal: b.subtotal ?? 0,
        discount: b.discount ?? 0,
        advanceAmount: b.advance ?? b.advanceAmount ?? 0,
        totalAmount: b.total ?? b.totalAmount ?? 0,
        status: b.status || "pending",
        createdAt: b.created_at || b.createdAt || new Date().toISOString(),
        notes: b.special_instructions || b.notes,
      }))

      // Merge job status into bills for Orders tab
      const mergedOrders: Bill[] = normalizedBills.map((bill) => {
        const job = jobs.find((j) => j.bill_id === bill._id)
        return {
          ...bill,
          jobStatus: (job?.status as any) || (bill.status as any) || "pending",
          jobId: job?._id,
        }
      })

      setJobsList(jobs)
      setOrders(mergedOrders)
      setFilteredOrders(mergedOrders)

      // ... existing stats calculation code ...
      const activeOrders = normalizedBills.filter(
        (bill: Bill) => bill.status === "pending" || bill.status === "in_progress",
      ).length
      const completedOrders = normalizedBills.filter((bill: Bill) => bill.status === "completed").length
      const totalRevenue = normalizedBills.reduce((sum: number, bill: Bill) => sum + (bill.totalAmount || 0), 0)
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      const monthlyRevenue = normalizedBills
        .filter((bill: Bill) => {
          const billDate = new Date(bill.createdAt)
          return billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear
        })
        .reduce((sum: number, bill: Bill) => sum + (bill.totalAmount || 0), 0)

      const outstandingAmount = normalizedBills
        .filter((bill: Bill) => bill.status === "pending")
        .reduce((sum: number, bill: Bill) => sum + ((bill.totalAmount || 0) - (bill.advanceAmount || 0)), 0)

      const activeTailors = tailors.filter((tailor: Tailor) => tailor.status === "active").length
      const pendingJobs = jobs.filter((job: Job) => job.status === "assigned" || job.status === "acknowledged").length

      setStats({
        totalCustomers: customers.length,
        activeOrders,
        completedOrders,
        totalRevenue,
        monthlyRevenue,
        outstandingAmount,
        activeTailors,
        pendingJobs,
      })

      // Generate recent activity from real data
      const activity: RecentActivity[] = []

      // Add recent bills
      normalizedBills.slice(0, 3).forEach((bill: Bill) => {
        activity.push({
          id: `bill-${bill._id}`,
          type: "order",
          message: `New order from ${bill.customerName} - ${bill.items?.[0]?.itemType || "Order"}`,
          timestamp: new Date(bill.createdAt).toLocaleString(),
          status: "info",
        })
      })

      // Add recent jobs
      jobs.slice(0, 2).forEach((job: Job) => {
        activity.push({
          id: `job-${job._id}`,
          type: "job",
          message: `Job ${job.status === "completed" ? "completed" : "assigned"} - ${job.itemType}`,
          timestamp: new Date(job.createdAt).toLocaleString(),
          status: job.status === "completed" ? "success" : "info",
        })
      })

      setRecentActivity(activity.slice(0, 5))

      // Generate alerts from real data
      const alertsList: Alert[] = []

      if (pendingJobs > 0) {
        alertsList.push({
          id: "pending-jobs",
          type: "job",
          title: "Pending Jobs",
          message: `${pendingJobs} jobs are waiting for tailor attention`,
          priority: pendingJobs > 5 ? "high" : "medium",
          timestamp: "Now",
        })
      }

      if (outstandingAmount > 0) {
        alertsList.push({
          id: "outstanding-payments",
          type: "payment",
          title: "Outstanding Payments",
          message: `₹${outstandingAmount.toLocaleString()} in outstanding payments`,
          priority: outstandingAmount > 20000 ? "high" : "medium",
          timestamp: "Now",
        })
      }

      setAlerts(alertsList)

      // Set UPI settings
      const upiVal = (upiRes && (upiRes.upi_id || upiRes.upiId)) || "startailors@paytm"
      const bizName = (upiRes && (upiRes.business_name || upiRes.businessName)) || businessName || "STAR TAILORS"
      setUpiId(upiVal)
      setBusinessName(bizName)
      setQrCodeUrl(generateAdminQRCode(upiVal))
    } catch (err: any) {
      console.error("Error loading dashboard data:", err)
      setError(err.message || "Failed to load dashboard data")

      // If it's an authentication error, log the user out
      if (err.message.includes("401") || err.message.includes("Token")) {
        handleLogout()
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let filtered = [...orders]

    // Filter by search term
    if (orderSearchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.customerName.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
          order._id.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
          order.items.some((item) => item.itemType.toLowerCase().includes(orderSearchTerm.toLowerCase())),
      )
    }

    // Filter by job status (from Tailor Management)
    if (orderStatusFilter !== "all") {
      filtered = filtered.filter((order) => (order.jobStatus || "pending") === orderStatusFilter)
    }

    // Sort orders
    filtered.sort((a, b) => {
      switch (orderSortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case "amount-high":
          return (b.totalAmount || 0) - (a.totalAmount || 0)
        case "amount-low":
          return (a.totalAmount || 0) - (b.totalAmount || 0)
        default:
          return 0
      }
    })

    setFilteredOrders(filtered)
  }, [orders, orderSearchTerm, orderStatusFilter, orderSortBy])

  const handleOrderStatusUpdate = async (orderId: string, newStatus: "pending" | "in_progress" | "completed") => {
    try {
      await api.bills.updateStatus(orderId, newStatus)

      // Update local state
      setOrders((prev) => prev.map((order) => (order._id === orderId ? { ...order, status: newStatus } : order)))

      // Refresh dashboard data to update stats
      loadDashboardData()

      alert("Order status updated successfully!")
    } catch (err: any) {
      console.error("Error updating order status:", err)
      alert("Failed to update order status. Please try again.")
    }
  }

  const handleViewOrderDetails = (order: Bill) => {
    setSelectedOrder(order)
    setShowOrderDetails(true)
  }

  const handleLogout = () => {
    // Clear both possible token keys for safety
    localStorage.removeItem("auth_token")
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/")
  }

  const backfillMissingJobs = async () => {
    const proceed = typeof window !== 'undefined' ? window.confirm('Backfill jobs for all existing bills? This will create missing jobs for bills that do not yet have a job. Continue?') : true
    if (!proceed) return
    try {
      setIsBackfilling(true)
      const res: any = await api.workflow.backfill({ dry_run: false, limit: 5000 })
      await loadDashboardData()
      alert(`Backfill complete: created ${res?.created ?? 0}, skipped ${res?.skipped_existing ?? 0}`)
    } catch (error: any) {
      console.error('Backfill failed:', error)
      alert(error?.message || 'Backfill failed')
    } finally {
      setIsBackfilling(false)
    }
  }

  const handleUpiUpdate = async () => {
    if (!upiId.trim()) return

    try {
      await api.settings.updateUpi(upiId.trim(), businessName.trim())
      setIsEditingUpi(false)
      setQrCodeUrl(generateAdminQRCode(upiId.trim()))
      alert("UPI ID updated successfully! This will be used in all new bills.")
    } catch (err: any) {
      console.error("Error updating UPI:", err)
      alert("Failed to update UPI ID. Please try again.")
    }
  }

  // Business Information state and update

  const handleUpiChange = (value: string) => {
    setUpiId(value)
    if (value.trim()) {
      setQrCodeUrl(generateAdminQRCode(value.trim()))
    } else {
      setQrCodeUrl("")
    }
  }

  const handleBusinessUpdate = async () => {
    try {
      await api.settings.updateBusiness({
        business_name: businessName.trim() || "STAR TAILORS",
        address: businessInfo.address || "",
        phone: businessInfo.phone || "",
        email: businessInfo.email || "",
      })
      alert("Business information updated for new bills.")
    } catch (err: any) {
      console.error("Error updating business info:", err)
      alert("Failed to update business information. Please try again.")
    }
  }

  const getActivityIcon = (type: RecentActivity["type"]) => {
    switch (type) {
      case "order":
        return <Receipt className="h-4 w-4" />
      case "payment":
        return <IndianRupee className="h-4 w-4" />
      case "job":
        return <Scissors className="h-4 w-4" />
      case "customer":
        return <Users className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getActivityColor = (status: RecentActivity["status"]) => {
    switch (status) {
      case "success":
        return "text-green-600 bg-green-50"
      case "warning":
        return "text-yellow-600 bg-yellow-50"
      case "error":
        return "text-red-600 bg-red-50"
      default:
        return "text-blue-600 bg-blue-50"
    }
  }

  const getAlertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "overdue":
        return <Clock className="h-4 w-4" />
      case "payment":
        return <IndianRupee className="h-4 w-4" />
      case "job":
        return <Scissors className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getAlertColor = (priority: Alert["priority"]) => {
    switch (priority) {
      case "high":
        return "border-red-200 bg-red-50"
      case "medium":
        return "border-yellow-200 bg-yellow-50"
      default:
        return "border-blue-200 bg-blue-50"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "assigned":
        return "bg-blue-900/20 text-blue-400 border-blue-500/30"
      case "acknowledged":
        return "bg-indigo-900/20 text-indigo-400 border-indigo-500/30"
      case "in_progress":
        return "bg-yellow-900/20 text-yellow-400 border-yellow-500/30"
      case "completed":
        return "bg-green-900/20 text-green-400 border-green-500/30"
      case "delivered":
        return "bg-purple-900/20 text-purple-400 border-purple-500/30"
      case "pending":
        return "bg-orange-900/20 text-orange-400 border-orange-500/30"
      default:
        return "bg-gray-900/20 text-gray-400 border-gray-500/30"
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "assigned":
        return <Package className="h-4 w-4" />
      case "acknowledged":
      case "in_progress":
        return <Clock className="h-4 w-4" />
      case "completed":
      case "delivered":
        return <CheckCircle className="h-4 w-4" />
      case "pending":
        return <Package className="h-4 w-4" />
      default:
        return <XCircle className="h-4 w-4" />
    }
  }

  // Workflow helpers for table view
  const getStageStatus = (
    job: Partial<Job> & { workflow_stages?: any[] },
    stageName: "cutting" | "stitching" | "finishing" | "packaging",
  ): "pending" | "in_progress" | "completed" | "on_hold" => {
    const s = (job.workflow_stages || []).find((st: any) => st?.name === stageName)
    return (s?.status as any) || "pending"
  }

  const getStageBadgeClass = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "in_progress":
        return "bg-blue-100 text-blue-800"
      case "on_hold":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStageIcon = (stageName: string) => {
    switch (stageName) {
      case "cutting":
        return Scissors
      case "stitching":
        return FileText
      case "finishing":
        return Paintbrush
      case "packaging":
        return Package
      default:
        return Clock
    }
  }

  const updateStage = async (
    jobId: string,
    stageName: "cutting" | "stitching" | "finishing" | "packaging",
    status: "pending" | "in_progress" | "completed" | "on_hold",
  ) => {
    try {
      await api.jobs.updateWorkflowStage(jobId, stageName, { status })
      
      // If finishing is completed, automatically move to packaging
      if (stageName === "finishing" && status === "completed") {
        await api.jobs.updateWorkflowStage(jobId, "packaging", { status: "pending" })
        alert("Finishing completed! Item moved to packaging.")
      } else {
        alert("Workflow stage updated successfully")
      }
      
      await loadDashboardData()
    } catch (err: any) {
      console.error("Failed to update stage:", err)
      alert(err?.message || "Failed to update stage")
    }
  }

  const deliverOrder = async (jobId: string) => {
    try {
      await api.jobs.updateStatus(jobId, "delivered")
      alert("Order marked as delivered successfully!")
      await loadDashboardData()
    } catch (err: any) {
      console.error("Failed to deliver order:", err)
      alert(err?.message || "Failed to deliver order")
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Loading dashboard...</p>
          </div>
        </div>
      ) : error ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-medium mb-4">{error}</p>
            <Button onClick={loadDashboardData} variant="secondary">
              Try Again
            </Button>
          </div>
        </div>
      ) : (
        <>
          <header className="bg-card/80 backdrop-blur-md shadow-lg border-b border-border sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <MobileNav user={user} onLogout={handleLogout} />
                  <div className="flex items-center ml-2 md:ml-0">
                    <Sparkles className="h-6 w-6 text-primary mr-2" />
                    <h1 className="text-xl font-bold text-foreground">
                      STAR TAILORS
                    </h1>
                  </div>
                  <Badge
                    variant="outline"
                    className="ml-3 hidden sm:inline-flex"
                  >
                    Admin Panel
                  </Badge>
                </div>
                <div className="flex items-center space-x-2 md:space-x-4">
                  <div className="relative hidden sm:block">
                    <Button variant="outline" size="sm">
                      <Bell className="h-4 w-4" />
                      {alerts.length > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs"
                        >
                          {alerts.length}
                        </Badge>
                      )}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={backfillMissingJobs}
                    disabled={isBackfilling}
                    className="hidden md:inline-flex"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isBackfilling ? 'animate-spin' : ''}`} />
                    Backfill Workflow
                  </Button>
                  <span className="text-sm text-muted-foreground hidden sm:inline font-medium">
                    Welcome, {user?.username}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="hidden md:inline-flex"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
            <div className="mb-6 md:mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Dashboard Overview</h2>
              <p className="text-muted-foreground text-sm md:text-base font-medium">
                Real-time insights into your tailoring business
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
              <div className="overflow-x-auto">
                <TabsList className="flex w-full flex-nowrap whitespace-nowrap bg-card/60 backdrop-blur-sm border border-border">
                  <TabsTrigger
                    value="overview"
                    className="text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="orders"
                    className="text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Orders
                  </TabsTrigger>
                  <TabsTrigger
                    value="workflow"
                    className="text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Workflow
                  </TabsTrigger>
                  <TabsTrigger
                    value="analytics"
                    className="text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Analytics
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Activity
                  </TabsTrigger>
                  <TabsTrigger
                    value="alerts"
                    className="text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Alerts
                  </TabsTrigger>
                  <TabsTrigger
                    value="settings"
                    className="text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Settings
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                  <Card className="bg-card/70 backdrop-blur-sm border-border hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
                      <div className="p-2 bg-primary/20 text-primary rounded-lg">
                        <Users className="h-3 w-3 md:h-4 md:w-4" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg md:text-2xl font-bold text-foreground">
                        {stats.totalCustomers}
                      </div>
                      <p className="text-xs text-green-500 font-medium">
                        <TrendingUp className="inline h-2 w-2 md:h-3 md:w-3 mr-1" />
                        +12% from last month
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/70 backdrop-blur-sm border-border hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Active Orders</CardTitle>
                      <div className="p-2 bg-primary/20 text-primary rounded-lg">
                        <Receipt className="h-3 w-3 md:h-4 md:w-4" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg md:text-2xl font-bold text-foreground">
                        {stats.activeOrders}
                      </div>
                      <p className="text-xs text-green-500 font-medium">
                        <TrendingUp className="inline h-2 w-2 md:h-3 md:w-3 mr-1" />
                        +5% from yesterday
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/70 backdrop-blur-sm border-border hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Monthly Revenue</CardTitle>
                      <div className="p-2 bg-primary/20 text-primary rounded-lg">
                        <IndianRupee className="h-3 w-3 md:h-4 md:w-4" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg md:text-2xl font-bold text-foreground">
                        ₹{stats.monthlyRevenue.toLocaleString()}
                      </div>
                      <p className="text-xs text-green-500 font-medium">
                        <TrendingUp className="inline h-2 w-2 md:h-3 md:w-3 mr-1" />
                        +18% from last month
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/70 backdrop-blur-sm border-border hover:shadow-xl hover:shadow-destructive/10 transition-all duration-300 hover:-translate-y-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Outstanding Amount</CardTitle>
                      <div className="p-2 bg-destructive/20 text-destructive rounded-lg">
                        <AlertTriangle className="h-3 w-3 md:h-4 md:w-4" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg md:text-2xl font-bold text-destructive">
                        ₹{stats.outstandingAmount.toLocaleString()}
                      </div>
                      <p className="text-xs text-red-500 font-medium">
                        <TrendingDown className="inline h-2 w-2 md:h-3 md:w-3 mr-1" />
                        -8% from last week
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  <Card
                    className="bg-white/70 backdrop-blur-sm border-violet-100 hover:shadow-xl hover:shadow-violet-100/50 transition-all duration-300 cursor-pointer hover:-translate-y-1 group"
                    onClick={() => router.push("/admin/customers")}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-700 group-hover:text-violet-700 transition-colors">
                        Customer Management
                      </CardTitle>
                      <div className="p-2 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-lg group-hover:scale-110 transition-transform">
                        <Users className="h-4 w-4 text-white" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl md:text-2xl font-bold mb-1 bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                        {stats.totalCustomers}
                      </div>
                      <p className="text-xs text-gray-600">Manage customer records</p>
                    </CardContent>
                  </Card>

                  <Card
                    className="bg-white/70 backdrop-blur-sm border-violet-100 hover:shadow-xl hover:shadow-violet-100/50 transition-all duration-300 cursor-pointer hover:-translate-y-1 group"
                    onClick={() => { if (typeof window !== 'undefined') window.location.href = "/admin/billing" }}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-700 group-hover:text-violet-700 transition-colors">
                        Billing System
                      </CardTitle>
                      <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg group-hover:scale-110 transition-transform">
                        <Receipt className="h-4 w-4 text-white" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl md:text-2xl font-bold mb-1 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        {stats.activeOrders}
                      </div>
                      <p className="text-xs text-gray-600">Create bills with QR codes</p>
                    </CardContent>
                  </Card>

                  

                  <Card
                    className="bg-white/70 backdrop-blur-sm border-violet-100 hover:shadow-xl hover:shadow-violet-100/50 transition-all duration-300 cursor-pointer hover:-translate-y-1 group"
                    onClick={() => router.push("/admin/reports")}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-700 group-hover:text-violet-700 transition-colors">
                        Reports & Analytics
                      </CardTitle>
                      <div className="p-2 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-lg group-hover:scale-110 transition-transform">
                        <BarChart3 className="h-4 w-4 text-white" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl md:text-2xl font-bold mb-1 bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                        ₹{stats.totalRevenue.toLocaleString()}
                      </div>
                      <p className="text-xs text-gray-600">Business insights</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="orders" className="space-y-6">
                {/* Orders Header with Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-white/70 backdrop-blur-sm border-violet-100">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Orders</p>
                          <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                        </div>
                        <Receipt className="h-8 w-8 text-violet-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/70 backdrop-blur-sm border-violet-100">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Pending</p>
                          <p className="text-2xl font-bold text-yellow-600">
                            {
                              orders.filter((o) => (o.jobStatus ?? "pending") === "pending" || o.jobStatus === "assigned").length
                            }
                          </p>
                        </div>
                        <Package className="h-8 w-8 text-yellow-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/70 backdrop-blur-sm border-violet-100">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">In Progress</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {orders.filter((o) => o.jobStatus === "in_progress" || o.jobStatus === "acknowledged").length}
                          </p>
                        </div>
                        <Clock className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/70 backdrop-blur-sm border-violet-100">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Completed</p>
                          <p className="text-2xl font-bold text-green-600">
                            {orders.filter((o) => o.jobStatus === "completed" || o.jobStatus === "delivered").length}
                          </p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Orders Filters and Search */}
                <Card className="bg-white/70 backdrop-blur-sm border-violet-100">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            placeholder="Search orders by customer name, order ID, or item type..."
                            value={orderSearchTerm}
                            onChange={(e) => setOrderSearchTerm(e.target.value)}
                            className="pl-10 bg-white/80 border-violet-200 focus:border-violet-500"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                          <SelectTrigger className="w-40 bg-white/80 border-violet-200">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending (no job)</SelectItem>
                            <SelectItem value="assigned">Assigned</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select value={orderSortBy} onValueChange={setOrderSortBy}>
                          <SelectTrigger className="w-40 bg-white/80 border-violet-200">
                            <SelectValue placeholder="Sort by" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                            <SelectItem value="amount-high">Amount: High to Low</SelectItem>
                            <SelectItem value="amount-low">Amount: Low to High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Orders List */}
                <div className="space-y-4">
                  {filteredOrders.length === 0 ? (
                    <Card className="bg-white/70 backdrop-blur-sm border-violet-100">
                      <CardContent className="p-12 text-center">
                        <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                        <p className="text-gray-600">
                          {orderSearchTerm || orderStatusFilter !== "all"
                            ? "Try adjusting your search or filters"
                            : "No orders have been created yet"}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    filteredOrders.map((order) => (
                      <Card
                        key={order._id}
                        className="bg-white/70 backdrop-blur-sm border-violet-100 hover:shadow-lg transition-all duration-300"
                      >
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-gray-900">{order.customerName}</h3>
                                <Badge className={`${getStatusColor(order.jobStatus || "pending")} border`}>
                                  {getStatusIcon(order.jobStatus || "pending")}
                                  <span className="ml-1 capitalize">{(order.jobStatus || "pending").replace("_", " ")}</span>
                                </Badge>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <Receipt className="h-4 w-4" />
                                  <span>Order ID: {order._id.slice(-8)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <IndianRupee className="h-4 w-4" />
                                  <span className="font-medium">₹{order.totalAmount?.toLocaleString()}</span>
                                </div>
                              </div>

                              <div className="mt-3">
                                <p className="text-sm text-gray-700">
                                  <strong>Items:</strong>{" "}
                                  {order.items?.map((item) => `${item.quantity}x ${item.itemType}`).join(", ")}
                                </p>
                                {order.notes && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    <strong>Notes:</strong> {order.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-2">
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                {/* Order Details Modal */}
                {showOrderDetails && selectedOrder && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
                      <CardHeader className="border-b">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-xl">Order Details</CardTitle>
                            <CardDescription>Order ID: {selectedOrder._id}</CardDescription>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setShowOrderDetails(false)}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="p-6 space-y-6">
                        {/* Customer Information */}
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-3">Customer Information</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-gray-500" />
                              <span>{selectedOrder.customerName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`${getStatusColor(selectedOrder.status)} border`}>
                                {getStatusIcon(selectedOrder.status)}
                                <span className="ml-1 capitalize">{selectedOrder.status.replace("_", " ")}</span>
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
                          <div className="space-y-2">
                            {selectedOrder.items?.map((item, index) => (
                              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <div>
                                  <span className="font-medium">{item.itemType}</span>
                                  <span className="text-gray-600 ml-2">x{item.quantity}</span>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium">₹{item.amount?.toLocaleString()}</div>
                                  <div className="text-sm text-gray-600">₹{item.rate} each</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Payment Summary */}
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-3">Payment Summary</h3>
                          <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span>₹{selectedOrder.subtotal?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Discount:</span>
                              <span>-₹{selectedOrder.discount?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Advance Paid:</span>
                              <span>₹{selectedOrder.advanceAmount?.toLocaleString()}</span>
                            </div>
                            <div className="border-t pt-2 flex justify-between font-semibold">
                              <span>Total Amount:</span>
                              <span>₹{selectedOrder.totalAmount?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-red-600">
                              <span>Outstanding:</span>
                              <span>
                                ₹
                                {(
                                  (selectedOrder.totalAmount || 0) - (selectedOrder.advanceAmount || 0)
                                ).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Order Notes */}
                        {selectedOrder.notes && (
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-3">Notes</h3>
                            <p className="text-gray-700 p-3 bg-gray-50 rounded-lg">{selectedOrder.notes}</p>
                          </div>
                        )}

                        {/* Order Timeline */}
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-3">Order Timeline</h3>
                          <div className="text-sm text-gray-600">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="h-4 w-4" />
                              <span>Created: {new Date(selectedOrder.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="workflow" className="space-y-6">
                <Card className="bg-card/70 backdrop-blur-sm border-border hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="text-foreground">Workflow Management</CardTitle>
                    <CardDescription className="text-muted-foreground">Complete job details with design assets organized by stage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={activeWorkflowTab} onValueChange={setActiveWorkflowTab} className="space-y-4">
                      <TabsList className="grid w-full grid-cols-6">
                        <TabsTrigger value="all" className="text-sm">
                          <Package className="w-4 h-4 mr-2" />
                          All Jobs ({jobsList.filter(j => (j as any).status !== 'delivered').length})
                        </TabsTrigger>
                        <TabsTrigger value="cutting" className="text-sm">
                          <Scissors className="w-4 h-4 mr-2" />
                          Cutting ({jobsList.filter(j => j.current_stage === 'cutting' && (j as any).status !== 'delivered').length})
                        </TabsTrigger>
                        <TabsTrigger value="stitching" className="text-sm">
                          <FileText className="w-4 h-4 mr-2" />
                          Stitching ({jobsList.filter(j => j.current_stage === 'stitching' && (j as any).status !== 'delivered').length})
                        </TabsTrigger>
                        <TabsTrigger value="finishing" className="text-sm">
                          <Paintbrush className="w-4 h-4 mr-2" />
                          Finishing ({jobsList.filter(j => j.current_stage === 'finishing' && (j as any).status !== 'delivered').length})
                        </TabsTrigger>
                        <TabsTrigger value="packaging" className="text-sm">
                          <Package className="w-4 h-4 mr-2" />
                          Packaging ({jobsList.filter(j => j.current_stage === 'packaging' && (j as any).status !== 'delivered').length})
                        </TabsTrigger>
                        <TabsTrigger value="delivered" className="text-sm">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Delivered ({jobsList.filter(j => (j as any).status === 'delivered').length})
                        </TabsTrigger>
                      </TabsList>

                      {/* All Jobs Tab */}
                      <TabsContent value="all">
                        <div className="overflow-x-auto">
                          <table className="min-w-full border-separate border-spacing-y-2">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="text-left px-4 py-3 rounded-l-lg text-sm font-medium text-muted-foreground">Customer Details</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Bill Info</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Item Type</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Measurements</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Description</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Design Images</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Design Drawings</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Current Stage</th>
                                <th className="text-left px-4 py-3 rounded-r-lg text-sm font-medium text-muted-foreground">Progress</th>
                              </tr>
                            </thead>
                            <tbody>
                              {jobsList
                                .filter((j) => (j as any).status !== 'delivered')
                                .map((job: any) => {
                                  const customerName = job?.bill?.customer_name || 'Unknown Customer'
                                  const customerPhone = job?.bill?.customer_phone || 'N/A'
                                  const customerAddress = job?.bill?.customer_address || 'N/A'
                                  const billNo = job?.bill?.bill_no_str ? `#${job.bill.bill_no_str}` : (job.bill_id ? `#${String(job.bill_id).slice(-6)}` : '—')
                                  const itemType = job.itemType || job?.bill?.items?.[0]?.type || 'N/A'
                                  const measurements = job?.bill?.items?.[0]?.measurements || {}
                                  const description = job?.bill?.items?.[0]?.description || job?.bill?.special_instructions || 'No description'
                                  const designImages = job?.bill?.design_images || []
                                  const designDrawings = job?.bill?.drawings || []
                                  const curStage = (job?.current_stage || 'cutting') as 'cutting' | 'stitching' | 'finishing' | 'packaging'
                                  const progress = Math.round(job?.progress_percentage ?? 0)
                                  
                                  return (
                                    <WorkflowTableRow key={job._id} job={job} customerName={customerName} customerPhone={customerPhone} customerAddress={customerAddress} billNo={billNo} itemType={itemType} measurements={measurements} description={description} designImages={designImages} designDrawings={designDrawings} curStage={curStage} progress={progress} />
                                  )
                                })}
                            </tbody>
                          </table>
                        </div>
                      </TabsContent>

                      {/* Finishing Tab */}
                      <TabsContent value="finishing">
                        <div className="overflow-x-auto">
                          <table className="min-w-full border-separate border-spacing-y-2">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="text-left px-4 py-3 rounded-l-lg text-sm font-medium text-muted-foreground">Customer Details</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Bill Info</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Item Type</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Measurements</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Description</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Design Images</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Design Drawings</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Stage Actions</th>
                                <th className="text-left px-4 py-3 rounded-r-lg text-sm font-medium text-muted-foreground">Progress</th>
                              </tr>
                            </thead>
                            <tbody>
                              {jobsList
                                .filter((j) => j.current_stage === 'finishing' && (j as any).status !== 'delivered')
                                .map((job: any) => {
                                  const customerName = job?.bill?.customer_name || 'Unknown Customer'
                                  const customerPhone = job?.bill?.customer_phone || 'N/A'
                                  const customerAddress = job?.bill?.customer_address || 'N/A'
                                  const billNo = job?.bill?.bill_no_str ? `#${job.bill.bill_no_str}` : (job.bill_id ? `#${String(job.bill_id).slice(-6)}` : '—')
                                  const itemType = job.itemType || job?.bill?.items?.[0]?.type || 'N/A'
                                  const measurements = job?.bill?.items?.[0]?.measurements || {}
                                  const description = job?.bill?.items?.[0]?.description || job?.bill?.special_instructions || 'No description'
                                  const designImages = job?.bill?.design_images || []
                                  const designDrawings = job?.bill?.drawings || []
                                  const curStage = (job?.current_stage || 'finishing') as 'cutting' | 'stitching' | 'finishing' | 'packaging'
                                  const progress = Math.round(job?.progress_percentage ?? 0)
                                  
                                  return (
                                    <WorkflowTableRow key={job._id} job={job} customerName={customerName} customerPhone={customerPhone} customerAddress={customerAddress} billNo={billNo} itemType={itemType} measurements={measurements} description={description} designImages={designImages} designDrawings={designDrawings} curStage={curStage} progress={progress} showStageActions={true} />
                                  )
                                })}
                            </tbody>
                          </table>
                        </div>
                      </TabsContent>

                      {/* Delivered Tab */}
                      <TabsContent value="delivered">
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="border-green-200">
                              <CardContent className="p-4 text-center">
                                <div className="text-sm text-muted-foreground">Total Delivered</div>
                                <div className="text-2xl font-bold text-green-700">
                                  {jobsList.filter(j => (j as any).status === 'delivered').length}
                                </div>
                              </CardContent>
                            </Card>
                            <Card className="border-green-200">
                              <CardContent className="p-4 text-center">
                                <div className="text-sm text-muted-foreground">Delivered Today</div>
                                <div className="text-2xl font-bold text-green-700">
                                  {jobsList.filter(j => (j as any).status === 'delivered' && (j as any).updated_at && new Date((j as any).updated_at).toDateString() === new Date().toDateString()).length}
                                </div>
                              </CardContent>
                            </Card>
                            <Card className="border-green-200">
                              <CardContent className="p-4 text-center">
                                <div className="text-sm text-muted-foreground">Total Delivered Value (₹)</div>
                                <div className="text-2xl font-bold text-green-700">
                                  {jobsList.filter(j => (j as any).status === 'delivered').reduce((sum, j: any) => sum + (j?.bill?.total || 0), 0).toLocaleString()}
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="min-w-full border-separate border-spacing-y-2">
                              <thead className="bg-green-50">
                                <tr>
                                  <th className="text-left px-4 py-3 rounded-l-lg text-sm font-medium text-green-700">Customer</th>
                                  <th className="text-left px-4 py-3 text-sm font-medium text-green-700">Bill</th>
                                  <th className="text-left px-4 py-3 text-sm font-medium text-green-700">Amount</th>
                                  <th className="text-left px-4 py-3 text-sm font-medium text-green-700">Delivered On</th>
                                  <th className="text-left px-4 py-3 rounded-r-lg text-sm font-medium text-green-700">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {jobsList.filter(j => (j as any).status === 'delivered').map((job: any) => {
                                  const customer = job?.bill?.customer_name || 'Unknown'
                                  const billNo = job?.bill?.bill_no_str ? `#${job.bill.bill_no_str}` : (job.bill_id ? `#${String(job.bill_id).slice(-6)}` : '—')
                                  const totalAmount = job?.bill?.total || 0
                                  const deliveredOn = (job as any)?.updated_at ? new Date((job as any).updated_at).toLocaleString() : '—'
                                  return (
                                    <tr key={job._id} className="bg-white border border-green-200">
                                      <td className="px-4 py-3">{customer}</td>
                                      <td className="px-4 py-3">{billNo}</td>
                                      <td className="px-4 py-3">₹{totalAmount.toLocaleString()}</td>
                                      <td className="px-4 py-3">{deliveredOn}</td>
                                      <td className="px-4 py-3">
                                        <Badge className="bg-green-100 text-green-800 border-green-300">✅ Delivered</Badge>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </TabsContent>

                      {/* Cutting Tab */}
                      <TabsContent value="cutting">
                        <div className="overflow-x-auto">
                          <table className="min-w-full border-separate border-spacing-y-2">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="text-left px-4 py-3 rounded-l-lg text-sm font-medium text-muted-foreground">Customer Details</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Bill Info</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Item Type</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Measurements</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Description</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Design Images</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Design Drawings</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Stage Actions</th>
                                <th className="text-left px-4 py-3 rounded-r-lg text-sm font-medium text-muted-foreground">Progress</th>
                              </tr>
                            </thead>
                            <tbody>
                              {jobsList
                                .filter((j) => j.current_stage === 'cutting' && (j as any).status !== 'completed')
                                .map((job: any) => {
                                  const customerName = job?.bill?.customer_name || 'Unknown Customer'
                                  const customerPhone = job?.bill?.customer_phone || 'N/A'
                                  const customerAddress = job?.bill?.customer_address || 'N/A'
                                  const billNo = job?.bill?.bill_no_str ? `#${job.bill.bill_no_str}` : (job.bill_id ? `#${String(job.bill_id).slice(-6)}` : '—')
                                  const itemType = job.itemType || job?.bill?.items?.[0]?.type || 'N/A'
                                  const measurements = job?.bill?.items?.[0]?.measurements || {}
                                  const description = job?.bill?.items?.[0]?.description || job?.bill?.special_instructions || 'No description'
                                  const designImages = job?.bill?.design_images || []
                                  const designDrawings = job?.bill?.drawings || []
                                  const curStage = (job?.current_stage || 'cutting') as 'cutting' | 'stitching' | 'finishing' | 'packaging'
                                  const progress = Math.round(job?.progress_percentage ?? 0)
                                  
                                  return (
                                    <WorkflowTableRow key={job._id} job={job} customerName={customerName} customerPhone={customerPhone} customerAddress={customerAddress} billNo={billNo} itemType={itemType} measurements={measurements} description={description} designImages={designImages} designDrawings={designDrawings} curStage={curStage} progress={progress} showStageActions={true} />
                                  )
                                })}
                            </tbody>
                          </table>
                        </div>
                      </TabsContent>

                      {/* Stitching Tab */}
                      <TabsContent value="stitching">
                        <div className="overflow-x-auto">
                          <table className="min-w-full border-separate border-spacing-y-2">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="text-left px-4 py-3 rounded-l-lg text-sm font-medium text-muted-foreground">Customer Details</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Bill Info</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Item Type</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Measurements</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Description</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Design Images</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Design Drawings</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Stage Actions</th>
                                <th className="text-left px-4 py-3 rounded-r-lg text-sm font-medium text-muted-foreground">Progress</th>
                              </tr>
                            </thead>
                            <tbody>
                              {jobsList
                                .filter((j) => j.current_stage === 'stitching' && (j as any).status !== 'completed')
                                .map((job: any) => {
                                  const customerName = job?.bill?.customer_name || 'Unknown Customer'
                                  const customerPhone = job?.bill?.customer_phone || 'N/A'
                                  const customerAddress = job?.bill?.customer_address || 'N/A'
                                  const billNo = job?.bill?.bill_no_str ? `#${job.bill.bill_no_str}` : (job.bill_id ? `#${String(job.bill_id).slice(-6)}` : '—')
                                  const itemType = job.itemType || job?.bill?.items?.[0]?.type || 'N/A'
                                  const measurements = job?.bill?.items?.[0]?.measurements || {}
                                  const description = job?.bill?.items?.[0]?.description || job?.bill?.special_instructions || 'No description'
                                  const designImages = job?.bill?.design_images || []
                                  const designDrawings = job?.bill?.drawings || []
                                  const curStage = (job?.current_stage || 'cutting') as 'cutting' | 'stitching' | 'finishing' | 'packaging'
                                  const progress = Math.round(job?.progress_percentage ?? 0)
                                  
                                  return (
                                    <WorkflowTableRow key={job._id} job={job} customerName={customerName} customerPhone={customerPhone} customerAddress={customerAddress} billNo={billNo} itemType={itemType} measurements={measurements} description={description} designImages={designImages} designDrawings={designDrawings} curStage={curStage} progress={progress} showStageActions={true} />
                                  )
                                })}
                            </tbody>
                          </table>
                        </div>
                      </TabsContent>

                      {/* Packaging Tab */}
                      <TabsContent value="packaging">
                        <div className="space-y-4">
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                              🚚 Delivery Center
                            </h3>
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              Items that have completed all stages (cutting, stitching, finishing) and are ready for delivery. Click "Deliver Order" to mark as delivered.
                            </p>
                          </div>
                          
                          <div className="overflow-x-auto">
                            <table className="min-w-full border-separate border-spacing-y-2">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="text-left px-4 py-3 rounded-l-lg text-sm font-medium text-muted-foreground">Customer & Delivery</th>
                                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Bill & Payment</th>
                                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Item Details</th>
                                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Final Measurements</th>
                                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Instructions</th>
                                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Design Reference</th>
                                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Quality Status</th>
                                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Delivery Actions</th>
                                  <th className="text-left px-4 py-3 rounded-r-lg text-sm font-medium text-muted-foreground">Delivery Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {jobsList
                                  .filter((j) => j.current_stage === 'packaging' && (j as any).status !== 'delivered')
                                  .map((job: any) => {
                                    const customerName = job?.bill?.customer_name || 'Unknown Customer'
                                    const customerPhone = job?.bill?.customer_phone || 'N/A'
                                    const customerAddress = job?.bill?.customer_address || 'N/A'
                                    const billNo = job?.bill?.bill_no_str ? `#${job.bill.bill_no_str}` : (job.bill_id ? `#${String(job.bill_id).slice(-6)}` : '—')
                                    const itemType = job.itemType || job?.bill?.items?.[0]?.type || 'N/A'
                                    const measurements = job?.bill?.items?.[0]?.measurements || {}
                                    const description = job?.bill?.items?.[0]?.description || job?.bill?.special_instructions || 'Ready for delivery'
                                    const designImages = job?.bill?.design_images || []
                                    const designDrawings = job?.bill?.drawings || []
                                    const curStage = (job?.current_stage || 'cutting') as 'cutting' | 'stitching' | 'finishing' | 'packaging'
                                    const progress = Math.round(job?.progress_percentage ?? 0)
                                    const totalAmount = job?.bill?.total || 0
                                    const advanceAmount = job?.bill?.advance || 0
                                    const balanceAmount = totalAmount - advanceAmount
                                    
                                    return (
                                      <tr key={job._id} className="bg-card/80 hover:bg-muted/30 transition-colors border border-border rounded-lg">
                                        {/* Customer & Delivery */}
                                        <td className="px-4 py-4">
                                          <div className="space-y-1">
                                            <div className="font-medium text-foreground">{customerName}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                              📞 {customerPhone}
                                            </div>
                                            {customerAddress !== 'N/A' && (
                                              <div className="text-xs text-muted-foreground max-w-32 truncate flex items-center gap-1" title={customerAddress}>
                                                📍 {customerAddress}
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                        
                                        {/* Bill & Payment */}
                                        <td className="px-4 py-4">
                                          <div className="space-y-1">
                                            <div className="font-medium text-sm text-foreground">{billNo}</div>
                                            <div className="text-xs text-muted-foreground">
                                              📅 {job?.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A'}
                                            </div>
                                            <div className="text-xs text-foreground font-medium">
                                              💰 Total: ₹{totalAmount.toLocaleString()}
                                            </div>
                                            {balanceAmount > 0 ? (
                                              <div className="text-xs text-destructive font-medium">
                                                ⚠️ Pending: ₹{balanceAmount.toLocaleString()}
                                              </div>
                                            ) : (
                                              <div className="text-xs text-green-600 font-medium">
                                                ✅ Paid
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                        
                                        {/* Item Details */}
                                        <td className="px-4 py-4">
                                          <div className="space-y-1">
                                            <Badge variant="outline" className="text-xs">
                                              {itemType}
                                            </Badge>
                                            {job?.bill?.items?.[0]?.quantity && (
                                              <div className="text-xs text-muted-foreground">
                                                Qty: {job.bill.items[0].quantity}
                                              </div>
                                            )}
                                            <div className="text-xs text-muted-foreground">
                                              Created: {job?.createdAt ? Math.ceil((Date.now() - new Date(job.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0} days ago
                                            </div>
                                          </div>
                                        </td>
                                        
                                        {/* Final Measurements */}
                                        <td className="px-4 py-4">
                                          <div className="max-w-40">
                                            {Object.keys(measurements).length > 0 ? (
                                              <div className="space-y-1">
                                                {Object.entries(measurements).slice(0, 4).map(([key, value]) => (
                                                  <div key={key} className="text-xs text-muted-foreground">
                                                    <span className="font-medium">{key}:</span> {value}
                                                  </div>
                                                ))}
                                                {Object.keys(measurements).length > 4 && (
                                                  <div className="text-xs text-primary cursor-pointer" onClick={() => alert(`All measurements: ${JSON.stringify(measurements, null, 2)}`)}>+{Object.keys(measurements).length - 4} more</div>
                                                )}
                                              </div>
                                            ) : (
                                              <span className="text-xs text-muted-foreground">Standard size</span>
                                            )}
                                          </div>
                                        </td>
                                        
                                        {/* Instructions */}
                                        <td className="px-4 py-4">
                                          <div className="max-w-40 space-y-2">
                                            <p className="text-xs text-muted-foreground line-clamp-2" title={description}>
                                              {description}
                                            </p>
                                            <Badge variant="secondary" className="text-xs">
                                              🚚 Ready for Delivery
                                            </Badge>
                                          </div>
                                        </td>
                                        
                                        {/* Design Reference */}
                                        <td className="px-4 py-4">
                                          <div className="flex flex-wrap gap-1">
                                            {(designImages.length > 0 || designDrawings.length > 0) ? (
                                              <>
                                                {designImages.slice(0, 1).map((image: string, index: number) => (
                                                  <div key={`img-${index}`} className="relative group">
                                                    <img 
                                                      src={image} 
                                                      alt={`Design ${index + 1}`}
                                                      className="w-10 h-10 object-cover rounded border border-border cursor-pointer hover:scale-110 transition-transform"
                                                      onClick={() => window.open(image, '_blank')}
                                                    />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded transition-colors" />
                                                  </div>
                                                ))}
                                                {designDrawings.slice(0, 1).map((drawing: string, index: number) => (
                                                  <div key={`draw-${index}`} className="relative group">
                                                    <img 
                                                      src={drawing} 
                                                      alt={`Drawing ${index + 1}`}
                                                      className="w-10 h-10 object-cover rounded border border-border cursor-pointer hover:scale-110 transition-transform"
                                                      onClick={() => window.open(drawing, '_blank')}
                                                    />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded transition-colors" />
                                                  </div>
                                                ))}
                                                {(designImages.length + designDrawings.length) > 2 && (
                                                  <div className="w-10 h-10 bg-muted rounded border border-border flex items-center justify-center cursor-pointer hover:bg-muted/80">
                                                    <span className="text-xs text-muted-foreground">+{(designImages.length + designDrawings.length) - 2}</span>
                                                  </div>
                                                )}
                                              </>
                                            ) : (
                                              <span className="text-xs text-muted-foreground">No reference</span>
                                            )}
                                          </div>
                                        </td>
                                        
                                        {/* Quality Status */}
                                        <td className="px-4 py-4">
                                          <div className="space-y-1">
                                            <div className="flex flex-col gap-1">
                                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                                                ✅ Cutting Done
                                              </Badge>
                                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                                                ✅ Stitching Done
                                              </Badge>
                                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                                                ✅ Finishing Done
                                              </Badge>
                                            </div>
                                            <div className="text-xs text-green-600 font-medium mt-1">
                                              🏆 Quality Approved
                                            </div>
                                          </div>
                                        </td>
                                        
                                        {/* Delivery Actions */}
                                        <td className="px-4 py-4">
                                          <div className="space-y-2">
                                            {getStageStatus(job, 'packaging') === 'pending' && (
                                              <Button 
                                                size="sm"
                                                variant="outline"
                                                className="text-xs"
                                                onClick={() => updateStage(job._id, 'packaging', 'in_progress')}
                                              >
                                                ▶️ Start Packing
                                              </Button>
                                            )}

                                            {getStageStatus(job, 'packaging') === 'in_progress' && (
                                              <Button 
                                                size="sm"
                                                variant="outline"
                                                className="text-xs"
                                                onClick={() => updateStage(job._id, 'packaging', 'completed')}
                                              >
                                                ✅ Ready to Deliver
                                              </Button>
                                            )}

                                            {getStageStatus(job, 'packaging') === 'completed' && (
                                              <div className="flex flex-col gap-1">
                                                <Badge className="bg-green-100 text-green-800 border-green-300" variant="outline">
                                                  🏆 Ready for Delivery
                                                </Badge>
                                                <Button 
                                                  size="sm" 
                                                  className="text-xs bg-green-600 hover:bg-green-700 text-white" 
                                                  onClick={() => {
                                                    const confirm = window.confirm(`Deliver order ${billNo}?\n\nCustomer: ${customerName}\nPhone: ${customerPhone}\nTotal: ₹${totalAmount.toLocaleString()}${balanceAmount > 0 ? `\nPending Payment: ₹${balanceAmount.toLocaleString()}` : ''}\n\nThis will mark the order as delivered.`)
                                                    if (confirm) {
                                                      deliverOrder(job._id)
                                                    }
                                                  }}
                                                >
                                                  🚚 Deliver Order
                                                </Button>
                                                {balanceAmount > 0 && (
                                                  <div className="text-xs text-destructive font-medium mt-1">
                                                    💰 Collect ₹{balanceAmount.toLocaleString()}
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                        
                                        {/* Delivery Status */}
                                        <td className="px-4 py-4">
                                          <div className="space-y-2 min-w-24">
                                            <div className="text-center">
                                              <div className="text-lg font-bold text-foreground">{progress}%</div>
                                              <Progress value={progress} className="h-3" />
                                            </div>
                                            <div className="text-xs text-center">
                                              {getStageStatus(job, 'packaging') === 'completed' ? (
                                                <Badge className="bg-green-100 text-green-800 border-green-300">
                                                  🎉 Ready for Delivery!
                                                </Badge>
                                              ) : (
                                                <span className="text-muted-foreground">Final Stage</span>
                                              )}
                                            </div>
                                            {getStageStatus(job, 'packaging') === 'in_progress' && (
                                              <div className="text-xs text-center text-blue-600 font-medium">
                                                ⏱️ In Progress
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    )
                                  })}
                              </tbody>
                            </table>
                          </div>
                          
                          {/* Delivery Summary (not delivered) */}
                          <div className="mt-6 grid grid-cols-3 gap-4">
                            <Card>
                              <CardContent className="p-4 text-center">
                                <div className="text-lg font-bold text-green-600">
                                  {jobsList.filter(j => j.current_stage === 'packaging' && (j as any).status !== 'delivered').length}
                                </div>
                                <div className="text-xs text-muted-foreground">Ready for Delivery</div>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="p-4 text-center">
                                <div className="text-lg font-bold text-blue-600">
                                  {jobsList.filter(j => (j as any).status === 'delivered').length}
                                </div>
                                <div className="text-xs text-muted-foreground">Delivered Today</div>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="p-4 text-center">
                                <div className="text-lg font-bold text-primary">
                                  ₹{jobsList
                                    .filter(j => {
                                      const finishingStatus = getStageStatus(j, 'finishing')
                                      return finishingStatus === 'completed' && (j as any).status !== 'delivered'
                                    })
                                    .reduce((sum, j) => sum + ((j?.bill?.total || 0) - (j?.bill?.advance || 0)), 0)
                                    .toLocaleString()}
                                </div>
                                <div className="text-xs text-muted-foreground">Pending Collections</div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      </TabsContent>

                      {/* Packaging Tab */}
                      <TabsContent value="packaging">
                        <div className="space-y-4">
                          
                          <div className="overflow-x-auto">
                            <table className="min-w-full border-separate border-spacing-y-2">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="text-left px-4 py-3 rounded-l-lg text-sm font-medium text-muted-foreground">Customer Details</th>
                                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Bill & Delivery Info</th>
                                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Item Details</th>
                                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Final Measurements</th>
                                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Packaging Instructions</th>
                                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Design Reference</th>
                                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Quality Check</th>
                                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Packaging Actions</th>
                                  <th className="text-left px-4 py-3 rounded-r-lg text-sm font-medium text-muted-foreground">Delivery Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {jobsList
                                  .filter((j) => j.current_stage === 'packaging' && (j as any).status !== 'completed' && (j as any).status !== 'delivered')
                                  .map((job: any) => {
                                    const customerName = job?.bill?.customer_name || 'Unknown Customer'
                                    const customerPhone = job?.bill?.customer_phone || 'N/A'
                                    const customerAddress = job?.bill?.customer_address || 'N/A'
                                    const billNo = job?.bill?.bill_no_str ? `#${job.bill.bill_no_str}` : (job.bill_id ? `#${String(job.bill_id).slice(-6)}` : '—')
                                    const itemType = job.itemType || job?.bill?.items?.[0]?.type || 'N/A'
                                    const measurements = job?.bill?.items?.[0]?.measurements || {}
                                    const description = job?.bill?.items?.[0]?.description || job?.bill?.special_instructions || 'Ready for packaging'
                                    const designImages = job?.bill?.design_images || []
                                    const designDrawings = job?.bill?.drawings || []
                                    const curStage = (job?.current_stage || 'cutting') as 'cutting' | 'stitching' | 'finishing' | 'packaging'
                                    const progress = Math.round(job?.progress_percentage ?? 0)
                                    const packagingStatus = getStageStatus(job, 'packaging')
                                    const totalAmount = job?.bill?.total || 0
                                    const advanceAmount = job?.bill?.advance || 0
                                    const balanceAmount = totalAmount - advanceAmount
                                    
                                    return (
                                      <tr key={job._id} className="bg-card/80 hover:bg-muted/30 transition-colors border border-border rounded-lg">
                                        <td className="px-4 py-4">
                                          <div className="space-y-1">
                                            <div className="font-medium text-foreground">{customerName}</div>
                                            <div className="text-xs text-muted-foreground">📞 {customerPhone}</div>
                                            {customerAddress !== 'N/A' && (
                                              <div className="text-xs text-muted-foreground max-w-32 truncate" title={customerAddress}>
                                                📍 {customerAddress}
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                        
                                        <td className="px-4 py-4">
                                          <div className="space-y-1">
                                            <div className="font-medium text-sm text-foreground">{billNo}</div>
                                            <div className="text-xs text-muted-foreground">
                                              📅 {job?.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A'}
                                            </div>
                                            <div className="text-xs text-foreground font-medium">
                                              💰 Total: ₹{totalAmount.toLocaleString()}
                                            </div>
                                            {balanceAmount > 0 && (
                                              <div className="text-xs text-red-600 font-medium">
                                                ⚠️ Balance: ₹{balanceAmount.toLocaleString()}
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                        
                                        <td className="px-4 py-4">
                                          <div className="space-y-1">
                                            <Badge variant="outline" className="text-xs">
                                              {itemType}
                                            </Badge>
                                            {job?.bill?.items?.[0]?.quantity && (
                                              <div className="text-xs text-muted-foreground">
                                                Qty: {job.bill.items[0].quantity}
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                        
                                        <td className="px-4 py-4">
                                          <div className="max-w-40">
                                            {Object.keys(measurements).length > 0 ? (
                                              <div className="space-y-1">
                                                {Object.entries(measurements).slice(0, 4).map(([key, value]) => (
                                                  <div key={key} className="text-xs text-muted-foreground">
                                                    <span className="font-medium">{key}:</span> {value}
                                                  </div>
                                                ))}
                                                {Object.keys(measurements).length > 4 && (
                                                  <div className="text-xs text-muted-foreground">+{Object.keys(measurements).length - 4} more</div>
                                                )}
                                              </div>
                                            ) : (
                                              <span className="text-xs text-muted-foreground">Standard measurements</span>
                                            )}
                                          </div>
                                        </td>
                                        
                                        <td className="px-4 py-4">
                                          <div className="max-w-40 space-y-2">
                                            <p className="text-xs text-muted-foreground line-clamp-2" title={description}>
                                              {description}
                                            </p>
                                            <div className="text-xs">
                                              <Badge variant="secondary" className="text-xs">
                                                📦 Ready to Pack
                                              </Badge>
                                            </div>
                                          </div>
                                        </td>
                                        
                                        <td className="px-4 py-4">
                                          <div className="flex gap-1">
                                            {designImages.slice(0, 1).map((image: string, index: number) => (
                                              <div key={`img-${index}`} className="w-10 h-10 bg-muted rounded border border-border flex items-center justify-center text-xs">IMG</div>
                                            ))}
                                          </div>
                                        </td>
                                        
                                        {/* Stage Actions column will replace Quality Check here */}
                                        
                                        <td className="px-4 py-4">
                                          <div className="space-y-2">
                                            <Badge 
                                              className={`${packagingStatus === 'pending' ? 'bg-orange-100 text-orange-800' : 
                                                         packagingStatus === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                                                         'bg-green-100 text-green-800'} border`}
                                              variant="outline"
                                            >
                                              {packagingStatus === 'pending' && '📦 Ready to Pack'}
                                              {packagingStatus === 'in_progress' && '🔄 Packaging...'}
                                              {packagingStatus === 'completed' && '✅ Packed'}
                                            </Badge>
                                            
                                            <div className="flex flex-col gap-1">
                                              {packagingStatus === 'pending' && (
                                                <Button 
                                                  size="sm" 
                                                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white" 
                                                  onClick={() => updateStage(job._id, 'packaging', 'in_progress')}
                                                >
                                                  📦 Start Packaging
                                                </Button>
                                              )}
                                              {packagingStatus === 'in_progress' && (
                                                <Button 
                                                  size="sm" 
                                                  className="text-xs bg-green-600 hover:bg-green-700 text-white" 
                                                  onClick={() => updateStage(job._id, 'packaging', 'completed')}
                                                >
                                                  🚚 Complete & Deliver
                                                </Button>
                                              )}
                                            </div>
                                          </div>
                                        </td>
                                        
                                        <td className="px-4 py-4">
                                          <div className="space-y-2 min-w-24">
                                            <div className="text-center">
                                              <div className="text-lg font-bold text-foreground">{progress}%</div>
                                              <Progress value={progress} className="h-3" />
                                            </div>
                                            <div className="text-xs text-center text-muted-foreground">
                                              {packagingStatus === 'completed' ? '🎉 Ready for Delivery!' : 'Final Stage'}
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )
                                  })}
                              </tbody>
                            </table>
                          </div>
                          
                          {/* Packaging Summary */}
                          <div className="mt-6 grid grid-cols-3 gap-4">
                            <Card>
                              <CardContent className="p-4 text-center">
                                <div className="text-lg font-bold text-orange-600">
                                  {jobsList.filter(j => j.current_stage === 'packaging' && getStageStatus(j, 'packaging') === 'pending').length}
                                </div>
                                <div className="text-xs text-muted-foreground">Ready to Pack</div>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="p-4 text-center">
                                <div className="text-lg font-bold text-blue-600">
                                  {jobsList.filter(j => j.current_stage === 'packaging' && getStageStatus(j, 'packaging') === 'in_progress').length}
                                </div>
                                <div className="text-xs text-muted-foreground">Packaging in Progress</div>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="p-4 text-center">
                                <div className="text-lg font-bold text-green-600">
                                  {jobsList.filter(j => (j as any).status === 'delivered' || getStageStatus(j, 'packaging') === 'completed').length}
                                </div>
                                <div className="text-xs text-muted-foreground">Delivered Today</div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                    
                    {/* Summary Stats */}
                    <div className="mt-6 grid grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-lg font-bold text-foreground">
                            {jobsList.filter(j => j.current_stage === 'cutting').length}
                          </div>
                          <div className="text-xs text-muted-foreground">Cutting</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-lg font-bold text-foreground">
                            {jobsList.filter(j => j.current_stage === 'stitching').length}
                          </div>
                          <div className="text-xs text-muted-foreground">Stitching</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-lg font-bold text-foreground">
                            {jobsList.filter(j => j.current_stage === 'finishing').length}
                          </div>
                          <div className="text-xs text-muted-foreground">Finishing</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-lg font-bold text-foreground">
                            {jobsList.filter(j => j.current_stage === 'packaging').length}
                          </div>
                          <div className="text-xs text-muted-foreground">Packaging</div>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Order Status Distribution */}
                  <Card className="bg-white/70 backdrop-blur-sm border-violet-100 hover:shadow-xl hover:shadow-violet-100/50 transition-all duration-300 hover:-translate-y-1">
                    <CardHeader>
                      <CardTitle className="text-gray-700">Order Status Distribution</CardTitle>
                      <CardDescription className="text-violet-600">Current status of all orders</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">Completed</span>
                          <span className="text-sm font-medium text-gray-700">{stats.completedOrders}</span>
                        </div>
                        <Progress value={75} className="h-2 bg-violet-200" />

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">In Progress</span>
                          <span className="text-sm font-medium text-gray-700">{stats.activeOrders}</span>
                        </div>
                        <Progress value={60} className="h-2 bg-violet-200" />

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">Pending</span>
                          <span className="text-sm font-medium text-gray-700">{stats.pendingJobs}</span>
                        </div>
                        <Progress value={30} className="h-2 bg-violet-200" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tailor Performance */}
                  <Card className="bg-white/70 backdrop-blur-sm border-violet-100 hover:shadow-xl hover:shadow-violet-100/50 transition-all duration-300 hover:-translate-y-1">
                    <CardHeader>
                      <CardTitle className="text-gray-700">Tailor Performance</CardTitle>
                      <CardDescription className="text-violet-600">Top performing tailors this month</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-700">Sunita Sharma</div>
                            <div className="text-sm text-gray-500">23 jobs completed</div>
                          </div>
                          <Badge variant="secondary" className="bg-violet-100 text-violet-700 border-violet-200">
                            ★ 4.9
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-700">Ramesh Patil</div>
                            <div className="text-sm text-gray-500">19 jobs completed</div>
                          </div>
                          <Badge variant="secondary" className="bg-violet-100 text-violet-700 border-violet-200">
                            ★ 4.8
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-700">Vijay Kumar</div>
                            <div className="text-sm text-gray-500">15 jobs completed</div>
                          </div>
                          <Badge variant="secondary" className="bg-violet-100 text-violet-700 border-violet-200">
                            ★ 4.6
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Revenue Trends */}
                  <Card className="bg-white/70 backdrop-blur-sm border-violet-100 hover:shadow-xl hover:shadow-violet-100/50 transition-all duration-300 hover:-translate-y-1">
                    <CardHeader>
                      <CardTitle className="text-gray-700">Revenue Trends</CardTitle>
                      <CardDescription className="text-violet-600">Monthly revenue comparison</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">December 2024</span>
                          <span className="text-sm font-medium text-gray-700">₹45,000</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">November 2024</span>
                          <span className="text-sm font-medium text-gray-700">₹38,200</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">October 2024</span>
                          <span className="text-sm font-medium text-gray-700">₹42,800</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">September 2024</span>
                          <span className="text-sm font-medium text-gray-700">₹39,500</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Customer Insights */}
                  <Card className="bg-white/70 backdrop-blur-sm border-violet-100 hover:shadow-xl hover:shadow-violet-100/50 transition-all duration-300 hover:-translate-y-1">
                    <CardHeader>
                      <CardTitle className="text-gray-700">Customer Insights</CardTitle>
                      <CardDescription className="text-violet-600">Customer behavior analysis</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">New Customers</span>
                          <span className="text-sm font-medium text-green-600">+15 this month</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">Repeat Customers</span>
                          <span className="text-sm font-medium text-gray-700">78%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">Average Order Value</span>
                          <span className="text-sm font-medium text-gray-700">₹1,850</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">Customer Satisfaction</span>
                          <span className="text-sm font-medium text-gray-700">4.7/5</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="space-y-6">
                <Card className="bg-white/70 backdrop-blur-sm border-violet-100 hover:shadow-xl hover:shadow-violet-100/50 transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="text-gray-700">Recent Activity</CardTitle>
                    <CardDescription className="text-violet-600">Live updates from your business</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-3">
                          <div className={`p-2 rounded-full ${getActivityColor(activity.status)}`}>
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                            <p className="text-xs text-gray-500">{activity.timestamp}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="alerts" className="space-y-6">
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <Card
                      key={alert.id}
                      className={`border-l-4 ${getAlertColor(alert.priority)} bg-white/70 backdrop-blur-sm`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">{getAlertIcon(alert.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
                              <Badge
                                variant={alert.priority === "high" ? "destructive" : "secondary"}
                                className="bg-violet-100 text-violet-700 border-violet-200"
                              >
                                {alert.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                            <p className="text-xs text-gray-500 mt-2">{alert.timestamp}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-white/70 backdrop-blur-sm border-violet-100 hover:shadow-xl hover:shadow-violet-100/50 transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-gray-800">
                        <div className="p-2 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-lg">
                          <IndianRupee className="h-5 w-5 text-white" />
                        </div>
                        UPI Payment Settings
                      </CardTitle>
                      <CardDescription className="text-violet-600">
                        Manage your UPI ID for QR code generation in bills
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Current UPI ID</label>
                        {isEditingUpi ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={upiId}
                              onChange={(e) => handleUpiChange(e.target.value)}
                              className="flex-1 px-3 py-2 border border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
                              placeholder="Enter UPI ID (e.g., yourname@paytm)"
                            />
                            <Button
                              onClick={handleUpiUpdate}
                              size="sm"
                              className="bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600"
                            >
                              Save
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIsEditingUpi(false)}
                              className="border-violet-200 hover:bg-violet-50"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-lg border border-violet-100">
                            <span className="font-mono text-sm text-violet-700">{upiId}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIsEditingUpi(true)}
                              className="border-violet-200 hover:bg-violet-50"
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          </div>
                        )}
                      </div>

                      {qrCodeUrl && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">QR Code Preview</label>
                          <div className="flex flex-col items-center p-6 bg-gradient-to-br from-white to-violet-50 border-2 border-dashed border-violet-300 rounded-xl">
                            <div className="p-3 bg-white rounded-lg shadow-lg">
                              <img
                                src={qrCodeUrl || "/placeholder.svg"}
                                alt="UPI QR Code Preview"
                                className="w-32 h-32"
                              />
                            </div>
                            <p className="text-xs text-violet-600 text-center mt-3 font-medium">
                              Sample QR code for ₹100
                              <br />
                              This is how it will appear in bills
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• This UPI ID will be used in all generated bills</li>
                          <li>• QR codes will automatically include the bill amount</li>
                          <li>• Customers can scan and pay instantly</li>
                          <li>• Changes apply to all new bills immediately</li>
                        </ul>
                      </div>

                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-2">Current Status:</h4>
                        <div className="flex items-center gap-2 text-sm text-green-800">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          UPI payments are active and ready
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Business Information */}
                  <Card className="bg-white/70 backdrop-blur-sm border-violet-100 hover:shadow-xl hover:shadow-violet-100/50 transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-gray-800">
                        <div className="p-2 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-lg">
                          <Settings className="h-5 w-5 text-white" />
                        </div>
                        Business Information
                      </CardTitle>
                      <CardDescription className="text-violet-600">
                        Update your business details for bills and receipts
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                    <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Business Name</label>
                          <input
                            type="text"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Address</label>
                          <textarea
                            value={(businessInfo.address ?? "") as string}
                            onChange={(e) => setBusinessInfo((prev: any) => ({ ...prev, address: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
                            rows={3}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Phone Number</label>
                          <input
                            type="tel"
                            value={(businessInfo.phone ?? "") as string}
                            onChange={(e) => setBusinessInfo((prev: any) => ({ ...prev, phone: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Email</label>
                          <input
                            type="email"
                            value={(businessInfo.email ?? "") as string}
                            onChange={(e) => setBusinessInfo((prev: any) => ({ ...prev, email: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
                          />
                        </div>
                      </div>

                      <Button onClick={handleBusinessUpdate} className="w-full bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white">
                        Update Business Information
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </main>

          <BottomNav userRole={user?.role} />
        </>
      )}
    </div>
  )
}
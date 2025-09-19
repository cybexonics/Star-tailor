"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import {
  LogOut,
  RefreshCw,
  Search,
  Filter,
  AlertCircle,
  Clock,
  CheckCircle,
  Users,
  Package,
  Sparkles,
  Loader2,
  AlertTriangle,
  Scissors,
  FileText,
  Paintbrush,
  Calendar,
  TrendingUp,
  Activity,
  Timer,
  Bell,
  ArrowLeft
} from "lucide-react"

interface WorkflowDashboardData {
  stage_stats: {
    cutting: number
    stitching: number
    finishing: number
    packaging: number
  }
  recent_updates: Array<{
    id: string
    title: string
    current_stage: string
    updated_at: string
  }>
  overdue_jobs: Array<{
    id: string
    title: string
    due_date: string
    current_stage: string
    priority: string
  }>
  total_active_jobs: number
}

interface Job {
  _id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  status: string
  workflow_stages: Array<{
    name: string
    status: string
    assigned_tailor?: string
    assigned_tailor_name?: string
    assigned_tailor_phone?: string
    started_at?: string
    completed_at?: string
    notes?: string
  }>
  current_stage: 'cutting' | 'stitching' | 'finishing' | 'packaging'
  progress_percentage: number
  created_at: string
  updated_at: string
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

const STAGE_ICONS = {
  cutting: Scissors,
  stitching: FileText,
  finishing: Paintbrush,
  packaging: Package
}

const STAGE_COLORS = {
  cutting: 'from-red-500 to-red-600',
  stitching: 'from-blue-500 to-blue-600',
  finishing: 'from-purple-500 to-purple-600',
  packaging: 'from-green-500 to-green-600'
}

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
}

export function WorkflowAdminDashboard() {
  const [user, setUser] = useState<any>(null)
  const [dashboardData, setDashboardData] = useState<WorkflowDashboardData | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [activeStageTab, setActiveStageTab] = useState<'cutting'|'stitching'|'finishing'|'packaging'>('cutting')
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      loadDashboardData()
    }
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError("")

      // Load workflow dashboard data and jobs in parallel
      const [workflowData, jobsData] = await Promise.all([
        api.workflow.getDashboard(),
        api.jobs.getAll({ limit: 100 })
      ])

      setDashboardData(workflowData)
      setJobs(jobsData.jobs || [])
    } catch (err: any) {
      console.error("Error loading dashboard data:", err)
      setError(err.message || "Failed to load dashboard data")
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    try {
      await loadDashboardData()
      toast({
        title: "Refreshed",
        description: "Dashboard data updated successfully",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
    }
  }

  const handleLogout = () => {
    // Clear both possible token keys for safety
    localStorage.removeItem("auth_token")
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/")
  }

  const getStageIcon = (stageName: string) => {
    const IconComponent = STAGE_ICONS[stageName as keyof typeof STAGE_ICONS] || Clock
    return IconComponent
  }

  const getStageColor = (stageName: string) => {
    return STAGE_COLORS[stageName as keyof typeof STAGE_COLORS] || 'from-gray-500 to-gray-600'
  }

  const getPriorityColor = (priority: string) => {
    return PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || 'bg-gray-100 text-gray-800'
  }

  const matchesSearch = (job: Job) => {
    if (!searchTerm) return true
    const text = `${job.title} ${job.description} ${job.bill?.customer_name || ''} ${job.bill?.customer_phone || ''}`.toLowerCase()
    return text.includes(searchTerm.toLowerCase())
  }

  // Stage-specific views
  const activeJobs = jobs.filter(j => j.status !== 'completed')
  const cuttingJobs = activeJobs.filter(j => j.current_stage === 'cutting' && matchesSearch(j))
  const stitchingJobs = activeJobs.filter(j => j.current_stage === 'stitching' && matchesSearch(j))
  const finishingJobs = activeJobs.filter(j => j.current_stage === 'finishing' && matchesSearch(j))
  const packagingJobs = activeJobs.filter(j => j.current_stage === 'packaging' && matchesSearch(j))

  const getStageStatus = (job: Job, stageName: Job['current_stage']) => {
    const s = job.workflow_stages?.find(st => st.name === stageName)
    return s?.status || 'pending'
  }

  const updateStage = async (job: Job, stageName: Job['current_stage'], status: 'pending' | 'in_progress' | 'completed' | 'on_hold') => {
    try {
      await api.jobs.updateWorkflowStage(job._id, stageName, { status })
      await refreshData()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update stage', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600 mx-auto mb-4" />
          <p className="text-violet-600 font-medium">Loading workflow dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <Button
            onClick={loadDashboardData}
            className="bg-gradient-to-r from-violet-500 to-indigo-500"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50">
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-violet-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center py-3">
            <div className="flex items-center">
              <div className="flex items-center">
                <Sparkles className="h-6 w-6 text-violet-600 mr-2" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  STAR TAILORS
                </h1>
              </div>
              <Badge variant="secondary" className="ml-3 bg-violet-100 text-violet-700 border-violet-200">
                Admin - Workflow Management
              </Badge>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/admin')}
                className="border-violet-200 hover:bg-violet-50 text-violet-700 bg-transparent"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={refreshing}
                className="border-violet-200 hover:bg-violet-50 text-violet-700 bg-transparent"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <span className="hidden md:inline text-sm text-violet-700 font-medium">Welcome, {user?.username}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-violet-200 hover:bg-violet-50 text-violet-700 bg-transparent"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stage Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card className="bg-white/70 backdrop-blur-sm border-violet-100 hover:shadow-xl hover:shadow-violet-100/50 transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                    {dashboardData?.total_active_jobs || 0}
                  </div>
                  <p className="text-sm text-violet-600 font-medium">Active Jobs</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-lg">
                  <Activity className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {dashboardData && Object.entries(dashboardData.stage_stats).map(([stage, count]) => {
            const IconComponent = getStageIcon(stage)
            const colorClass = getStageColor(stage)
            
            return (
              <Card key={stage} className="bg-white/70 backdrop-blur-sm border-violet-100 hover:shadow-xl hover:shadow-violet-100/50 transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                        {count}
                      </div>
                      <p className="text-sm text-violet-600 font-medium capitalize">{stage}</p>
                    </div>
                    <div className={`p-3 bg-gradient-to-br ${colorClass} rounded-lg`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Recent Updates */}
          <Card className="bg-white/70 backdrop-blur-sm border-violet-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-violet-600" />
                Recent Updates
              </CardTitle>
              <CardDescription>Latest workflow progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData?.recent_updates.slice(0, 5).map((update) => (
                  <div key={update.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{update.title}</div>
                      <div className="text-xs text-gray-600 capitalize">
                        Stage: {update.current_stage}
                      </div>
                    </div>
                    <div className="text-xs text-violet-600">
                      {new Date(update.updated_at).toLocaleTimeString()}
                    </div>
                  </div>
                )) || <div className="text-center text-gray-500 py-4">No recent updates</div>}
              </div>
            </CardContent>
          </Card>

          {/* Overdue Jobs */}
          <Card className="bg-white/70 backdrop-blur-sm border-violet-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Overdue Jobs
                {dashboardData && dashboardData.overdue_jobs.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {dashboardData.overdue_jobs.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Jobs past their due date</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData?.overdue_jobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200">
                    <div>
                      <div className="font-medium text-sm">{job.title}</div>
                      <div className="text-xs text-gray-600 capitalize">
                        Stage: {job.current_stage}
                      </div>
                      <div className="text-xs text-red-600">
                        Due: {new Date(job.due_date).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge className={getPriorityColor(job.priority)}>
                      {job.priority}
                    </Badge>
                  </div>
                )) || <div className="text-center text-gray-500 py-4">No overdue jobs</div>}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-white/70 backdrop-blur-sm border-violet-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-violet-600" />
                Quick Actions
              </CardTitle>
              <CardDescription>Manage workflow operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={refreshData}
                disabled={refreshing}
                className="w-full bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
              <Button 
                onClick={() => router.push('/admin/jobs/new')}
                variant="outline" 
                className="w-full border-violet-200 hover:bg-violet-50 text-violet-700"
              >
                <Package className="h-4 w-4 mr-2" />
                Create New Job
              </Button>
              <Button 
                onClick={() => router.push('/admin/reports')}
                variant="outline" 
                className="w-full border-violet-200 hover:bg-violet-50 text-violet-700"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                View Reports
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Workflow Board with Stage Tabs */}
        <Card className="bg-white/70 backdrop-blur-sm border-violet-100">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-violet-600" />
                  Workflow Management
                </CardTitle>
                <CardDescription>Process orders through Cutting → Stitching → Finishing → Packaging</CardDescription>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by customer, phone, or title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-72"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeStageTab} onValueChange={(v) => setActiveStageTab(v as any)} className="w-full">
              <TabsList className="flex flex-wrap gap-2 md:grid md:grid-cols-4 w-full">
                <TabsTrigger value="cutting">Cutting</TabsTrigger>
                <TabsTrigger value="stitching">Stitching</TabsTrigger>
                <TabsTrigger value="finishing">Finishing</TabsTrigger>
                <TabsTrigger value="packaging">Packaging</TabsTrigger>
              </TabsList>

              {(['cutting','stitching','finishing','packaging'] as const).map(stageName => {
                const stageJobs = stageName === 'cutting' ? cuttingJobs : stageName === 'stitching' ? stitchingJobs : stageName === 'finishing' ? finishingJobs : packagingJobs
                const IconComponent = getStageIcon(stageName)
                return (
                  <TabsContent key={stageName} value={stageName} className="mt-6 space-y-4">
                    {stageJobs.length === 0 && (
                      <div className="text-center py-8 text-violet-500">No jobs in {stageName}</div>
                    )}
                    {stageJobs.map((job) => {
                      const st = getStageStatus(job, stageName)
                      return (
                        <div key={job._id} className="p-5 rounded-xl border border-violet-100 bg-gradient-to-r from-white to-violet-50/30">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <IconComponent className="h-4 w-4 text-violet-600" />
                                <div className="font-semibold text-gray-900">
                                  {job.bill?.customer_name || job.title}
                                  {job.bill?.bill_no_str && <span className="text-xs text-gray-500 ml-2">(Bill #{job.bill.bill_no_str})</span>}
                                </div>
                              </div>
                              <div className="text-xs text-gray-600">
                                {job.bill?.customer_phone && <span>Phone: {job.bill.customer_phone}</span>}
                              </div>
                              {job.bill?.items && job.bill.items.length > 0 && (
                                <div className="mt-2">
                                  <div className="text-xs font-medium text-gray-700 mb-1">Bill Items</div>
                                  <div className="space-y-1">
                                    {job.bill.items.map((it, idx) => (
                                      <div key={idx} className="text-xs text-gray-700 bg-white rounded border p-2">
                                        <div className="flex justify-between">
                                          <span><strong>Type:</strong> {it.type || '-'}</span>
                                          <span><strong>Qty:</strong> {it.quantity ?? 1}</span>
                                        </div>
                                        {it.description && (
                                          <div className="mt-1"><strong>Description:</strong> {it.description}</div>
                                        )}
                                        {it.measurements && Object.keys(it.measurements).length > 0 && (
                                          <div className="mt-1">
                                            <strong>Measurements:</strong> {Object.entries(it.measurements).map(([k,v]) => `${k}: ${String(v)}`).join(', ')}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {job.bill?.special_instructions && (
                                <div className="text-xs text-gray-500 mt-1">Notes: {job.bill.special_instructions}</div>
                              )}

                              {/* Design Images */}
                              {job.bill?.design_images && job.bill.design_images.length > 0 && (
                                <div className="mt-3">
                                  <div className="text-xs font-medium text-gray-700 mb-1">Design Images</div>
                                  <div className="flex flex-wrap gap-2">
{job.bill.design_images.map((src, idx) => (
  <button key={idx} type="button" onClick={() => setPreviewSrc(src)} className="focus:outline-none">
    <img src={src} alt={`design-${idx}`} className="w-16 h-16 object-cover rounded border" />
  </button>
))}
                                  </div>
                                </div>
                              )}

                              {/* Drawings */}
                              {job.bill?.drawings && job.bill.drawings.length > 0 && (
                                <div className="mt-3">
                                  <div className="text-xs font-medium text-gray-700 mb-1">Drawings</div>
                                  <div className="flex flex-wrap gap-2">
{job.bill.drawings.map((src, idx) => (
  <button key={idx} type="button" onClick={() => setPreviewSrc(src)} className="focus:outline-none">
    <img src={src} alt={`drawing-${idx}`} className="w-16 h-16 object-cover rounded border" />
  </button>
))}
                                  </div>
                                </div>
                              )}

                              {/* Signature */}
                              {job.bill?.signature && (
                                <div className="mt-3">
                                  <div className="text-xs font-medium text-gray-700 mb-1">Signature</div>
                                  <img src={job.bill.signature} alt="signature" className="h-12 object-contain bg-white rounded border p-1" />
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <Badge className={getPriorityColor(job.priority)}>{job.priority}</Badge>
                              <div className="text-xs text-gray-500 mt-1">Progress {Math.round(job.progress_percentage)}%</div>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={
                                st === 'completed' ? 'bg-green-100 text-green-800' :
                                st === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                st === 'on_hold' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                              }>
                                {st.replace('_', ' ')}
                              </Badge>
                              {job.due_date && (
                                <div className="text-xs text-gray-600 flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" /> Due: {new Date(job.due_date).toLocaleDateString()}
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2">
                              {st === 'pending' && (
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => updateStage(job, stageName, 'in_progress')}>Start</Button>
                              )}
                              {st === 'in_progress' && (
                                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateStage(job, stageName, 'completed')}>Complete</Button>
                              )}
                              {st === 'on_hold' && (
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => updateStage(job, stageName, 'in_progress')}>Resume</Button>
                              )}
                              {stageName === 'packaging' && st === 'completed' && (
                                <Badge className="bg-purple-100 text-purple-800">Ready to deliver</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </TabsContent>
                )
              })}
            </Tabs>
          </CardContent>
        </Card>

        {/* Image Preview Dialog */}
        <Dialog open={!!previewSrc} onOpenChange={(open) => !open && setPreviewSrc(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Preview</DialogTitle>
            </DialogHeader>
            {previewSrc && (
              <img src={previewSrc} alt="preview" className="w-full h-auto object-contain rounded" />
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}

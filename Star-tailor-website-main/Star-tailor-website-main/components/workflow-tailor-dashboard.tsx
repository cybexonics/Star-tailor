"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import {
  LogOut,
  CheckCircle,
  Clock,
  AlertCircle,
  Phone,
  Calendar,
  Sparkles,
  Scissors,
  Loader2,
  AlertTriangle,
  Package,
  Paintbrush,
  Play,
  Pause,
  ChevronRight,
  Timer,
  User,
  FileText
} from "lucide-react"

interface WorkflowStage {
  name: string
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold'
  started_at?: string
  completed_at?: string
  assigned_tailor?: string
  notes?: string
  updated_at: string
}

interface Job {
  _id: string
  title: string
  description: string
  bill_id?: string
  customer_id?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  status: string
  workflow_stages: WorkflowStage[]
  current_stage: string
  progress_percentage: number
  created_at: string
  updated_at: string
  tailor?: {
    name: string
    phone: string
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

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  on_hold: 'bg-yellow-100 text-yellow-800'
}

export function WorkflowTailorDashboard() {
  const [user, setUser] = useState<any>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [stageNotes, setStageNotes] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      loadTailorJobs(parsedUser.id)
    }
  }, [])

  const loadTailorJobs = async (tailorId: string) => {
    try {
      setLoading(true)
      setError("")
      const response = await api.jobs.getAll({ tailor_id: tailorId, limit: 50 })
      setJobs(response.jobs || [])
    } catch (err: any) {
      console.error("Error loading tailor jobs:", err)
      setError(err.message || "Failed to load jobs")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("user")
    localStorage.removeItem("token")
    router.push("/")
  }

  const updateWorkflowStage = async (jobId: string, stageName: string, status: string, notes?: string) => {
    try {
      await api.jobs.updateWorkflowStage(jobId, stageName, { 
        status, 
        notes: notes || stageNotes,
        assigned_tailor: user?.id
      })

      // Reload jobs to get updated workflow data
      await loadTailorJobs(user.id)
      
      setStageNotes("")
      
      toast({
        title: "Stage Updated",
        description: `${stageName} stage marked as ${status.replace('_', ' ')}`,
      })
    } catch (err: any) {
      console.error("Error updating workflow stage:", err)
      toast({
        title: "Error",
        description: "Failed to update stage. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getStageIcon = (stageName: string) => {
    const IconComponent = STAGE_ICONS[stageName as keyof typeof STAGE_ICONS] || Clock
    return IconComponent
  }

  const getStageColor = (stageName: string) => {
    return STAGE_COLORS[stageName as keyof typeof STAGE_COLORS] || 'from-gray-500 to-gray-600'
  }

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800'
  }

  const activeJobs = jobs.filter((job) => job.status !== "completed")
  const myActiveJobs = activeJobs.filter(job => 
    job.workflow_stages?.some(stage => 
      stage.assigned_tailor === user?.id && stage.status !== 'completed'
    )
  )

  // Calculate stage statistics
  const stageStats = {
    cutting: jobs.filter(job => job.current_stage === 'cutting' && job.status !== 'completed').length,
    stitching: jobs.filter(job => job.current_stage === 'stitching' && job.status !== 'completed').length,
    finishing: jobs.filter(job => job.current_stage === 'finishing' && job.status !== 'completed').length,
    packaging: jobs.filter(job => job.current_stage === 'packaging' && job.status !== 'completed').length
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
            onClick={() => user && loadTailorJobs(user.id)}
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
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center">
                <Sparkles className="h-6 w-6 text-violet-600 mr-2" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  STAR TAILORS
                </h1>
              </div>
              <Badge variant="secondary" className="ml-3 bg-violet-100 text-violet-700 border-violet-200">
                Workflow Dashboard
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-violet-700 font-medium">Welcome, {user?.username}</span>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {Object.entries(stageStats).map(([stage, count]) => {
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

        {/* Active Jobs with Workflow */}
        <Card className="mb-8 bg-white/70 backdrop-blur-sm border-violet-100 hover:shadow-xl hover:shadow-violet-100/50 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-gray-800 flex items-center gap-2">
              <Timer className="h-5 w-5 text-violet-600" />
              My Active Jobs ({myActiveJobs.length})
            </CardTitle>
            <CardDescription className="text-violet-600">Jobs assigned to you with workflow stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {activeJobs.map((job) => (
                <div
                  key={job._id}
                  className="p-6 border border-violet-100 rounded-xl bg-gradient-to-r from-white to-violet-50/50 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="font-bold text-gray-800 text-lg">{job.title}</div>
                      <div className="text-sm text-violet-600 font-medium">{job.description}</div>
                      {job.due_date && (
                        <div className="text-sm flex items-center mt-1 text-gray-600">
                          <Calendar className="h-3 w-3 mr-1" />
                          Due: {new Date(job.due_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <Badge className="bg-blue-100 text-blue-800 font-medium">
                        {job.priority}
                      </Badge>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Progress</div>
                        <div className="text-sm font-medium text-violet-600">{Math.round(job.progress_percentage)}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <Progress value={job.progress_percentage} className="h-2" />
                  </div>

                  {/* Workflow Stages */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    {job.workflow_stages?.map((stage, index) => {
                      const IconComponent = getStageIcon(stage.name)
                      const isMyStage = stage.assigned_tailor === user?.id
                      const canWork = stage.status === 'pending' && (index === 0 || job.workflow_stages[index - 1]?.status === 'completed')
                      
                      return (
                        <div
                          key={stage.name}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            isMyStage 
                              ? 'border-violet-300 bg-violet-50' 
                              : 'border-gray-200 bg-gray-50'
                          } ${
                            stage.status === 'completed' 
                              ? 'bg-green-50 border-green-300' 
                              : stage.status === 'in_progress'
                              ? 'bg-blue-50 border-blue-300'
                              : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <IconComponent className="h-4 w-4 mr-2 text-violet-600" />
                              <span className="font-medium capitalize text-sm">{stage.name}</span>
                            </div>
                            {index < job.workflow_stages.length - 1 && (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          
                          <Badge className={`text-xs ${getStatusColor(stage.status)}`}>
                            {stage.status.replace('_', ' ')}
                          </Badge>

                          {stage.assigned_tailor === user?.id && (
                            <div className="mt-2 flex items-center text-xs text-violet-600">
                              <User className="h-3 w-3 mr-1" />
                              Assigned to me
                            </div>
                          )}

                          {stage.notes && (
                            <div className="mt-2 text-xs text-gray-600 bg-white p-2 rounded">
                              {stage.notes}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="mt-3 space-y-2">
                            {canWork && !stage.assigned_tailor && (
                              <Button
                                size="sm"
                                onClick={() => updateWorkflowStage(job._id, stage.name, 'in_progress')}
                                className="w-full bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-xs"
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Take & Start
                              </Button>
                            )}
                            
                            {stage.assigned_tailor === user?.id && stage.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => updateWorkflowStage(job._id, stage.name, 'in_progress')}
                                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-xs"
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Start
                              </Button>
                            )}
                            
                            {stage.assigned_tailor === user?.id && stage.status === 'in_progress' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updateWorkflowStage(job._id, stage.name, 'completed')}
                                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-xs"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Complete
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateWorkflowStage(job._id, stage.name, 'on_hold')}
                                  className="w-full text-xs"
                                >
                                  <Pause className="h-3 w-3 mr-1" />
                                  Hold
                                </Button>
                              </>
                            )}
                            
                            {stage.assigned_tailor === user?.id && stage.status === 'on_hold' && (
                              <Button
                                size="sm"
                                onClick={() => updateWorkflowStage(job._id, stage.name, 'in_progress')}
                                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-xs"
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Resume
                              </Button>
                            )}
                          </div>

                          {/* Quick Notes for Active Stage */}
                          {stage.assigned_tailor === user?.id && stage.status === 'in_progress' && (
                            <div className="mt-3">
                              <Textarea
                                placeholder="Add notes..."
                                value={stageNotes}
                                onChange={(e) => setStageNotes(e.target.value)}
                                className="text-xs"
                                rows={2}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div className="text-xs text-violet-600 font-medium">
                    Current Stage: <span className="capitalize font-bold">{job.current_stage}</span>
                    {job.workflow_stages?.find(s => s.name === job.current_stage)?.assigned_tailor === user?.id && (
                      <Badge className="ml-2 bg-violet-100 text-violet-800 text-xs">Your Turn</Badge>
                    )}
                  </div>
                </div>
              ))}
              
              {activeJobs.length === 0 && (
                <div className="text-center py-12 text-violet-400">
                  <div className="p-4 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                    <AlertCircle className="h-12 w-12 text-violet-400" />
                  </div>
                  <p className="text-lg font-medium">No active jobs at the moment</p>
                  <p className="text-sm text-violet-500 mt-1">New workflow assignments will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

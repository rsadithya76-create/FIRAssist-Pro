import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  FileText,
  Clock,
  AlertTriangle,
  ArrowRight
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatDateTime } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { API_BASE_URL } from '@/config'

export default function ActiveCasesPage() {
  const [complaints, setComplaints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`${API_BASE_URL}/complaints?limit=100`)
        const data = await res.json()
        setComplaints(data.complaints || [])
      } catch (err) {
        console.error("Error loading complaints:", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const activeCases = complaints.filter(
    c => c.status !== 'Closed' && c.status !== 'Rejected'
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading active cases...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Active Cases</h1>
        <p className="text-muted-foreground mt-1">
          {activeCases.length} cases currently in progress
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCases.length}</p>
                <p className="text-xs text-muted-foreground">Total Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCases.filter(c => c.status === 'Pending Review').length}</p>
                <p className="text-xs text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-danger/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-danger" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCases.filter(c => c.crimeType === 'Murder' || c.crimeType === 'Assault').length}</p>
                <p className="text-xs text-muted-foreground">High Priority</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCases.filter(c => c.status === 'Under Investigation').length}</p>
                <p className="text-xs text-muted-foreground">Investigating</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cases List */}
      <div className="space-y-4">
        {activeCases.map((caseItem, index) => (
          <motion.div
            key={caseItem.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link to={`/complaint/${caseItem.id}/extraction`}>
              <Card className="bg-card/50 backdrop-blur border-white/10 hover:border-accent/30 transition-all duration-300 group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-accent" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{caseItem.complainantName}</h3>
                          <Badge variant="secondary">{caseItem.crimeType}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{caseItem.location}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{caseItem.firNumber}</span>
                          <span>{formatDateTime(caseItem.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant={
                          caseItem.status === 'Under Investigation' ? 'default' :
                          caseItem.status === 'Pending Review' ? 'warning' : 'secondary'
                        }
                      >
                        {caseItem.status}
                      </Badge>
                      <div className="w-32">
                        <Progress value={caseItem.completionPercentage} className="h-2" />
                        <p className="text-xs text-muted-foreground text-right mt-1">
                          {caseItem.completionPercentage}% complete
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
        {activeCases.length === 0 && (
          <p className="text-center py-12 text-muted-foreground">No active cases in progress.</p>
        )}
      </div>
    </div>
  )
}


import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileText,
  Eye,
  Download,
  Calendar
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import type { ComplaintStatus } from '@/types'
import { API_BASE_URL } from '@/config'

const statusColors: Record<ComplaintStatus, string> = {
  'Draft': 'bg-secondary text-foreground',
  'Pending Review': 'bg-warning/20 text-warning',
  'Under Investigation': 'bg-accent/20 text-accent',
  'FIR Filed': 'bg-success/20 text-success',
  'Closed': 'bg-muted text-muted-foreground',
  'Rejected': 'bg-danger/20 text-danger'
}

export default function FIRHistoryPage() {
  const [complaints, setComplaints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`${API_BASE_URL}/complaints?limit=200`)
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

  const filteredComplaints = complaints.filter(complaint => {
    const matchesSearch = (complaint.complainantName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (complaint.firNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (complaint.crimeType || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || complaint.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage)
  const paginatedComplaints = filteredComplaints.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading FIR history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">FIR History</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all filed FIRs and complaints
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 backdrop-blur border-white/10">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by FIR number, complainant name, or crime type..."
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Pending Review">Pending Review</SelectItem>
                <SelectItem value="Under Investigation">Under Investigation</SelectItem>
                <SelectItem value="FIR Filed">FIR Filed</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {paginatedComplaints.length} of {filteredComplaints.length} results
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="flex items-center px-2 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="bg-card/50 backdrop-blur border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">FIR Number</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Complainant</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden md:table-cell">Crime Type</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">Date</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">Officer</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedComplaints.map((complaint, index) => (
                <motion.tr
                  key={complaint.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-border hover:bg-white/5 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-accent" />
                      </div>
                      <span className="font-medium text-sm">{complaint.firNumber}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-sm">{complaint.complainantName}</p>
                      <p className="text-xs text-muted-foreground">{complaint.mobileNumber}</p>
                    </div>
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    <Badge variant="secondary">{complaint.crimeType}</Badge>
                  </td>
                  <td className="p-4 hidden lg:table-cell">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {formatDate(complaint.createdAt)}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge className={statusColors[complaint.status as ComplaintStatus] || 'bg-secondary text-foreground'}>
                      {complaint.status}
                    </Badge>
                  </td>
                  <td className="p-4 hidden lg:table-cell">
                    <div>
                      <p className="text-sm font-medium">{complaint.officerName || "Rajesh Kumar"}</p>
                      <p className="text-xs text-muted-foreground">Investigating</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/complaint/${complaint.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {paginatedComplaints.length === 0 && (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No results found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}

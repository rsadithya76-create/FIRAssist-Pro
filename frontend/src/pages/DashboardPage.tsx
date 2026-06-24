import { motion } from 'framer-motion'
import {
  FileText,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { API_BASE_URL } from '@/config'

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

const StatCard = ({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  color
}: {
  title: string
  value: number
  change: string
  changeType: 'up' | 'down'
  icon: React.ElementType
  color: string
}) => (
  <Card className="bg-card/50 backdrop-blur border-white/10 hover:border-accent/30 transition-all duration-300 group">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold">{value.toLocaleString()}</p>
          <div className={`flex items-center gap-1 mt-2 text-sm ${
            changeType === 'up' ? 'text-success' : 'text-danger'
          }`}>
            {changeType === 'up' ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            <span>{change} from last week</span>
          </div>
        </div>
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
)

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [recentComplaints, setRecentComplaints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const statsRes = await fetch(`${API_BASE_URL}/dashboard/stats`)
        const statsData = await statsRes.json()
        setStats(statsData)

        const complaintsRes = await fetch(`${API_BASE_URL}/complaints?limit=4`)
        const complaintsData = await complaintsRes.json()
        setRecentComplaints(complaintsData.complaints || [])
      } catch (err) {
        console.error("Error loading dashboard data:", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const currentStats = stats || {
    totalComplaints: 0,
    firGenerated: 0,
    pendingReviews: 0,
    highPriorityCases: 0,
    weeklyTrend: [0, 0, 0, 0, 0, 0, 0],
    crimeDistribution: {}
  }

  const weeklyData = weekDays.map((day, i) => ({
    day,
    complaints: currentStats.weeklyTrend[i] || 0,
    firs: Math.floor((currentStats.weeklyTrend[i] || 0) * 0.85),
  }))

  const crimeData = Object.entries(currentStats.crimeDistribution || {})
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading dashboard statistics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of complaint management and FIR generation
          </p>
        </div>
        <Link to="/complaint/new">
          <Button>
            New Complaint
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Complaints"
          value={currentStats.totalComplaints}
          change="+12.5%"
          changeType="up"
          icon={FileText}
          color="bg-gradient-to-br from-accent to-blue-600"
        />
        <StatCard
          title="FIR Generated"
          value={currentStats.firGenerated}
          change="+8.2%"
          changeType="up"
          icon={FileText}
          color="bg-gradient-to-br from-success to-emerald-600"
        />
        <StatCard
          title="Pending Reviews"
          value={currentStats.pendingReviews}
          change="-5.3%"
          changeType="down"
          icon={Clock}
          color="bg-gradient-to-br from-warning to-amber-600"
        />
        <StatCard
          title="High Priority Cases"
          value={currentStats.highPriorityCases}
          change="+3.1%"
          changeType="up"
          icon={AlertTriangle}
          color="bg-gradient-to-br from-danger to-red-600"
        />
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Weekly Trend Chart */}
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur border-white/10">
          <CardHeader>
            <CardTitle>Weekly FIR Trend</CardTitle>
            <CardDescription>Complaints and FIRs generated this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="colorComplaints" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorFirs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="complaints"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorComplaints)"
                  />
                  <Area
                    type="monotone"
                    dataKey="firs"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorFirs)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Crime Distribution */}
        <Card className="bg-card/50 backdrop-blur border-white/10">
          <CardHeader>
            <CardTitle>Crime Distribution</CardTitle>
            <CardDescription>By category this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={crimeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {crimeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {crimeData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Cases */}
      <Card className="bg-card/50 backdrop-blur border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Cases</CardTitle>
            <CardDescription>Latest complaint and FIR activities</CardDescription>
          </div>
          <Link to="/cases">
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentComplaints.map((complaint, index) => (
              <motion.div
                key={complaint.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={`/complaint/${complaint.id}/extraction`}
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium">{complaint.complainantName}</p>
                      <p className="text-sm text-muted-foreground">
                        {complaint.crimeType} - {complaint.location}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={
                        complaint.status === 'FIR Filed' ? 'success' :
                        complaint.status === 'Pending Review' ? 'warning' :
                        complaint.status === 'Under Investigation' ? 'default' :
                        'secondary'
                      }
                    >
                      {complaint.status}
                    </Badge>
                    <div className="w-24 text-right">
                      <Progress
                        value={complaint.completionPercentage}
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {complaint.completionPercentage}% Complete
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                  </div>
                </Link>
              </motion.div>
            ))}
            {recentComplaints.length === 0 && (
              <p className="text-center py-6 text-muted-foreground">No recent cases found.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


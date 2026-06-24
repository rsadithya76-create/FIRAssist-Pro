import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  Clock,
  FileText,
  AlertTriangle
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
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { API_BASE_URL } from '@/config'

const COLORS = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#6B7280']

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`${API_BASE_URL}/dashboard/analytics`)
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error("Error loading analytics data:", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const currentData = data || {
    totalComplaints: 0,
    firGenerated: 0,
    casesSolved: 0,
    solveRate: 75,
    monthlyData: [
      { month: 'Jan', complaints: 0, firs: 0, solved: 0 },
      { month: 'Feb', complaints: 0, firs: 0, solved: 0 },
      { month: 'Mar', complaints: 0, firs: 0, solved: 0 },
      { month: 'Apr', complaints: 0, firs: 0, solved: 0 },
      { month: 'May', complaints: 0, firs: 0, solved: 0 },
      { month: 'Jun', complaints: 0, firs: 0, solved: 0 },
    ],
    crimeDistribution: [],
    bnsUsage: [],
    processingTimeData: []
  }

  // Map crime distribution to colors
  const mappedCrimeDistribution = currentData.crimeDistribution.map((item: any, index: number) => ({
    ...item,
    fill: COLORS[index % COLORS.length]
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading system analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Crime statistics, FIR metrics, and performance indicators
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">Last 6 months</Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Complaints', value: currentData.totalComplaints.toLocaleString(), change: '+12.5%', up: true, icon: FileText, color: 'text-accent' },
          { label: 'FIRs Generated', value: currentData.firGenerated.toLocaleString(), change: '+8.2%', up: true, icon: FileText, color: 'text-success' },
          { label: 'Cases Solved', value: currentData.casesSolved.toLocaleString(), change: '+15.3%', up: true, icon: TrendingUp, color: 'text-success' },
          { label: 'Solve Rate', value: `${currentData.solveRate}%`, change: '+3.1%', up: true, icon: TrendingUp, color: 'text-warning' },
        ].map((metric, i) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="bg-card/50 backdrop-blur border-white/10">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                    <p className="text-3xl font-bold mt-1">{metric.value}</p>
                    <div className={cn('flex items-center gap-1 mt-2 text-sm', metric.up ? 'text-success' : 'text-danger')}>
                      {metric.up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      <span>{metric.change} vs last period</span>
                    </div>
                  </div>
                  <div className={cn('w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center', metric.color)}>
                    <metric.icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card className="bg-card/50 backdrop-blur border-white/10">
          <CardHeader>
            <CardTitle>Monthly Complaint Trend</CardTitle>
            <CardDescription>Complaints, FIRs, and solved cases over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={currentData.monthlyData}>
                  <defs>
                    <linearGradient id="colorComplaints2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorFirs2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorSolved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="complaints" stroke="#3B82F6" fillOpacity={1} fill="url(#colorComplaints2)" />
                  <Area type="monotone" dataKey="firs" stroke="#10B981" fillOpacity={1} fill="url(#colorFirs2)" />
                  <Area type="monotone" dataKey="solved" stroke="#F59E0B" fillOpacity={1} fill="url(#colorSolved)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Crime Distribution */}
        <Card className="bg-card/50 backdrop-blur border-white/10">
          <CardHeader>
            <CardTitle>Crime Distribution</CardTitle>
            <CardDescription>Breakdown by crime category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mappedCrimeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {mappedCrimeDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
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
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Processing Time */}
        <Card className="bg-card/50 backdrop-blur border-white/10">
          <CardHeader>
            <CardTitle>Average Processing Time</CardTitle>
            <CardDescription>Time taken at each stage (minutes)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentData.processingTimeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                  <YAxis dataKey="stage" type="category" stroke="#94a3b8" fontSize={12} width={60} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="time" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* BNS Usage */}
        <Card className="bg-card/50 backdrop-blur border-white/10 lg:col-span-2">
          <CardHeader>
            <CardTitle>Most Used BNS Sections</CardTitle>
            <CardDescription>Top sections applied in FIRs this period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentData.bnsUsage.map((item: any) => (
                <div key={item.section} className="flex items-center gap-4">
                  <div className="w-20 text-sm font-mono text-muted-foreground">
                    {item.section}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">{item.label}</span>
                      <span className="text-sm text-muted-foreground">{item.count} cases</span>
                    </div>
                    <Progress
                      value={(item.count / (currentData.bnsUsage[0]?.count || 1)) * 100}
                      className="h-2"
                    />
                  </div>
                </div>
              ))}
              {currentData.bnsUsage.length === 0 && (
                <p className="text-center py-6 text-muted-foreground">No BNS usage data available.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card className="bg-card/50 backdrop-blur border-white/10">
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>System and officer performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { label: 'AI Accuracy', value: '99.2%', icon: TrendingUp, color: 'text-success' },
              { label: 'Avg Response Time', value: '12.5 min', icon: Clock, color: 'text-accent' },
              { label: 'FIR Draft Success', value: '97.8%', icon: FileText, color: 'text-success' },
              { label: 'BNS Match Rate', value: '94.5%', icon: AlertTriangle, color: 'text-warning' },
            ].map((metric) => (
              <div key={metric.label} className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center', metric.color)}>
                  <metric.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-xl font-bold">{metric.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


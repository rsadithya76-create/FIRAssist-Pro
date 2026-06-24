import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Shield,
  FileCheck,
  Save,
  Loader2,
  AlertTriangle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks'
import { API_BASE_URL } from '@/config'
import EvidenceChecklist from '@/components/features/EvidenceChecklist'
import EvidenceUploadCard from '@/components/features/EvidenceUploadCard'

export default function EvidenceDocumentsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [crimeType, setCrimeType] = useState('Theft')
  const [confidence, setConfidence] = useState(95)
  const [commonDocs, setCommonDocs] = useState<string[]>([])
  const [crimeDocs, setCrimeDocs] = useState<string[]>([])
  
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [loading, setLoading] = useState(true)

  const [activeUploadDoc, setActiveUploadDoc] = useState<string | null>(null)

  const caseId = id || 'new'

  useEffect(() => {
    loadCaseData()
  }, [id])

  const loadCaseData = async () => {
    setLoading(true)
    try {
      // Get case info from local storage or route parameters
      const savedCaseData = localStorage.getItem("caseData")
      const parsedCase = savedCaseData ? JSON.parse(savedCaseData) : {}
      console.log("DEBUG: Extracted caseData from localStorage:", parsedCase)
      console.log("DEBUG: Stored/Retrieved crime type:", parsedCase.crime_type)
      
      const detectedCrime = parsedCase.crime_type || 'Theft'
      setCrimeType(detectedCrime)
      console.log("DEBUG: Normalized/Fallback crime type used:", detectedCrime)
      
      // Calculate confidence from case overview or fallback
      const savedDashboard = localStorage.getItem("firDashboard")
      const parsedDashboard = savedDashboard ? JSON.parse(savedDashboard) : {}
      const apiConfidence = parsedDashboard?.dashboard?.case_overview?.confidence || 95
      setConfidence(apiConfidence)

      // Fetch required documents list
      const apiUrl = `${API_BASE_URL}/evidence/required-documents/${encodeURIComponent(detectedCrime)}`
      console.log("DEBUG: API request URL:", apiUrl)
      const reqDocsResponse = await fetch(apiUrl)
      const reqDocsData = await reqDocsResponse.json()
      console.log("DEBUG: API response for required documents:", reqDocsData)
      setCommonDocs(reqDocsData.common_documents || [])
      setCrimeDocs(reqDocsData.crime_specific_documents || [])

      // Fetch case uploads and notes
      const caseEvidenceResponse = await fetch(`${API_BASE_URL}/evidence/case/${caseId}`)
      const caseEvidenceData = await caseEvidenceResponse.json()
      setUploadedFiles(caseEvidenceData.uploaded_files || [])
      setNotes(caseEvidenceData.notes || '')
    } catch (err) {
      console.error(err)
      toast('Failed to load required evidence documents data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadSuccess = (meta: any) => {
    setUploadedFiles(prev => {
      const filtered = prev.filter(f => f.doc_name !== meta.doc_name)
      return [...filtered, meta]
    })
    setActiveUploadDoc(null)
  }

  const handleVerifyToggle = async (docName: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Verified' ? 'Uploaded' : 'Verified'
    try {
      const response = await fetch(`${API_BASE_URL}/evidence/case/${caseId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          doc_name: docName,
          status: newStatus
        })
      })
      const data = await response.json()
      if (data.status === 'success') {
        setUploadedFiles(prev => prev.map(f => f.doc_name === docName ? { ...f, status: newStatus } : f))
        toast(`Document marked as ${newStatus}`, 'success')
      } else {
        toast('Verification toggle failed', 'error')
      }
    } catch (err) {
      console.error(err)
      toast('Error toggling document verification status', 'error')
    }
  }

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    try {
      const response = await fetch(`${API_BASE_URL}/evidence/case/${caseId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes })
      })
      const data = await response.json()
      if (data.status === 'success') {
        toast('Investigation remarks saved successfully', 'success')
      } else {
        toast('Failed to save remarks', 'error')
      }
    } catch (err) {
      console.error(err)
      toast('Error communicating with notes API', 'error')
    } finally {
      setSavingNotes(false)
    }
  }

  const allRequiredDocs = [...commonDocs, ...crimeDocs]
  const collectedCount = allRequiredDocs.filter(doc => uploadedFiles.some(f => f.doc_name === doc)).length
  const totalCount = allRequiredDocs.length
  const progressPercent = totalCount > 0 ? Math.round((collectedCount / totalCount) * 100) : 0

  const handleContinue = () => {
    navigate(`/complaint/${caseId}/missing`)
  }

  // Quick Reference checklist configuration
  const quickReferences = [
    { title: 'Assault', desc: 'Medical Report, Wound Cert, Photos' },
    { title: 'Murder', desc: 'Post-Mortem, Inquest, Forensic' },
    { title: 'Theft', desc: 'Bills, Ownership Proof, CCTV' },
    { title: 'Missing Person', desc: 'Photograph, ID Proof' },
    { title: 'Accident', desc: 'DL, RC, Insurance, Med Report' },
    { title: 'Cyber Crime', desc: 'Screenshots, Trans. Records' },
    { title: 'Kidnapping', desc: 'Photograph, Call Records' },
    { title: 'Domestic Violence', desc: 'Medical Records, Messages' },
    { title: 'Sexual Assault', desc: 'Medical & Forensic Reports' },
    { title: 'Property Damage', desc: 'Photos, Ownership Proof' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
        <span className="ml-3 text-muted-foreground">Loading evidence checklist...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Evidence & Supporting Documents</h1>
          <p className="text-muted-foreground mt-1">
            Analyze, upload, and track documents required for the case
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Verification Progress</p>
          <p className="text-2xl font-bold text-gradient">{progressPercent}%</p>
        </div>
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center gap-4">
        {[
          'Complaint Intake',
          'Information Extraction',
          'Evidence & Documents',
          'Review & Confirm',
          'FIR Generation'
        ].map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
              i === 2 ? 'bg-accent text-white' : i < 2 ? 'bg-success text-white' : 'bg-secondary text-muted-foreground'
            )}>
              {i < 2 ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={cn(
              'text-sm hidden sm:block',
              i === 2 ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {step}
            </span>
            {i < 4 && (
              <ArrowRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
            )}
          </div>
        ))}
      </div>

      {/* Crime Type Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-dark rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-accent" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Detected Crime Type</p>
            <h2 className="text-lg font-bold mt-0.5">{crimeType}</h2>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-left sm:text-right">
            <p className="text-xs text-muted-foreground">AI Confidence</p>
            <p className="font-semibold text-success mt-0.5">{confidence}%</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-muted-foreground">Required Files</p>
            <p className="font-semibold text-foreground mt-0.5">{totalCount} Recommended</p>
          </div>
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Checklist Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Tracker Card */}
          <Card className="bg-card/50 backdrop-blur border-white/10">
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium">Documents Collected</span>
                <span className="text-muted-foreground font-mono">{collectedCount} / {totalCount}</span>
              </div>
              <Progress value={progressPercent} className="h-2.5" />
            </CardContent>
          </Card>

          {/* Crime-Specific Checklist */}
          {crimeDocs.length > 0 && (
            <Card className="bg-card/50 backdrop-blur border-white/10">
              <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-accent" />
                  Recommended for {crimeType}
                </CardTitle>
                <CardDescription>
                  Supporting documents specific to this class of offence
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <EvidenceChecklist
                  documents={crimeDocs}
                  uploadedFiles={uploadedFiles}
                  onUploadClick={(doc) => setActiveUploadDoc(doc)}
                  onVerifyToggle={handleVerifyToggle}
                />
              </CardContent>
            </Card>
          )}

          {/* Common Checklist */}
          <Card className="bg-card/50 backdrop-blur border-white/10">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                Common Documents
              </CardTitle>
              <CardDescription>
                Essential records requested for all criminal proceedings
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <EvidenceChecklist
                documents={commonDocs}
                uploadedFiles={uploadedFiles}
                onUploadClick={(doc) => setActiveUploadDoc(doc)}
                onVerifyToggle={handleVerifyToggle}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Notes Card */}
          <Card className="bg-card/50 backdrop-blur border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Officer Notes & Remarks</CardTitle>
              <CardDescription>
                Log extra remarks or physical evidence notes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter document remarks, recovery details, or file notes..."
                className="w-full h-32 text-sm bg-secondary/15 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-accent/40 resize-none leading-relaxed"
              />
              <Button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="w-full bg-accent text-white"
              >
                {savingNotes ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Remarks
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Quick Checklist References */}
          <Card className="bg-card/50 backdrop-blur border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-4.5 h-4.5 text-warning" />
                Category Checklists
              </CardTitle>
              <CardDescription>
                Overview of required evidence categories
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 max-h-[360px] overflow-y-auto">
              <div className="divide-y divide-white/5">
                {quickReferences.map((ref) => (
                  <div key={ref.title} className="p-4 hover:bg-secondary/10 transition-colors">
                    <p className="text-xs font-semibold text-accent">{ref.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-normal">{ref.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-4">
        <Link to={`/complaint/${caseId}/extraction`}>
          <Button variant="outline">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
        </Link>
        <Button
          size="lg"
          onClick={handleContinue}
          className="min-w-[200px]"
        >
          Next Step: Review
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>

      {/* Upload Drawer Modal */}
      <AnimatePresence>
        {activeUploadDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveUploadDoc(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-md"
            >
              <EvidenceUploadCard
                caseId={caseId}
                docName={activeUploadDoc}
                onUploadSuccess={handleUploadSuccess}
                onClose={() => setActiveUploadDoc(null)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { FileText, Loader2, AlertCircle } from 'lucide-react'
import { API_BASE_URL } from '@/config'

interface EvidenceSummaryCardProps {
  caseId: string
  crimeType: string
}

export default function EvidenceSummaryCard({ caseId, crimeType }: EvidenceSummaryCardProps) {
  const [loading, setLoading] = useState(true)
  const [requiredDocs, setRequiredDocs] = useState<string[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])

  useEffect(() => {
    loadEvidenceSummary()
  }, [caseId, crimeType])

  const loadEvidenceSummary = async () => {
    setLoading(true)
    try {
      // 1. Fetch required documents
      const docsResponse = await fetch(`${API_BASE_URL}/evidence/required-documents/${encodeURIComponent(crimeType)}`)
      const docsData = await docsResponse.json()
      const allDocs = [...(docsData.common_documents || []), ...(docsData.crime_specific_documents || [])]
      setRequiredDocs(allDocs)

      // 2. Fetch case evidence metadata
      const evidenceResponse = await fetch(`${API_BASE_URL}/evidence/case/${caseId}`)
      const evidenceData = await evidenceResponse.json()
      setUploadedFiles(evidenceData.uploaded_files || [])
    } catch (err) {
      console.error('Failed to load evidence summary:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur border-white/10">
        <CardContent className="p-6 flex items-center justify-center min-h-[150px]">
          <Loader2 className="w-6 h-6 text-accent animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Loading evidence summary...</span>
        </CardContent>
      </Card>
    )
  }

  const requiredCount = requiredDocs.length
  const uploadedCount = uploadedFiles.length
  const verifiedCount = uploadedFiles.filter(f => f.status === 'Verified').length
  
  // Find missing documents
  const missingDocs = requiredDocs.filter(docName => !uploadedFiles.some(f => f.doc_name === docName))
  const missingCount = missingDocs.length

  const progressPercent = requiredCount > 0 ? Math.round((uploadedCount / requiredCount) * 100) : 0

  return (
    <Card className="bg-card/50 backdrop-blur border-white/10">
      <CardHeader className="pb-3 border-b border-white/5">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-accent" />
          Evidence Collection Summary
        </CardTitle>
        <CardDescription>
          Overview of case document checklist and verification progress
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        {/* Metric Grid */}
        <div className="grid grid-cols-4 gap-2 text-center bg-secondary/10 p-3 rounded-xl border border-white/5">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Required</p>
            <p className="text-lg font-bold mt-0.5">{requiredCount}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Uploaded</p>
            <p className="text-lg font-bold text-accent mt-0.5">{uploadedCount}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Verified</p>
            <p className="text-lg font-bold text-success mt-0.5">{verifiedCount}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Missing</p>
            <p className="text-lg font-bold text-danger mt-0.5">{missingCount}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium">
            <span>Collection Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Missing Documents List */}
        {missingDocs.length > 0 ? (
          <div className="space-y-1.5 pt-2">
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-danger" />
              Missing Documents ({missingCount})
            </p>
            <div className="grid md:grid-cols-2 gap-1.5 bg-danger/5 p-3 rounded-xl border border-danger/10">
              {missingDocs.map(doc => (
                <div key={doc} className="text-xs text-danger/90 flex items-center gap-1.5 truncate">
                  <span>❌</span>
                  <span className="truncate">{doc}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-success/5 border border-success/15 rounded-xl p-3 text-center text-xs text-success font-medium">
            ✓ All required supporting evidence documents collected!
          </div>
        )}
      </CardContent>
    </Card>
  )
}

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ShieldCheck, Loader2 } from 'lucide-react'
import { API_BASE_URL } from '@/config'

interface FIRReadinessCardProps {
  caseId: string
  crimeType: string
  caseData: any
}

export default function FIRReadinessCard({ caseId, crimeType, caseData }: FIRReadinessCardProps) {
  const [loading, setLoading] = useState(true)
  const [evidenceProgress, setEvidenceProgress] = useState({ uploaded: 0, required: 0 })

  useEffect(() => {
    const fetchEvidence = async () => {
      if (!caseId || !crimeType) {
        setLoading(false)
        return
      }
      try {
        const docsResponse = await fetch(`${API_BASE_URL}/evidence/required-documents/${encodeURIComponent(crimeType)}`)
        const docsData = await docsResponse.json()
        const allDocs = [...(docsData.common_documents || []), ...(docsData.crime_specific_documents || [])]

        const evidenceResponse = await fetch(`${API_BASE_URL}/evidence/case/${caseId}`)
        const evidenceData = await evidenceResponse.json()
        const uploaded = evidenceData.uploaded_files || []

        setEvidenceProgress({
          uploaded: uploaded.length,
          required: allDocs.length
        })
      } catch (err) {
        console.error('Failed to load evidence stats for readiness:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchEvidence()
  }, [caseId, crimeType])

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur border-white/10">
        <CardContent className="p-6 flex items-center justify-center min-h-[150px]">
          <Loader2 className="w-6 h-6 text-accent animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Calculating readiness...</span>
        </CardContent>
      </Card>
    )
  }

  // Calculate scores
  // 1. Complainant details (Name, Phone, Address) - Max 25
  let complainantScore = 0
  if (caseData.victim_name) complainantScore += 10
  if (caseData.victim_phone) complainantScore += 8
  if (caseData.victim_address) complainantScore += 7

  // 2. Incident details (Date, Time, Location, Summary) - Max 25
  let incidentScore = 0
  if (caseData.incident_date) incidentScore += 7
  if (caseData.incident_time) incidentScore += 6
  if (caseData.location) incidentScore += 6
  if (caseData.incident_summary) incidentScore += 6

  // 3. Accused details (Name present and not empty) - Max 15
  let accusedScore = 0
  if (caseData.accused_name && caseData.accused_name.trim().toLowerCase() !== 'unknown') {
    accusedScore = 15
  } else if (caseData.accused_name) {
    accusedScore = 10 // 'Unknown' is still a value, but known accused is better for completeness
  }

  // 4. Legal analysis (BNS sections present) - Max 15
  let legalScore = 0
  const sections = caseData.legal_analysis?.recommended_sections || []
  if (sections.length > 0) {
    legalScore = 15
  }

  // 5. Evidence collection progress - Max 20
  let evidenceScore = 0
  if (evidenceProgress.required > 0) {
    evidenceScore = Math.round((evidenceProgress.uploaded / evidenceProgress.required) * 20)
  } else {
    evidenceScore = 20 // No documents required means it's complete
  }

  const score = complainantScore + incidentScore + accusedScore + legalScore + evidenceScore
  const clampedScore = Math.min(100, Math.max(0, score))

  // Determine readiness status
  let status: 'Ready' | 'Needs Review' | 'Incomplete' = 'Incomplete'
  let statusColor = 'text-danger'
  let strokeColor = '#ef4444'
  let bgGradient = 'from-danger/10 to-danger/5'
  let statusText = 'Critical information missing. Case details and supporting evidence must be collected before final submission.'

  if (clampedScore >= 80) {
    status = 'Ready'
    statusColor = 'text-success'
    strokeColor = '#10b981'
    bgGradient = 'from-success/10 to-success/5'
    statusText = 'Excellent! All core information, evidence documents, and BNS legal mappings are complete. The case is fully ready for FIR registration.'
  } else if (clampedScore >= 50) {
    status = 'Needs Review'
    statusColor = 'text-warning'
    strokeColor = '#f59e0b'
    bgGradient = 'from-warning/10 to-warning/5'
    statusText = 'Most details are present, but some supporting documents or fields are missing. Recommended to verify before generation.'
  }

  const radius = 50
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference

  return (
    <Card className="bg-card/50 backdrop-blur border-white/10">
      <CardHeader className="pb-3 border-b border-white/5">
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-accent" />
          FIR Readiness Index
        </CardTitle>
        <CardDescription>
          Evaluation of case information completeness and readiness
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 flex flex-col md:flex-row items-center gap-6">
        {/* Radial Meter */}
        <div className="relative flex items-center justify-center min-w-[120px] h-[120px]">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background Circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              className="stroke-white/5"
              strokeWidth="8"
              fill="transparent"
            />
            {/* Indicator Progress */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke={strokeColor}
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-2xl font-black">{clampedScore}%</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Score</span>
          </div>
        </div>

        {/* Status Report */}
        <div className="flex-1 space-y-2 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center gap-2 justify-center md:justify-start">
            <span className="text-sm font-semibold text-muted-foreground">Status:</span>
            <span className={`text-base font-extrabold tracking-wide uppercase ${statusColor}`}>
              {status}
            </span>
          </div>
          <div className={`p-3 rounded-xl border border-white/5 bg-gradient-to-br ${bgGradient} text-xs text-foreground/90 leading-relaxed`}>
            {statusText}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

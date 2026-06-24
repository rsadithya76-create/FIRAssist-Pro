import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ClipboardCheck, CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { API_BASE_URL } from '@/config'

interface CaseCompletenessCardProps {
  caseId: string
  crimeType: string
  caseData: any
}

export default function CaseCompletenessCard({ caseId, crimeType, caseData }: CaseCompletenessCardProps) {
  const [loading, setLoading] = useState(true)
  const [evidenceUploaded, setEvidenceUploaded] = useState(false)

  useEffect(() => {
    const checkEvidence = async () => {
      if (!caseId) {
        setLoading(false)
        return
      }
      try {
        const response = await fetch(`${API_BASE_URL}/evidence/case/${caseId}`)
        const data = await response.json()
        const uploaded = data.uploaded_files || []
        setEvidenceUploaded(uploaded.length > 0)
      } catch (err) {
        console.error('Failed to load evidence for checklist:', err)
      } finally {
        setLoading(false)
      }
    }

    checkEvidence()
  }, [caseId])

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur border-white/10">
        <CardContent className="p-6 flex items-center justify-center min-h-[150px]">
          <Loader2 className="w-6 h-6 text-accent animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Checking completeness status...</span>
        </CardContent>
      </Card>
    )
  }

  // Completeness criteria
  const checks = [
    {
      id: 'complainant',
      label: 'Complainant Details',
      desc: 'Name, phone number, and address are verified',
      isComplete: !!(caseData.victim_name && caseData.victim_phone && caseData.victim_address)
    },
    {
      id: 'incident',
      label: 'Incident Details',
      desc: 'Occurrence date, time, and location are verified',
      isComplete: !!(caseData.incident_date && caseData.incident_time && caseData.location)
    },
    {
      id: 'accused',
      label: 'Accused Details',
      desc: 'Suspect names or "Unknown" placeholder recorded',
      isComplete: !!caseData.accused_name
    },
    {
      id: 'property',
      label: 'Property/Financial Details',
      desc: 'Type and value recorded for relevant crimes',
      isComplete: (
        // Auto-complete if not property/cyber crime
        !(crimeType.toLowerCase().includes('theft') ||
          crimeType.toLowerCase().includes('robbery') ||
          crimeType.toLowerCase().includes('cyber') ||
          crimeType.toLowerCase().includes('fraud') ||
          crimeType.toLowerCase().includes('financial')) ||
        !!(caseData.property_type || caseData.property_value || caseData.amount_lost || caseData.bank_name)
      )
    },
    {
      id: 'evidence',
      label: 'Evidence Checklist',
      desc: 'At least one required supporting document uploaded',
      isComplete: evidenceUploaded
    },
    {
      id: 'legal',
      label: 'Legal Section Mapping',
      desc: 'Recommended BNS sections mapped to crime details',
      isComplete: !!(caseData.legal_analysis?.recommended_sections?.length > 0)
    },
    {
      id: 'summary',
      label: 'AI Incident Synopsis',
      desc: 'Executive summary is successfully populated',
      isComplete: !!caseData.incident_summary
    }
  ]

  return (
    <Card className="bg-card/50 backdrop-blur border-white/10">
      <CardHeader className="pb-3 border-b border-white/5">
        <CardTitle className="text-lg flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-accent" />
          Case Completeness Checklist
        </CardTitle>
        <CardDescription>
          Automated review of police case components status
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5">
        <div className="space-y-3">
          {checks.map(check => (
            <div
              key={check.id}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                check.isComplete
                  ? 'bg-success/5 border-success/10 text-foreground'
                  : 'bg-secondary/5 border-white/5 text-muted-foreground'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {check.isComplete ? (
                  <CheckCircle2 className="w-5 h-5 text-success fill-success/10" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground/30" />
                )}
              </div>
              <div>
                <p className={`text-sm font-semibold ${check.isComplete ? 'text-foreground' : 'text-muted-foreground/80'}`}>
                  {check.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {check.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

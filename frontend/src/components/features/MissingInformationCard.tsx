import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertTriangle, Info, CheckCircle } from 'lucide-react'
import { API_BASE_URL } from '@/config'

interface MissingInformationCardProps {
  caseId: string
  crimeType: string
  caseData: any
}

export default function MissingInformationCard({ caseId, crimeType, caseData }: MissingInformationCardProps) {
  const [loading, setLoading] = useState(true)
  const [missingDocs, setMissingDocs] = useState<string[]>([])

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

        const missing = allDocs.filter(docName => !uploaded.some((f: any) => f.doc_name === docName))
        setMissingDocs(missing)
      } catch (err) {
        console.error('Failed to load evidence for warnings:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchEvidence()
  }, [caseId, crimeType])

  if (loading) {
    return null // Renders silently while loading
  }

  // Scan caseData for warnings
  const warnings: { id: string; severity: 'critical' | 'info'; message: string }[] = []

  // Complainant checks
  if (!caseData.victim_phone) {
    warnings.push({
      id: 'victim_phone',
      severity: 'critical',
      message: 'Complainant contact number is missing. Essential for follow-ups.'
    })
  }
  if (!caseData.victim_address) {
    warnings.push({
      id: 'victim_address',
      severity: 'info',
      message: 'Complainant home address is not fully specified.'
    })
  }

  // Accused check
  if (!caseData.accused_name || caseData.accused_name.trim().toLowerCase() === 'unknown') {
    warnings.push({
      id: 'accused_name',
      severity: 'info',
      message: 'Suspect identity is currently "Unknown". Investigation should prioritize identification.'
    })
  }

  // Incident location/time check
  if (!caseData.location) {
    warnings.push({
      id: 'location',
      severity: 'critical',
      message: 'Place of occurrence is missing. Precise jurisdiction cannot be established.'
    })
  }

  // Property details check (for theft / robbery / cyber)
  const isPropertyCrime = crimeType.toLowerCase().includes('theft') ||
    crimeType.toLowerCase().includes('robbery') ||
    crimeType.toLowerCase().includes('snatching')

  const isCyberCrime = crimeType.toLowerCase().includes('cyber') ||
    crimeType.toLowerCase().includes('financial') ||
    crimeType.toLowerCase().includes('fraud')

  if (isPropertyCrime && !caseData.property_value) {
    warnings.push({
      id: 'property_value',
      severity: 'critical',
      message: 'Property value is missing. Required to determine offence severity.'
    })
  }

  if (isCyberCrime && !caseData.amount_lost) {
    warnings.push({
      id: 'amount_lost',
      severity: 'critical',
      message: 'Transaction amount lost is missing. Required to assess financial fraud classification.'
    })
  }

  // Critical document checks
  const criticalDocPatterns = ['cctv', 'witness', 'ownership', 'bill', 'statement', 'id proof']
  missingDocs.forEach(doc => {
    const isCritical = criticalDocPatterns.some(pattern => doc.toLowerCase().includes(pattern))
    if (isCritical) {
      warnings.push({
        id: `doc_${doc}`,
        severity: 'info',
        message: `Missing supporting document: "${doc}". Highly recommended for evidence validation.`
      })
    }
  })

  if (warnings.length === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur border-success/15 overflow-hidden">
        <CardContent className="p-5 flex items-center gap-3 bg-success/5">
          <CheckCircle className="w-5 h-5 text-success shrink-0" />
          <div>
            <p className="text-sm font-semibold text-success">No Missing Information Warnings</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              All critical fields and core evidence files for this case file are successfully completed.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card/50 backdrop-blur border-white/10">
      <CardHeader className="pb-3 border-b border-white/5">
        <CardTitle className="text-lg flex items-center gap-2 text-warning">
          <AlertTriangle className="w-5 h-5 text-warning" />
          Attention Required
        </CardTitle>
        <CardDescription>
          Identified missing data fields and key evidentiary recommendations
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 space-y-3">
        {warnings.map(warning => (
          <div
            key={warning.id}
            className={`flex items-start gap-3 p-3 rounded-xl border text-xs leading-relaxed ${
              warning.severity === 'critical'
                ? 'bg-danger/5 border-danger/25 text-foreground'
                : 'bg-warning/5 border-warning/20 text-foreground'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {warning.severity === 'critical' ? (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-danger/10 text-danger text-[10px] font-black">!</span>
              ) : (
                <Info className="w-4 h-4 text-warning" />
              )}
            </div>
            <div>
              <span className={`font-semibold mr-1.5 uppercase ${warning.severity === 'critical' ? 'text-danger' : 'text-warning'}`}>
                {warning.severity === 'critical' ? 'CRITICAL' : 'RECOMMENDED'}
              </span>
              <span>{warning.message}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

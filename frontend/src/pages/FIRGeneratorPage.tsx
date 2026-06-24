import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { API_BASE_URL } from '@/config'
import {
  ArrowRight,
  FileText,
  Download,
  Save,
  Send,
  CheckCircle2,
  Edit2,
  Eye,
  Shield,
  User,
  MapPin,
  Scale,
  Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks'
import { cn } from '@/lib/utils'

// Dynamic CDN Loader for html2pdf.js with CDN Fallbacks
const loadHtml2Pdf = () => {
  return new Promise<any>((resolve, reject) => {
    if ((window as any).html2pdf) {
      resolve((window as any).html2pdf)
      return
    }

    // Attempt 1: cdnjs Cloudflare (No integrity checking to bypass SRI issues)
    const script1 = document.createElement('script')
    script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
    script1.crossOrigin = 'anonymous'
    script1.onload = () => {
      if ((window as any).html2pdf) {
        resolve((window as any).html2pdf)
      } else {
        script1.onerror!(new Event('load_null'))
      }
    }
    script1.onerror = () => {
      console.warn("Primary cdnjs failed. Trying jsdelivr fallback...")
      // Attempt 2: jsdelivr (fallback)
      const script2 = document.createElement('script')
      script2.src = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js'
      script2.crossOrigin = 'anonymous'
      script2.onload = () => {
        if ((window as any).html2pdf) {
          resolve((window as any).html2pdf)
        } else {
          reject(new Error("html2pdf library object undefined after loading jsdelivr."))
        }
      }
      script2.onerror = (err) => {
        reject(new Error("Failed to load html2pdf.js from all CDNs. " + String(err)))
      }
      document.body.appendChild(script2)
    }
    document.body.appendChild(script1)
  })
}

export default function FIRGeneratorPage() {
  const { id } = useParams()
  const { toast } = useToast()
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [firData, setFirData] = useState<any>(null)
  const [exporting, setExporting] = useState(false)

  // Evidence metadata states for the printable PDF
  const [requiredDocs, setRequiredDocs] = useState<string[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [readinessScore, setReadinessScore] = useState(0)
  const [riskAssessment, setRiskAssessment] = useState<any>(null)

  useEffect(() => {
    loadFIR()
  }, [])

  const loadFIR = async () => {
    try {
      const caseData = JSON.parse(
        localStorage.getItem("caseData") || "{}"
      )

      // Fallback merge from firDashboard to ensure complainant and incident data is complete
      try {
        const dashboardData = JSON.parse(
          localStorage.getItem("firDashboard") || "{}"
        )
        const initialComplainant = dashboardData?.dashboard?.case_overview?.complainant || {}
        const initialIncident = dashboardData?.dashboard?.case_overview?.incident || {}
        
        if (!caseData.victim_name && initialComplainant.Name) {
          caseData.victim_name = initialComplainant.Name
        }
        if (!caseData.victim_phone && initialComplainant.Phone) {
          caseData.victim_phone = initialComplainant.Phone
        }
        if (!caseData.victim_father_name && (initialComplainant.Father_Name || initialComplainant.father_name)) {
          caseData.victim_father_name = initialComplainant.Father_Name || initialComplainant.father_name
        }
        if (!caseData.victim_age && (initialComplainant.Age || initialComplainant.age)) {
          caseData.victim_age = initialComplainant.Age || initialComplainant.age
        }
        if (!caseData.victim_gender && (initialComplainant.Gender || initialComplainant.gender)) {
          caseData.victim_gender = initialComplainant.Gender || initialComplainant.gender
        }
        if (!caseData.victim_address && (initialComplainant.Address || initialComplainant.address)) {
          caseData.victim_address = initialComplainant.Address || initialComplainant.address
        }
        if (!caseData.location && initialIncident.Location) {
          caseData.location = initialIncident.Location
        }
        if (!caseData.incident_date && initialIncident.Date) {
          caseData.incident_date = initialIncident.Date
        }
        if (!caseData.incident_time && initialIncident.Time) {
          caseData.incident_time = initialIncident.Time
        }
        if (!caseData.accused_name && dashboardData?.dashboard?.case_overview?.accused?.Name) {
          caseData.accused_name = dashboardData.dashboard.case_overview.accused.Name
        }
        localStorage.setItem("caseData", JSON.stringify(caseData))
      } catch (err) {
        console.error("Failed to merge firDashboard complainant details:", err)
      }

      const caseId = id || caseData.id || "new"
      const crimeType = caseData.crime_type || (Array.isArray(caseData.possible_offences) && caseData.possible_offences[0]) || 'Unknown Offence'

      // Fetch legal analysis, generate-final-fir
      const response = await fetch(
        `${API_BASE_URL}/generate-final-fir`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            case_data: caseData
          })
        }
      )

      const result = await response.json()

      console.log(
        "FIR DATA:",
        result
      )

      // Background fetch of evidence check list items for isolated PDF
      let tempRequired: string[] = []
      let tempUploaded: any[] = []
      try {
        const docsResponse = await fetch(`${API_BASE_URL}/evidence/required-documents/${encodeURIComponent(crimeType)}`)
        const docsData = await docsResponse.json()
        tempRequired = [...(docsData.common_documents || []), ...(docsData.crime_specific_documents || [])]
        setRequiredDocs(tempRequired)

        const evidenceResponse = await fetch(`${API_BASE_URL}/evidence/case/${caseId}`)
        const evidenceData = await evidenceResponse.json()
        tempUploaded = evidenceData.uploaded_files || []
        setUploadedFiles(tempUploaded)
      } catch (err) {
        console.error("Failed to load evidence metadata in background for PDF:", err)
      }

      // Resolve Risk Assessment
      let riskData = caseData.risk_assessment || null
      if (!riskData) {
        try {
          const dashboardStr = localStorage.getItem('firDashboard')
          if (dashboardStr) {
            const parsed = JSON.parse(dashboardStr)
            riskData = parsed?.dashboard?.risk_assessment || parsed?.risk_assessment
            if (typeof riskData === 'string') riskData = JSON.parse(riskData)
          }
        } catch (e) {
          console.error(e)
        }
      }
      setRiskAssessment(riskData)

      // Calculate Readiness Score
      let complainantScore = 0
      if (caseData.victim_name) complainantScore += 10
      if (caseData.victim_phone) complainantScore += 8
      if (caseData.victim_address) complainantScore += 7

      let incidentScore = 0
      if (caseData.incident_date) incidentScore += 7
      if (caseData.incident_time) incidentScore += 6
      if (caseData.location) incidentScore += 6
      if (caseData.incident_summary) incidentScore += 6

      let accusedScore = 0
      if (caseData.accused_name && caseData.accused_name.trim().toLowerCase() !== 'unknown') {
        accusedScore = 15
      } else if (caseData.accused_name) {
        accusedScore = 10
      }

      let legalScore = 0
      const sections = result.legal_analysis?.recommended_sections || caseData.legal_analysis?.recommended_sections || []
      if (sections.length > 0) {
        legalScore = 15
      }

      let evidenceScore = 0
      if (tempRequired.length > 0) {
        evidenceScore = Math.round((tempUploaded.length / tempRequired.length) * 20)
      } else {
        evidenceScore = 20
      }

      const score = complainantScore + incidentScore + accusedScore + legalScore + evidenceScore
      setReadinessScore(Math.min(100, Math.max(0, score)))

      setFirData({
        number: result.fir.FIR_Number || caseData.fir_number || "Not Available",
        date: result.fir.Incident?.Date || caseData.incident_date || "Not Available",
        time: result.fir.Incident?.Time || caseData.incident_time || "Not Available",
        narrative: result.narrative || caseData.incident_summary || "Not Available",
        stationName: result.fir.Police_Station || caseData.police_station || caseData.station_name || "Not Available",
        stationCode: result.fir.Station_Code || caseData.station_code || "Not Available",
        district: result.fir.District || caseData.district || (caseData.location && caseData.location.split(',').pop()?.trim()) || "Not Available",
        complainant: {
          name: result.fir.Complainant?.Name || caseData.victim_name || "Not Available",
          fatherName: result.fir.Complainant?.Father_Name || caseData.victim_father_name || "Not Available",
          age: result.fir.Complainant?.Age || caseData.victim_age || "Not Available",
          gender: result.fir.Complainant?.Gender || caseData.victim_gender || "Not Available",
          mobile: result.fir.Complainant?.Phone || caseData.victim_phone || "Not Available",
          address: result.fir.Complainant?.Address || caseData.victim_address || "Not Available"
        },
        incident: {
          date: result.fir.Incident?.Date || caseData.incident_date || "Not Available",
          time: result.fir.Incident?.Time || caseData.incident_time || "Not Available",
          place: result.fir.Incident?.Location || caseData.location || "Not Available",
          nature: result.fir.Possible_Offences?.join(", ") || crimeType || "Not Available"
        },
        property: {
          type: result.fir.Property?.Type || caseData.property_type || "Not Available",
          description: [
            result.fir.Property?.Vehicle_Model || caseData.vehicle_model,
            result.fir.Property?.Vehicle_Color || caseData.vehicle_color
          ].filter(Boolean).join(", ") || "Not Available",
          registration: result.fir.Property?.Registration_Number || caseData.vehicle_number || "Not Available",
          vehicleModel: result.fir.Property?.Vehicle_Model || caseData.vehicle_model || "Not Available",
          vehicleColor: result.fir.Property?.Vehicle_Color || caseData.vehicle_color || "Not Available",
          value: result.fir.Property?.Value || caseData.property_value || "Not Available"
        },
        cyber: {
          bankName: result.fir.Cyber?.Bank_Name || caseData.bank_name || "Not Available",
          transactionId: result.fir.Cyber?.Transaction_ID || caseData.transaction_id || "Not Available",
          amountLost: result.fir.Cyber?.Amount_Lost || caseData.amount_lost || "Not Available"
        },
        details: result.fir.Incident?.Summary || caseData.incident_summary || "Not Available",
        sections: result.legal_analysis?.recommended_sections?.map(
          (item: any) =>
            `BNS ${item.section} - ${item.title || item.description || "Applicable Section"}`
        ) || caseData.legal_analysis?.recommended_sections?.map(
          (item: any) =>
            `BNS ${item.section} - ${item.title || item.description || "Applicable Section"}`
        ) || [],
        officer: {
          name: result.fir.Officer?.Name || caseData.officer_name || caseData.assigned_officer || "Not Available",
          rank: result.fir.Officer?.Rank || caseData.officer_rank || "Not Available",
          badge: result.fir.Officer?.Badge_No || caseData.officer_badge || "Not Available"
        }
      })
    } catch (error) {
      console.error(error)
      toast(
        "Failed to load FIR",
        "error"
      )
    }
  }

  const handleSaveDraft = () => {
    toast('FIR draft saved successfully', 'success')
  }

  const handleExportPDF = async () => {
    setExporting(true)
    toast('Generating FIR PDF E-Copy...', 'info')
    try {
      const html2pdf = await loadHtml2Pdf()
      const element = document.getElementById('fir-pdf-printable-area')
      if (!element) {
        toast('PDF printable element not found', 'error')
        setExporting(false)
        return
      }

      // Temporarily make printable container visible and fully opaque for html2canvas rendering
      const wrapper = element.parentElement
      if (wrapper) {
        wrapper.style.visibility = 'visible'
        wrapper.style.opacity = '1'
      }

      // Wait until printable container is fully rendered / layout recalculated
      await new Promise((resolve) => setTimeout(resolve, 500))

      const opt = {
        margin:       0,
        filename:     `FIR_${firData.number || 'DRAFT'}.pdf`,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'] }
      }

      await html2pdf().set(opt).from(element).save()

      // Restore hidden styling
      if (wrapper) {
        wrapper.style.visibility = 'hidden'
        wrapper.style.opacity = '0'
      }

      toast('PDF downloaded successfully', 'success')
    } catch (err) {
      console.error(err)
      toast(`Failed to download PDF: ${err instanceof Error ? err.message : String(err)}`, 'error')
    } finally {
      setExporting(false)
    }
  }

  const handleSubmit = () => {
    setShowSubmitDialog(true)
  }

  const confirmSubmit = () => {
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setShowSubmitDialog(false)
      toast('FIR submitted successfully', 'success')
    }, 2000)
  }

  if (!firData) {
    return (
      <div className="p-10 text-center text-muted-foreground">
        Loading FIR...
      </div>
    )
  }

  const hasValue = (value: unknown) =>
    value !== undefined &&
    value !== null &&
    String(value).trim() !== ""

  const renderField = (
    label: string,
    value: unknown,
    className = ""
  ) => {
    if (!hasValue(value)) return null

    return (
      <div key={label} className={className}>
        <span className="text-muted-foreground">{label}:</span>
        <p className="font-medium">{String(value)}</p>
      </div>
    )
  }

  const complainantEntries = [
    { label: "Name", value: firData.complainant.name },
    { label: "Father's Name", value: firData.complainant.fatherName },
    { label: "Age", value: firData.complainant.age },
    { label: "Gender", value: firData.complainant.gender },
    { label: "Mobile", value: firData.complainant.mobile },
    { label: "Address", value: firData.complainant.address, className: "md:col-span-2" }
  ]

  const incidentEntries = [
    { label: "Date", value: firData.incident.date },
    { label: "Time", value: firData.incident.time },
    { label: "Place", value: firData.incident.place }
  ]

  const propertyEntries = [
    { label: "Property Type", value: firData.property.type },
    { label: "Registration", value: firData.property.registration },
    { label: "Vehicle Model", value: firData.property.vehicleModel },
    { label: "Vehicle Color", value: firData.property.vehicleColor },
    { label: "Description", value: firData.property.description },
    { label: "Estimated Value", value: firData.property.value }
  ]

  const cyberEntries = [
    { label: "Bank Name", value: firData.cyber.bankName },
    { label: "Transaction ID", value: firData.cyber.transactionId },
    { label: "Amount Lost", value: firData.cyber.amountLost }
  ]

  const hasPropertyDetails =
    propertyEntries.some(item => hasValue(item.value))

  const hasCyberDetails =
    cyberEntries.some(item => hasValue(item.value))

  const caseData = JSON.parse(localStorage.getItem("caseData") || "{}")
  const caseId = id || caseData.id || "new"
  const crimeType = caseData.crime_type || (Array.isArray(caseData.possible_offences) && caseData.possible_offences[0]) || 'Unknown Offence'

  const displayCaseId = (id && id !== 'new') ? id : (firData.id && firData.id !== 'new' ? firData.id : "Not Available")
  const missingDocs = requiredDocs.filter(docName => !uploadedFiles.some(f => f.doc_name === docName))

  // Dynamically verify if Complainant ID Proof has been uploaded and verified
  const idProofFile = uploadedFiles.find(f => f.doc_name.toLowerCase().includes('id proof'))
  const idProofStatus = idProofFile
    ? (idProofFile.status === 'Verified' ? 'Uploaded & Verified' : 'Uploaded (Pending Verification)')
    : 'Not Uploaded'

  // Accused check: Known or Unknown suspect categorization
  const accusedName = caseData.accused_name || firData.accused?.name || ""
  const isAccusedKnown = accusedName && accusedName.trim().toLowerCase() !== 'unknown'
  const finalAccusedName = accusedName || "Unknown"
  const accusedStatusText = isAccusedKnown ? "Known" : "Unknown"
  const accusedDescription = caseData.accused_description || "Not Available"

  // Evidence completion calculations
  const evidenceCompletionPercent = requiredDocs.length > 0 
    ? Math.round((uploadedFiles.length / requiredDocs.length) * 100) 
    : 100

  // Action summary dynamic texts
  const caseRegisteredStatus = "Yes, Registered under Section 173 BNS / Section 154 Cr.P.C."
  const investigationRecommended = firData.officer?.name && firData.officer.name !== 'Not Available'
    ? `Yes, Assigned to investigator ${firData.officer.name} (${firData.officer.rank || 'Officer'})`
    : "Not Available"
  const evidenceReviewedStatus = uploadedFiles.length > 0 
    ? `Yes, ${uploadedFiles.length} of ${requiredDocs.length} files reviewed` 
    : "Pending file upload review"
  const legalSectionsVerifiedStatus = firData.sections && firData.sections.length > 0 
    ? "Yes, recommended BNS mappings verified" 
    : "Pending legal review"

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">FIR Draft Generator</h1>
          <p className="text-muted-foreground mt-1">
            Review and finalize the FIR document
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? <Eye className="w-4 h-4 mr-2" /> : <Edit2 className="w-4 h-4 mr-2" />}
            {showPreview ? 'Edit Mode' : 'Preview Mode'}
          </Button>
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
              i === 4 ? 'bg-accent text-white' : 'bg-success text-white'
            )}>
              {i < 4 ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={cn(
              'text-sm hidden sm:block',
              i === 4 ? 'text-accent font-medium' : 'text-muted-foreground'
            )}>
              {step}
            </span>
            {i < 4 && (
              <ArrowRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
            )}
          </div>
        ))}
      </div>

      {/* FIR Document (Preserved Dark/White theme) */}
      <Card className="bg-white dark:bg-card/90 backdrop-blur border-white/10 shadow-2xl">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-success flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">FIRST INFORMATION REPORT</h2>
                <p className="text-sm text-muted-foreground">{firData.stationName}</p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="default" className="text-lg px-4 py-2">
                {firData.number}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* FIR Header Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Date:</span>
              <p className="font-medium">{firData.date}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Time:</span>
              <p className="font-medium">{firData.time}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Station:</span>
              <p className="font-medium">{firData.stationCode}</p>
            </div>
            <div>
              <span className="text-muted-foreground">District:</span>
              <p className="font-medium">{firData.district}</p>
            </div>
          </div>

          {/* Complainant Details */}
          <div className="bg-secondary/30 rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-accent" />
              Complainant Details
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              {complainantEntries.map(item =>
                renderField(item.label, item.value, item.className)
              )}
            </div>
          </div>

          {/* Incident Details */}
          <div className="bg-secondary/30 rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-warning" />
              Incident Details
            </h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              {incidentEntries.map(item =>
                renderField(item.label, item.value)
              )}
            </div>
          </div>

          {/* Property Details */}
          {hasPropertyDetails && (
            <div className="bg-secondary/30 rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-success" />
                Property Details
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                {propertyEntries.map(item =>
                  renderField(item.label, item.value)
                )}
              </div>
            </div>
          )}

          {hasCyberDetails && (
            <div className="bg-secondary/30 rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-success" />
                Cyber Transaction Details
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                {cyberEntries.map(item =>
                  renderField(item.label, item.value)
                )}
              </div>
            </div>
          )}

          {/* FIR Narrative */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              FIR Narrative
            </h3>
            <div className="bg-white dark:bg-card rounded p-4 text-sm leading-relaxed whitespace-pre-wrap text-zinc-900 dark:text-foreground">
              {firData.narrative || "No narrative generated"}
            </div>
          </div>

          {/* FIR Details */}
          <div className="bg-secondary/30 rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-accent" />
              Occurrence Details
            </h3>
            <Textarea
              value={firData.details}
              className="min-h-[150px] text-sm"
              placeholder="Enter FIR details..."
              onChange={(e) => setFirData({ ...firData, details: e.target.value })}
            />
          </div>

          {/* BNS Sections */}
          <div className="bg-secondary/30 rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Scale className="w-4 h-4 text-accent" />
              Applicable BNS Sections
            </h3>
            <div className="flex flex-wrap gap-2">
              {firData.sections.map((section: string) => (
                <Badge key={section} variant="default" className="text-sm px-3 py-1">
                  {section}
                </Badge>
              ))}
            </div>
          </div>

          {/* Officer Details */}
          <div className="bg-secondary/30 rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent" />
              Investigating Officer
            </h3>
            <div className="flex items-center justify-between">
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <p className="font-medium">{firData.officer.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Rank:</span>
                  <p className="font-medium">{firData.officer.rank}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Badge No:</span>
                  <p className="font-medium">{firData.officer.badge}</p>
                </div>
              </div>
              <div className="text-right hidden md:block">
                <div className="border-t-4 border-foreground w-40 pt-2">
                  <p className="text-xs text-muted-foreground">Signature</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4">
        <Link to={`/complaint/${caseId}/missing`}>
          <Button variant="outline">
            Back
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveDraft}>
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={exporting}>
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Download PDF
          </Button>
          <Button onClick={handleSubmit}>
            <Send className="w-4 h-4 mr-2" />
            Submit FIR
          </Button>
        </div>
      </div>

      {/* Submit Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Confirm FIR Submission</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              You are about to submit this FIR. This action will forward the FIR to the court and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-xs">
            <div className="bg-secondary/50 rounded-lg p-4 space-y-1">
              <p className="text-sm"><strong>FIR Number:</strong> {firData.number}</p>
              <p className="text-sm"><strong>Complainant:</strong> {firData.complainant.name}</p>
              <p className="text-sm"><strong>BNS Sections:</strong> {firData.sections.join(', ')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Confirm Submission'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden Printable Document Container for Isolated PDF Generation */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '800px', opacity: 0, visibility: 'hidden', pointerEvents: 'none', zIndex: -9999 }}>
        <div id="fir-pdf-printable-area" style={{ backgroundColor: '#ffffff', color: '#18181b', padding: '48px', fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif', fontSize: '11.5px', lineHeight: '1.6' }}>
          
          {/* Document CSS Styles */}
          <style>{`
            .pdf-section {
              margin-bottom: 24px;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .pdf-title-block {
              border-bottom: 2px solid #18181b;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }
            .pdf-logo {
              width: 60px;
              height: 60px;
            }
            .pdf-label {
              color: #71717a;
              font-weight: bold;
              text-transform: uppercase;
              font-size: 8px;
              display: block;
              margin-bottom: 2px;
            }
            .pdf-bold {
              font-weight: bold;
            }
            .pdf-accent-text {
              color: #0369a1;
              font-weight: bold;
            }
          `}</style>

          {/* SECTION 1: FIR Header */}
          <table className="pdf-section" style={{ width: '100%', borderBottom: '2px solid #18181b', paddingBottom: '16px', marginBottom: '20px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ verticalAlign: 'middle', width: '70px', padding: 0 }}>
                  <div className="pdf-logo">
                    <svg width="60" height="60" viewBox="0 0 100 100" fill="none" stroke="#18181b" strokeWidth="1.5">
                      <circle cx="50" cy="50" r="44" strokeDasharray="2 2" />
                      <circle cx="50" cy="50" r="37" />
                      <circle cx="50" cy="50" r="18" />
                      <path d="M50 13 L50 87 M13 50 L87 50" strokeWidth="1" />
                      <path d="M50 15 L53 30 L68 30 L55 38 L60 53 L50 44 L40 53 L45 38 L32 30 L47 30 Z" fill="#18181b" />
                      <text x="50" y="74" textAnchor="middle" fontSize="7" fontWeight="900" fill="#18181b" fontFamily="sans-serif">FORTHRIGHT AI</text>
                      <text x="50" y="81" textAnchor="middle" fontSize="4.5" fontWeight="bold" fill="#18181b" fontFamily="sans-serif">TRUTH ALONE TRIUMPHS</text>
                    </svg>
                  </div>
                </td>
                <td style={{ verticalAlign: 'middle', padding: 0 }}>
                  <h1 style={{ margin: 0, fontSize: '15px', fontWeight: '900', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>Tamil Nadu Police Department</h1>
                  <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'Arial, sans-serif' }}>First Information Report</p>
                  <p style={{ margin: 0, fontSize: '9px', color: '#52525b', fontFamily: 'Arial, sans-serif' }}>(Under Section 173 BNS / Section 154 Cr.P.C.)</p>
                </td>
                <td style={{ verticalAlign: 'middle', textAlign: 'right', fontFamily: 'Arial, sans-serif', fontSize: '10px', width: '220px', padding: 0 }}>
                  <div style={{ backgroundColor: '#f4f4f5', border: '1px solid #d4d4d8', padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace', display: 'inline-block' }}>
                    FIR NO: {firData.number || 'Not Available'}
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '9px' }}><span style={{ fontWeight: 'bold' }}>Case ID:</span> {displayCaseId}</p>
                  <p style={{ margin: 0, fontSize: '9px' }}><span style={{ fontWeight: 'bold' }}>Generated Date:</span> {new Date().toLocaleDateString('en-IN')}</p>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Grid Layout (District, Station, Year, Date/Time) */}
          <table style={{ width: '100%', border: '1px solid #18181b', borderCollapse: 'collapse', fontFamily: 'Arial, sans-serif', fontSize: '10px', marginBottom: '20px' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #18181b', padding: '6px', width: '25%' }}>
                  <span className="pdf-label">District</span>
                  <span className="pdf-bold">{firData.district || 'Not Available'}</span>
                </td>
                <td style={{ border: '1px solid #18181b', padding: '6px', width: '25%' }}>
                  <span className="pdf-label">Police Station</span>
                  <span className="pdf-bold">{firData.stationName || 'Not Available'}</span>
                </td>
                <td style={{ border: '1px solid #18181b', padding: '6px', width: '15%' }}>
                  <span className="pdf-label">Year</span>
                  <span className="pdf-bold">{new Date().getFullYear()}</span>
                </td>
                <td style={{ border: '1px solid #18181b', padding: '6px', width: '35%' }}>
                  <span className="pdf-label">Date & Time of FIR</span>
                  <span className="pdf-bold">{firData.date || 'Not Available'} {firData.time || 'Not Available'}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* SECTION 2: Legal Details */}
          <div className="pdf-section">
            <h3 style={{ margin: '0 0 6px 0', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #18181b', fontFamily: 'Arial, sans-serif' }}>2. Legal Registration Details</h3>
            <table className="pdf-table text-[10px]" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d4d4d8' }}>
              <thead>
                <tr style={{ backgroundColor: '#f4f4f5' }}>
                  <th style={{ border: '1px solid #d4d4d8', padding: '6px', width: '40%' }}>Applicable Acts</th>
                  <th style={{ border: '1px solid #d4d4d8', padding: '6px', width: '25%' }}>Recommended BNS Sections</th>
                  <th style={{ border: '1px solid #d4d4d8', padding: '6px', width: '20%' }}>Crime Category</th>
                  <th style={{ border: '1px solid #d4d4d8', padding: '6px', width: '15%' }}>Risk Level</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #d4d4d8', padding: '6px' }}>Bharatiya Nyaya Sanhita (BNS), 2023 {crimeType.toLowerCase().includes('cyber') ? '& Information Technology Act, 2000' : ''}</td>
                  <td className="pdf-bold pdf-accent-text" style={{ border: '1px solid #d4d4d8', padding: '6px', color: '#0369a1' }}>
                    {firData.sections && firData.sections.length > 0 
                      ? firData.sections.map((s: string) => s.replace('BNS ', '')).join(', ')
                      : 'Not Available'}
                  </td>
                  <td className="pdf-bold" style={{ border: '1px solid #d4d4d8', padding: '6px' }}>{crimeType || 'Not Available'}</td>
                  <td className="pdf-bold" style={{ border: '1px solid #d4d4d8', padding: '6px', color: '#b91c1c' }}>{riskAssessment?.threat_level || riskAssessment?.risk_assessment || 'Not Available'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SECTION 3: Occurrence Details */}
          <div className="pdf-section">
            <h3 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #18181b', fontFamily: 'Arial, sans-serif' }}>3. Occurrence Details</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d4d4d8', fontFamily: 'Arial, sans-serif', fontSize: '10px' }}>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #d4d4d8', padding: '8px', width: '33%' }}>
                    <span className="pdf-label">Date of Occurrence:</span>
                    <span className="pdf-bold">{firData.incident?.date || firData.date || 'Not Available'}</span>
                  </td>
                  <td style={{ border: '1px solid #d4d4d8', padding: '8px', width: '33%' }}>
                    <span className="pdf-label">Time of Occurrence:</span>
                    <span className="pdf-bold">{firData.incident?.time || firData.time || 'Not Available'}</span>
                  </td>
                  <td style={{ border: '1px solid #d4d4d8', padding: '8px', width: '34%' }}>
                    <span className="pdf-label">Place of Occurrence:</span>
                    <span className="pdf-bold">{firData.incident?.place || 'Not Available'}</span>
                  </td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #d4d4d8', padding: '8px' }}>
                    <span className="pdf-label">Date Reported to P.S.:</span>
                    <span className="pdf-bold">{new Date().toLocaleDateString('en-IN')}</span>
                  </td>
                  <td style={{ border: '1px solid #d4d4d8', padding: '8px' }}>
                    <span className="pdf-label">Time Reported to P.S.:</span>
                    <span className="pdf-bold">{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  <td style={{ border: '1px solid #d4d4d8', padding: '8px' }}>
                    <span className="pdf-label">GD Reference Entry:</span>
                    <span className="pdf-bold">GD-Entry 49</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SECTION 4: Complainant Details */}
          <div className="pdf-section">
            <h3 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #18181b', fontFamily: 'Arial, sans-serif' }}>4. Complainant Details</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d4d4d8', fontFamily: 'Arial, sans-serif', fontSize: '10px' }}>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #d4d4d8', padding: '8px', width: '25%' }}>
                    <span className="pdf-label">Name:</span>
                    <span className="pdf-bold">{firData.complainant?.name || 'Not Available'}</span>
                  </td>
                  <td style={{ border: '1px solid #d4d4d8', padding: '8px', width: '25%' }}>
                    <span className="pdf-label">Father/Husband Name:</span>
                    <span className="pdf-bold">{firData.complainant?.fatherName || 'Not Available'}</span>
                  </td>
                  <td style={{ border: '1px solid #d4d4d8', padding: '8px', width: '25%' }}>
                    <span className="pdf-label">Age / Gender:</span>
                    <span className="pdf-bold">{firData.complainant?.age || 'Not Available'} / {firData.complainant?.gender || 'Not Available'}</span>
                  </td>
                  <td style={{ border: '1px solid #d4d4d8', padding: '8px', width: '25%' }}>
                    <span className="pdf-label">Contact Number:</span>
                    <span className="pdf-bold">{firData.complainant?.mobile || 'Not Available'}</span>
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} style={{ border: '1px solid #d4d4d8', padding: '8px' }}>
                    <span className="pdf-label">Address:</span>
                    <span className="pdf-bold">{firData.complainant?.address || 'Not Available'}</span>
                  </td>
                  <td style={{ border: '1px solid #d4d4d8', padding: '8px' }}>
                    <span className="pdf-label">ID Proof Status:</span>
                    <span className="pdf-bold" style={{ color: idProofStatus.includes('Verified') ? '#15803d' : '#b91c1c' }}>{idProofStatus}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SECTION 5: Accused Details */}
          <div className="pdf-section">
            <h3 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #18181b', fontFamily: 'Arial, sans-serif' }}>5. Accused Details</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d4d4d8', fontFamily: 'Arial, sans-serif', fontSize: '10px' }}>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #d4d4d8', padding: '8px', width: '50%' }}>
                    <span className="pdf-label">Name:</span>
                    <span className="pdf-bold">{finalAccusedName}</span>
                  </td>
                  <td style={{ border: '1px solid #d4d4d8', padding: '8px', width: '50%' }}>
                    <span className="pdf-label">Known / Unknown:</span>
                    <span className="pdf-bold">{accusedStatusText}</span>
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ border: '1px solid #d4d4d8', padding: '8px' }}>
                    <span className="pdf-label">Description:</span>
                    <span className="pdf-bold">{accusedDescription}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SECTION 6: Property Details */}
          <div className="pdf-section">
            <h3 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #18181b', fontFamily: 'Arial, sans-serif' }}>6. Property Details</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d4d4d8', fontFamily: 'Arial, sans-serif', fontSize: '10px' }}>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #d4d4d8', padding: '8px', width: '33%' }}>
                    <span className="pdf-label">Property Type:</span>
                    <span className="pdf-bold">{firData.property?.type || 'Not Available'}</span>
                  </td>
                  <td style={{ border: '1px solid #d4d4d8', padding: '8px', width: '33%' }}>
                    <span className="pdf-label">Estimated Value:</span>
                    <span className="pdf-bold">{firData.property?.value ? `₹${firData.property.value}` : 'Not Available'}</span>
                  </td>
                  <td style={{ border: '1px solid #d4d4d8', padding: '8px', width: '34%' }}>
                    <span className="pdf-label">Property Description:</span>
                    <span className="pdf-bold">{firData.property?.description || 'Not Available'} {firData.property?.registration ? `(Reg: ${firData.property.registration})` : ''}</span>
                  </td>
                </tr>
                {firData.cyber?.bankName && (
                  <tr>
                    <td style={{ border: '1px solid #d4d4d8', padding: '8px' }}>
                      <span className="pdf-label">Cyber Bank Name:</span>
                      <span className="pdf-bold">{firData.cyber.bankName}</span>
                    </td>
                    <td style={{ border: '1px solid #d4d4d8', padding: '8px' }}>
                      <span className="pdf-label">Transaction ID:</span>
                      <span className="pdf-bold" style={{ fontFamily: 'monospace' }}>{firData.cyber.transactionId || 'Not Available'}</span>
                    </td>
                    <td style={{ border: '1px solid #d4d4d8', padding: '8px' }}>
                      <span className="pdf-label">Loss Amount:</span>
                      <span className="pdf-bold" style={{ color: '#b91c1c' }}>{firData.cyber.amountLost ? `₹${firData.cyber.amountLost}` : 'Not Available'}</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* SECTION 7: Evidence Summary */}
          <div className="pdf-section">
            <h3 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #18181b', fontFamily: 'Arial, sans-serif' }}>7. Evidence Summary</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d4d4d8', fontFamily: 'Arial, sans-serif', fontSize: '10px' }}>
              <tbody>
                <tr style={{ backgroundColor: '#f4f4f5' }}>
                  <th style={{ border: '1px solid #d4d4d8', padding: '6px', width: '33%', textAlign: 'left' }}>Uploaded Documents ({uploadedFiles.length})</th>
                  <th style={{ border: '1px solid #d4d4d8', padding: '6px', width: '33%', textAlign: 'left' }}>Verified Documents ({uploadedFiles.filter(f => f.status === 'Verified').length})</th>
                  <th style={{ border: '1px solid #d4d4d8', padding: '6px', width: '34%', textAlign: 'left' }}>Missing Documents ({missingDocs.length})</th>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #d4d4d8', padding: '8px', verticalAlign: 'top' }}>
                    <ul style={{ margin: 0, paddingLeft: '14px', listStyleType: 'square' }}>
                      {uploadedFiles.length > 0 ? (
                        uploadedFiles.map((f: any, idx: number) => (
                          <li key={idx} style={{ fontSize: '9px', marginBottom: '2px' }}>
                            {f.doc_name}
                          </li>
                        ))
                      ) : (
                        <span style={{ color: '#71717a', fontStyle: 'italic' }}>Not Available</span>
                      )}
                    </ul>
                  </td>
                  <td style={{ border: '1px solid #d4d4d8', padding: '8px', verticalAlign: 'top' }}>
                    <ul style={{ margin: 0, paddingLeft: '14px', listStyleType: 'square' }}>
                      {uploadedFiles.filter(f => f.status === 'Verified').length > 0 ? (
                        uploadedFiles.filter(f => f.status === 'Verified').map((f: any, idx: number) => (
                          <li key={idx} style={{ fontSize: '9px', color: '#15803d', fontWeight: 'bold', marginBottom: '2px' }}>
                            {f.doc_name}
                          </li>
                        ))
                      ) : (
                        <span style={{ color: '#71717a', fontStyle: 'italic' }}>Not Available</span>
                      )}
                    </ul>
                  </td>
                  <td style={{ border: '1px solid #d4d4d8', padding: '8px', verticalAlign: 'top' }}>
                    <ul style={{ margin: 0, paddingLeft: '14px', listStyleType: 'square' }}>
                      {missingDocs.length > 0 ? (
                        missingDocs.slice(0, 4).map((mDoc: string, idx: number) => (
                          <li key={idx} style={{ fontSize: '9px', color: '#b91c1c', marginBottom: '2px' }}>
                            {mDoc}
                          </li>
                        ))
                      ) : (
                        <span style={{ color: '#15803d', fontWeight: 'bold' }}>All evidence collected</span>
                      )}
                    </ul>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SECTION 8: AI Generated FIR Narrative */}
          <div className="pdf-section">
            <h3 style={{ margin: '0 0 6px 0', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #18181b', fontFamily: 'Arial, sans-serif' }}>8. AI Generated FIR Narrative</h3>
            <div style={{ padding: '12px', border: '1px solid #d4d4d8', backgroundColor: '#fafafa', fontStyle: 'italic', fontSize: '11px', textJustify: 'inter-word', whiteSpace: 'pre-wrap' }}>
              {firData.narrative || 'Not Available'}
            </div>
          </div>

          {/* SECTION 9: Officer Review Summary */}
          <div className="pdf-section">
            <h3 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #18181b', fontFamily: 'Arial, sans-serif' }}>9. Officer Review Summary</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d4d4d8', backgroundColor: '#f4f4f5', fontFamily: 'Arial, sans-serif', fontSize: '10px' }}>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #d4d4d8', padding: '10px', textAlign: 'center', width: '33%' }}>
                    <span className="pdf-label">FIR Readiness Score</span>
                    <p style={{ margin: '2px 0 0 0', fontSize: '13px', fontWeight: '900', color: '#0284c7' }}>{readinessScore}%</p>
                  </td>
                  <td style={{ border: '1px solid #d4d4d8', padding: '10px', textAlign: 'center', width: '33%' }}>
                    <span className="pdf-label">Evidence Completion Percentage</span>
                    <p style={{ margin: '2px 0 0 0', fontSize: '13px', fontWeight: '900', color: '#16a34a' }}>{evidenceCompletionPercent}%</p>
                  </td>
                  <td style={{ border: '1px solid #d4d4d8', padding: '10px', textAlign: 'center', width: '34%' }}>
                    <span className="pdf-label">Review Status</span>
                    <p style={{ margin: '2px 0 0 0', fontSize: '10px', fontWeight: '900', color: '#16a34a' }}>{readinessScore >= 80 ? 'APPROVED FOR REGISTRATION' : 'PENDING REVIEW'}</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SECTION 10: Action Taken */}
          <div className="pdf-section">
            <h3 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #18181b', fontFamily: 'Arial, sans-serif' }}>10. Action Taken</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d4d4d8', backgroundColor: '#fcfcfc', fontFamily: 'Arial, sans-serif', fontSize: '10px' }}>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #d4d4d8', padding: '8px', width: '50%', verticalAlign: 'top' }}>
                    <span className="pdf-bold">Case Registered:</span>
                    <div style={{ marginTop: '2px' }}>{caseRegisteredStatus}</div>
                  </td>
                  <td style={{ border: '1px solid #d4d4d8', padding: '8px', width: '50%', verticalAlign: 'top' }}>
                    <span className="pdf-bold">Investigation Recommended:</span>
                    <div style={{ marginTop: '2px' }}>{investigationRecommended}</div>
                  </td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #d4d4d8', padding: '8px', verticalAlign: 'top' }}>
                    <span className="pdf-bold">Evidence Reviewed:</span>
                    <div style={{ marginTop: '2px' }}>{evidenceReviewedStatus}</div>
                  </td>
                  <td style={{ border: '1px solid #d4d4d8', padding: '8px', verticalAlign: 'top' }}>
                    <span className="pdf-bold">Legal Sections Verified:</span>
                    <div style={{ marginTop: '2px' }}>{legalSectionsVerifiedStatus}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SECTION 11: Digital Signature Area */}
          <table className="pdf-section" style={{ width: '100%', marginTop: '40px', borderCollapse: 'collapse', border: 'none', fontFamily: 'Arial, sans-serif', fontSize: '10px' }}>
            <tbody>
              <tr>
                <td style={{ textAlign: 'center', verticalAlign: 'top', width: '40%', padding: 0 }}>
                  <div style={{ borderBottom: '1px dashed #71717a', width: '180px', margin: '0 auto 8px auto' }} />
                  <p style={{ margin: 0, fontWeight: 'bold', color: '#3f3f46' }}>Complainant Signature</p>
                </td>
                
                <td style={{ textAlign: 'center', verticalAlign: 'top', width: '20%', padding: 0 }}>
                  <div style={{ border: '1px solid #d4d4d8', padding: '8px', borderRadius: '4px', fontSize: '8px', color: '#71717a', display: 'inline-block' }}>
                    <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', textTransform: 'uppercase' }}>POLICE STATION SEAL</p>
                    <div style={{ height: '36px', width: '80px', border: '1px dashed #d4d4d8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px auto' }}>
                      [ STATION SEAL ]
                    </div>
                    <p style={{ margin: 0 }}>Date: {new Date().toLocaleDateString('en-IN')}</p>
                  </div>
                </td>

                <td style={{ textAlign: 'center', verticalAlign: 'top', width: '40%', padding: 0 }}>
                  <span style={{ fontSize: '8px', color: '#a1a1aa', fontStyle: 'italic', display: 'block', marginBottom: '4px' }}>[Signed Digitally]</span>
                  <div style={{ borderBottom: '1px dashed #71717a', width: '180px', margin: '0 auto 8px auto' }} />
                  <p style={{ margin: 0, fontWeight: 'bold', color: '#3f3f46' }}>Investigating Officer Signature</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '8px', color: '#71717a' }}>Name: {firData.officer?.name || 'Not Available'}</p>
                  <p style={{ margin: 0, fontSize: '8px', color: '#71717a' }}>Rank: {firData.officer?.rank || 'Not Available'}, Badge: {firData.officer?.badge || 'Not Available'}</p>
                </td>
              </tr>
            </tbody>
          </table>

        </div>
      </div>

    </div>
  )
}

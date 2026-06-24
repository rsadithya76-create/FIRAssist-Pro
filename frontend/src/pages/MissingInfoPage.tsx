import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  Send,
  User,
  Calendar,
  AlertCircle,
  Scale,
  ShieldAlert
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

import { useToast } from '@/hooks'
import { cn } from '@/lib/utils'
import { API_BASE_URL } from '@/config'

// Import the new metrics cards
import EvidenceSummaryCard from '@/components/features/EvidenceSummaryCard'
import FIRReadinessCard from '@/components/features/FIRReadinessCard'
import AICaseSummaryCard from '@/components/features/AICaseSummaryCard'
import CaseCompletenessCard from '@/components/features/CaseCompletenessCard'
import MissingInformationCard from '@/components/features/MissingInformationCard'
import RiskLevelCard from '@/components/features/RiskLevelCard'

export default function MissingInfoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [question, setQuestion] = useState("")
  const [field, setField] = useState("")
  const [answer, setAnswer] = useState("")
  const [loading, setLoading] = useState(true)
  const [complete, setComplete] = useState(false)

  const [caseData, setCaseData] = useState<any>({})
  const [history, setHistory] = useState<any[]>([])

  // Officer confirmations
  const [confirmations, setConfirmations] = useState([false, false, false, false])

  const confirmationLabels = [
    "I have verified all Complainant details and Incident description.",
    "I have reviewed the mapped BNS sections and legal provisions.",
    "I have checked that all required supporting documents/evidence are uploaded.",
    "I confirm that this case dossier is legally sufficient to register an FIR."
  ]

  const isConfirmed = confirmations.every(Boolean)

  useEffect(() => {
    loadFirstQuestion()
  }, [])

  const loadFirstQuestion = async () => {
    try {
      const savedData = localStorage.getItem("caseData")
      const data = savedData ? JSON.parse(savedData) : {}
      setCaseData(data)

      const nextFieldResponse = await fetch(
        `${API_BASE_URL}/investigation/next-field`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            case_data: data
          })
        }
      )

      const nextFieldData = await nextFieldResponse.json()

      if (nextFieldData.status === "complete") {
        setComplete(true)
        setQuestion("Investigation Complete. Click Generate FIR to continue.")
        setField("")
        setLoading(false)
        return
      }

      const response = await fetch(
        `${API_BASE_URL}/investigation/next-question`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            field: nextFieldData.field,
            case_data: data
          })
        }
      )

      const result = await response.json()
      setField(result.field)
      setQuestion(result.question)
      setLoading(false)
    } catch (error) {
      console.error(error)
      toast("Unable to load investigation", "error")
    }
  }

  const submitAnswer = async () => {
    if (!answer.trim()) return

    try {
      const response = await fetch(
        `${API_BASE_URL}/investigation/submit-answer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            field,
            answer,
            case_data: caseData
          })
        }
      )

      const updated = await response.json()

      if (updated.status === "error") {
        toast(updated.message, "error")
        return
      }

      const updatedCaseData = updated.case_data

      setHistory(prev => [
        ...prev,
        {
          question,
          answer
        }
      ])

      setCaseData(updatedCaseData)
      localStorage.setItem("caseData", JSON.stringify(updatedCaseData))
      setAnswer("")

      const nextFieldResponse = await fetch(
        `${API_BASE_URL}/investigation/next-field`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            case_data: updatedCaseData
          })
        }
      )

      const nextFieldData = await nextFieldResponse.json()

      if (nextFieldData.status === "complete") {
        toast("Investigation Complete", "success")
        setComplete(true)
        setField("")
        setQuestion("Investigation Complete. Click Generate FIR to continue.")
        return
      }

      const nextQuestionResponse = await fetch(
        `${API_BASE_URL}/investigation/next-question`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            field: nextFieldData.field,
            case_data: updatedCaseData
          })
        }
      )

      const nextQuestion = await nextQuestionResponse.json()
      setField(nextQuestion.field)
      setQuestion(nextQuestion.question)
      toast("Answer saved", "success")
    } catch (error) {
      console.error(error)
    }
  }

  const handleContinue = () => {
    localStorage.setItem("caseData", JSON.stringify(caseData))
    navigate("/complaint/new/fir")
  }

  const caseId = id || caseData.id || 'new'
  const crimeType = caseData.crime_type || (Array.isArray(caseData.possible_offences) && caseData.possible_offences[0]) || 'Unknown Offence'

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Review & Confirm Case</h1>
        <p className="text-muted-foreground mt-1">
          Final review of case details, evidence checklist, and legal analysis before FIR generation
        </p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-4">
        {[
          'Complaint Intake',
          'Information Extraction',
          'Evidence & Documents',
          'Review & Confirm',
          'FIR Generation'
        ].map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                i === 3
                  ? 'bg-accent text-white'
                  : i < 3
                  ? 'bg-success text-white'
                  : 'bg-secondary text-muted-foreground'
              )}
            >
              {i < 3 ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span
              className={cn(
                'text-sm hidden sm:block',
                i === 3 ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {step}
            </span>
            {i < 4 && (
              <ArrowRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
            )}
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Case Dashboard & Checklists */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Complainant Details */}
          <Card className="bg-card/50 backdrop-blur border-white/10">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-4 text-accent flex items-center gap-2">
                <User className="w-5 h-5" />
                Complainant Details
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Full Name</p>
                  <p className="font-semibold text-foreground/90 mt-0.5">{caseData.victim_name || 'Not Available'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Father/Husband Name</p>
                  <p className="font-semibold text-foreground/90 mt-0.5">{caseData.victim_father_name || 'Not Available'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Contact Number</p>
                  <p className="font-semibold text-foreground/90 mt-0.5">{caseData.victim_phone || 'Not Available'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Age</p>
                  <p className="font-semibold text-foreground/90 mt-0.5">{caseData.victim_age || 'Not Available'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gender</p>
                  <p className="font-semibold text-foreground/90 mt-0.5">{caseData.victim_gender || 'Not Available'}</p>
                </div>
                <div className="col-span-2 md:col-span-3">
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="font-semibold text-foreground/90 mt-0.5">{caseData.victim_address || 'Not Available'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Incident Details */}
          <Card className="bg-card/50 backdrop-blur border-white/10">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-4 text-accent flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Incident Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Date of Occurrence</p>
                  <p className="font-semibold text-foreground/90 mt-0.5">{caseData.incident_date || 'Not Available'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time of Occurrence</p>
                  <p className="font-semibold text-foreground/90 mt-0.5">{caseData.incident_time || 'Not Available'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Place of Occurrence</p>
                  <p className="font-semibold text-foreground/90 mt-0.5">{caseData.location || 'Not Available'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Crime Type</p>
                  <p className="font-semibold text-foreground/90 mt-0.5">{crimeType}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Incident Summary</p>
                <p className="text-sm font-medium text-foreground/90 mt-1 p-3 rounded-lg bg-secondary/15 border border-white/5 leading-relaxed">
                  {caseData.incident_summary || 'Not Available'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 3. Accused Details */}
          <Card className="bg-card/50 backdrop-blur border-white/10">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-4 text-accent flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Accused Details
              </h3>
              <div className="text-sm">
                <p className="text-xs text-muted-foreground">Accused/Suspect Name(s)</p>
                <p className="font-semibold text-foreground/90 mt-0.5">{caseData.accused_name || 'Unknown / Unspecified'}</p>
              </div>
            </CardContent>
          </Card>

          {/* 4. Property & Cyber Details */}
          <Card className="bg-card/50 backdrop-blur border-white/10">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-4 text-accent flex items-center gap-2">
                <Scale className="w-5 h-5" />
                Property & Cyber Details
              </h3>
              {caseData.property_type || caseData.property_value || caseData.bank_name || caseData.transaction_id || caseData.amount_lost || caseData.vehicle_number || caseData.vehicle_model || caseData.vehicle_color ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {caseData.property_type && (
                    <div>
                      <p className="text-xs text-muted-foreground">Property Type</p>
                      <p className="font-semibold text-foreground/90 mt-0.5">{caseData.property_type}</p>
                    </div>
                  )}
                  {caseData.property_value && (
                    <div>
                      <p className="text-xs text-muted-foreground">Property Value</p>
                      <p className="font-semibold text-foreground/90 mt-0.5">₹{caseData.property_value}</p>
                    </div>
                  )}
                  {caseData.vehicle_number && (
                    <div>
                      <p className="text-xs text-muted-foreground">Vehicle Reg. Number</p>
                      <p className="font-semibold text-foreground/90 mt-0.5">{caseData.vehicle_number}</p>
                    </div>
                  )}
                  {caseData.vehicle_model && (
                    <div>
                      <p className="text-xs text-muted-foreground">Vehicle Model / Color</p>
                      <p className="font-semibold text-foreground/90 mt-0.5">
                        {caseData.vehicle_model} {caseData.vehicle_color ? `(${caseData.vehicle_color})` : ''}
                      </p>
                    </div>
                  )}
                  {caseData.bank_name && (
                    <div>
                      <p className="text-xs text-muted-foreground">Bank Name</p>
                      <p className="font-semibold text-foreground/90 mt-0.5">{caseData.bank_name}</p>
                    </div>
                  )}
                  {caseData.transaction_id && (
                    <div>
                      <p className="text-xs text-muted-foreground">Transaction ID</p>
                      <p className="font-semibold text-foreground/90 mt-0.5">{caseData.transaction_id}</p>
                    </div>
                  )}
                  {caseData.amount_lost && (
                    <div>
                      <p className="text-xs text-muted-foreground">Amount Lost</p>
                      <p className="font-semibold text-foreground/90 mt-0.5">₹{caseData.amount_lost}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No property or cyber-financial details recorded for this case.</p>
              )}
            </CardContent>
          </Card>

          {/* Sequential Metric and Indicator Cards */}
          <EvidenceSummaryCard caseId={caseId} crimeType={crimeType} />
          <FIRReadinessCard caseId={caseId} crimeType={crimeType} caseData={caseData} />
          <AICaseSummaryCard caseData={caseData} />
          <CaseCompletenessCard caseId={caseId} crimeType={crimeType} caseData={caseData} />
          <MissingInformationCard caseId={caseId} crimeType={crimeType} caseData={caseData} />
          <RiskLevelCard caseData={caseData} />

          {/* 5. Legal Analysis Details */}
          <Card className="bg-card/50 backdrop-blur border-white/10">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-4 text-accent flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 animate-pulse text-accent" />
                Recommended BNS Sections & Legal Analysis
              </h3>
              {caseData.legal_analysis?.recommended_sections?.length > 0 ? (
                <div className="space-y-4">
                  {caseData.legal_analysis.recommended_sections.map((section: any, idx: number) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-secondary/15 border border-white/5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-accent">BNS Section {section.section}</span>
                        <Badge variant="outline">{section.title || 'Legal Provision'}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                        {section.reason || 'No detailed analysis provided.'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No legal analysis recommended sections recorded.</p>
              )}
            </CardContent>
          </Card>

          {/* 6. Officer Final Confirmation Checklist */}
          <Card className="bg-card/50 backdrop-blur border-white/10">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-accent flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                Officer Final Confirmation
              </h3>
              <p className="text-xs text-muted-foreground">
                Please review all extracted case data, evidence lists, and legal mappings. Check all boxes to certify the dossier and unlock FIR generation.
              </p>
              <div className="space-y-3">
                {confirmationLabels.map((label, idx) => (
                  <label
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-secondary/5 hover:bg-secondary/10 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={confirmations[idx]}
                      onChange={(e) => {
                        const updated = [...confirmations]
                        updated[idx] = e.target.checked
                        setConfirmations(updated)
                      }}
                      className="mt-1 w-4 h-4 rounded border-white/20 bg-card text-accent focus:ring-accent focus:ring-offset-background cursor-pointer"
                    />
                    <span className="text-xs text-foreground/90 leading-normal select-none">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: AI Assistant Chat Panel */}
        <div className="lg:col-span-1 lg:sticky lg:top-6">
          <Card className="bg-card/50 backdrop-blur border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <MessageSquare className="w-5 h-5 text-accent" />
                <h2 className="text-xl font-semibold">AI Investigation Assistant</h2>
              </div>

              {/* Chat History scroll container */}
              <div className="max-h-[350px] overflow-y-auto pr-1 space-y-4 mb-4">
                {history.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="bg-accent/10 rounded-lg p-3">
                      <strong className="text-xs text-accent uppercase font-bold">AI:</strong>
                      <p className="mt-1 text-xs">{item.question}</p>
                    </div>
                    <div className="bg-success/10 rounded-lg p-3">
                      <strong className="text-xs text-success uppercase font-bold">Citizen:</strong>
                      <p className="mt-1 text-xs">{item.answer}</p>
                    </div>
                  </div>
                ))}

                {/* Current Question */}
                {loading ? (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground text-xs">Loading investigation...</p>
                  </div>
                ) : (
                  <div className="bg-accent/10 rounded-lg p-3">
                    <strong className="text-xs text-accent uppercase font-bold">AI:</strong>
                    <p className="mt-2 text-xs">{question}</p>
                  </div>
                )}
              </div>

              {/* Chat Input Controls */}
              {!loading && (
                <div className="flex gap-2">
                  <Input
                    disabled={complete}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Type your answer..."
                    className="flex-1 text-xs h-9"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitAnswer()
                    }}
                  />
                  <Button
                    disabled={complete}
                    onClick={submitAnswer}
                    size="sm"
                    className="h-9 w-9 p-0 flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-4 border-t border-white/5">
        <Link to={`/complaint/${caseId}/evidence`}>
          <Button variant="outline">Back</Button>
        </Link>
        <Button size="lg" onClick={handleContinue} disabled={!isConfirmed}>
          Generate FIR
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  )
}

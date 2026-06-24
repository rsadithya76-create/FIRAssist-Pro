import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  Mic,
  Square,
  FileText,
  ArrowRight,
  Volume2,
  Loader2,
  Sparkles,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks'
import { cn } from '@/lib/utils'
import { API_BASE_URL } from '@/config'

export default function NewComplaintPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [textComplaint, setTextComplaint] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(40).fill(20))

  // Simulate recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRecording])

  // Simulate waveform animation
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setWaveformBars(bars =>
          bars.map(() => Math.random() * 80 + 20)
        )
      }, 100)
      return () => clearInterval(interval)
    } else {
      setWaveformBars(Array(40).fill(20))
    }
  }, [isRecording])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' })
        setIsProcessing(true)
        toast('Transcribing voice recording...', 'info')

        try {
          const formData = new FormData()
          formData.append('file', audioBlob, 'complaint.wav')
          formData.append('translate', 'true')

          const response = await fetch(`${API_BASE_URL}/forthright/transcribe`, {
            method: 'POST',
            body: formData
          })

          const data = await response.json()
          if (data.status === 'success') {
            setTranscript(data.translation || data.transcript)
            toast('Audio transcribed successfully', 'success')
          } else {
            toast('Transcription failed', 'error')
          }
        } catch (err) {
          console.error(err)
          toast('Error communicating with backend transcriber', 'error')
        } finally {
          setIsProcessing(false)
        }
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
      setTranscript('')
      toast('Recording started', 'success')
      setRecordingTime(0)
    } catch (err) {
      console.error(err)
      toast('Microphone permission denied or unavailable', 'error')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      mediaRecorder.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
    }
  }

  const handleSubmit = async () => {
    try {
      setIsProcessing(true)
      const complaint = textComplaint || transcript

      const response = await fetch(
        `${API_BASE_URL}/generate-fir`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            complaint
          })
        }
      )

      const data = await response.json()

      console.log("FULL API RESPONSE", data)
      
      if (data.status === "error") {
        toast(data.message || "Failed to process complaint", "error")
        return
      }

      localStorage.setItem(
        "firDashboard",
        JSON.stringify(data)
      )
      
      // Also initialize caseData in localstorage for consistency
      const initialCaseData = {
        id: data.complaint_id,
        incident_summary: complaint,
        victim_name: data.dashboard?.case_overview?.complainant?.Name || "",
        victim_phone: data.dashboard?.case_overview?.complainant?.Phone || "",
        location: data.dashboard?.case_overview?.incident?.Location || "",
        incident_date: data.dashboard?.case_overview?.incident?.Date || "",
        incident_time: data.dashboard?.case_overview?.incident?.Time || "",
        accused_name: data.dashboard?.case_overview?.accused?.Name || "",
        crime_type: data.dashboard?.case_overview?.possible_offences?.[0] || "",
        possible_offences: data.dashboard?.case_overview?.possible_offences || []
      }
      localStorage.setItem("caseData", JSON.stringify(initialCaseData))

      toast(
        "Complaint processed successfully",
        "success"
      )

      navigate(
        `/complaint/${data.complaint_id}/extraction`
      )

    } catch (error) {
      console.error(error)
      toast(
        "Backend connection failed",
        "error"
      )
    } finally {
      setIsProcessing(false)
    }
  }


  const charCount = textComplaint.length

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">New Complaint</h1>
        <p className="text-muted-foreground mt-1">
          Record or enter complaint details to begin FIR generation
        </p>
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
              i === 0 ? 'bg-accent text-white' : 'bg-secondary text-muted-foreground'
            )}>
              {i + 1}
            </div>
            <span className={cn(
              'text-sm hidden sm:block',
              i === 0 ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {step}
            </span>
            {i < 4 && (
              <ArrowRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
            )}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Voice Recording Section */}
        <Card className="bg-card/50 backdrop-blur border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-accent" />
              Voice Complaint Intake
            </CardTitle>
            <CardDescription>
              Record the citizen's verbal complaint for AI transcription
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Waveform Visualization */}
            <div className="h-24 bg-secondary/30 rounded-xl flex items-center justify-center gap-0.5 overflow-hidden relative">
              <AnimatePresence>
                {isRecording && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center gap-0.5"
                  >
                    {waveformBars.map((height, i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-gradient-to-t from-accent to-success rounded-full"
                        animate={{ height: `${height}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              {!isRecording && (
                <div className="text-muted-foreground flex items-center gap-2">
                  <Volume2 className="w-5 h-5" />
                  <span className="text-sm">Click record to start</span>
                </div>
              )}
            </div>

            {/* Recording Timer */}
            <div className="flex items-center justify-center gap-4">
              <div className={cn(
                'text-4xl font-mono font-bold transition-colors',
                isRecording ? 'text-danger animate-pulse' : 'text-muted-foreground'
              )}>
                {formatTime(recordingTime)}
              </div>
              {isRecording && (
                <Badge variant="destructive" className="animate-pulse">
                  Recording
                </Badge>
              )}
            </div>

            {/* Recording Controls */}
            <div className="flex justify-center gap-4">
              {!isRecording ? (
                <Button
                  size="xl"
                  className="w-32 h-32 rounded-full bg-gradient-to-br from-accent to-success hover:shadow-lg hover:shadow-accent/30 transition-all"
                  onClick={startRecording}
                >
                  <Mic className="w-12 h-12" />
                </Button>
              ) : (
                <Button
                  size="xl"
                  variant="destructive"
                  className="w-32 h-32 rounded-full animate-pulse"
                  onClick={stopRecording}
                >
                  <Square className="w-10 h-10" />
                </Button>
              )}
            </div>

            {/* Transcription Preview */}
            {transcript && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-success/10 border border-success/30 rounded-xl"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium text-success">Transcription Complete</span>
                </div>
                <p className="text-sm text-foreground/90">{transcript}</p>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Text Complaint Section */}
        <Card className="bg-card/50 backdrop-blur border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" />
              Text Complaint Entry
            </CardTitle>
            <CardDescription>
              Type or paste the complaint details directly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                value={textComplaint || transcript}
                onChange={(e) => setTextComplaint(e.target.value)}
                placeholder="Enter complaint details... Describe the incident, location, time, suspect details, and any other relevant information."
                className="min-h-[280px] text-sm resize-y"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{charCount || transcript.length} characters</span>
                <span>Min 50 characters required</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Clear
              </Button>
              <Button variant="outline" size="sm">
                Import from Form
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Speech Transcript Panel */}
      {(transcript || textComplaint) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-accent/5 border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="w-5 h-5 text-accent" />
                Citizen Complaint Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-secondary/30 rounded-xl">
                <p className="text-foreground/90 leading-relaxed">
                  {transcript || textComplaint}
                </p>
              </div>

              {/* Detected Keywords */}
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">AI Detected Keywords:</p>
                <div className="flex flex-wrap gap-2">
                  {['Theft', 'Vehicle', 'Anna Nagar', 'Honda Activa', 'TN-07-AB-1234'].map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4">
        <Link to="/dashboard">
          <Button variant="outline">
            Cancel
          </Button>
        </Link>
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={(!transcript && !textComplaint) || isProcessing}
          className="min-w-[200px]"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Extract Information
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

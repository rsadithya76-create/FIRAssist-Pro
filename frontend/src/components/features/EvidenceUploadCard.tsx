import React, { useState, useRef } from 'react'
import { Upload, X, CheckCircle2, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks'
import { API_BASE_URL } from '@/config'

interface EvidenceUploadCardProps {
  caseId: string
  docName: string
  onUploadSuccess: (meta: any) => void
  onClose: () => void
}

export default function EvidenceUploadCard({
  caseId,
  docName,
  onUploadSuccess,
  onClose
}: EvidenceUploadCardProps) {
  const { toast } = useToast()
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'docx']

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const validateFile = (selectedFile: File): boolean => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || ''
    if (!allowedExtensions.includes(ext)) {
      toast(`Unsupported file type. Allowed: ${allowedExtensions.join(', ').toUpperCase()}`, 'error')
      return false
    }
    return true
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (validateFile(droppedFile)) {
        setFile(droppedFile)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (validateFile(selectedFile)) {
        setFile(selectedFile)
      }
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('case_id', caseId)
      formData.append('doc_name', docName)
      formData.append('file', file)

      const response = await fetch(`${API_BASE_URL}/evidence/upload`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      if (data.status === 'success') {
        toast('Evidence uploaded successfully', 'success')
        onUploadSuccess(data.metadata)
      } else {
        toast(data.message || 'Upload failed', 'error')
      }
    } catch (err) {
      console.error(err)
      toast('Failed to upload evidence to server', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="bg-card/90 backdrop-blur border border-white/10 shadow-2xl relative w-full max-w-md mx-auto">
      <div className="absolute top-3 right-3">
        <Button variant="ghost" size="sm" onClick={onClose} className="p-1 h-auto text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </Button>
      </div>
      <CardContent className="p-6 space-y-4">
        <div>
          <h3 className="font-bold text-lg text-accent">Upload Evidence</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Uploading: <strong className="text-foreground">{docName}</strong>
          </p>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
            dragActive
              ? 'border-accent bg-accent/10 scale-[1.02]'
              : 'border-white/10 hover:border-accent/40 bg-secondary/10'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png,.docx"
            className="hidden"
          />

          {!file ? (
            <>
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-2">
                <Upload className="w-6 h-6 text-accent" />
              </div>
              <p className="text-sm font-medium">Drag & Drop file here</p>
              <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
              <p className="text-[10px] text-muted-foreground mt-2">
                Supported formats: PDF, JPG, PNG, DOCX
              </p>
            </>
          ) : (
            <div className="text-center p-4">
              <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-2" />
              <p className="text-sm font-medium truncate max-w-[280px]">{file.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="bg-accent text-white"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Submit File'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

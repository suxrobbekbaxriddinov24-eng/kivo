import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Camera, X, RotateCcw } from 'lucide-react'

interface Props {
  open: boolean
  onCapture: (dataUrl: string) => void
  onClose: () => void
}

export default function CameraModal({ open, onCapture, onClose }: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [captured, setCaptured] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')

  useEffect(() => {
    if (!open) return
    setCaptured(null)
    setError(null)
    startCamera(facingMode)
    return () => stopCamera()
  }, [open, facingMode])

  async function startCamera(mode: 'user' | 'environment') {
    stopCamera()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 640 }, height: { ideal: 480 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch {
      setError("Kameraga ruxsat berilmagan yoki kamera topilmadi")
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  function takePhoto() {
    if (!videoRef.current || !canvasRef.current) return
    const v = videoRef.current
    const c = canvasRef.current
    const MAX = 400
    const ratio = Math.min(MAX / v.videoWidth, MAX / v.videoHeight, 1)
    c.width  = Math.round(v.videoWidth * ratio)
    c.height = Math.round(v.videoHeight * ratio)
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height)
    const dataUrl = c.toDataURL('image/jpeg', 0.7)
    setCaptured(dataUrl)
    stopCamera()
  }

  function retake() {
    setCaptured(null)
    startCamera(facingMode)
  }

  function confirm() {
    if (captured) {
      onCapture(captured)
      onClose()
    }
  }

  function handleClose() {
    stopCamera()
    setCaptured(null)
    onClose()
  }

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Camera size={18} className="text-[#00ff88]" /> Kamera orqali rasm olish
          </div>
          <button onClick={handleClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Camera view */}
        <div className="relative bg-black aspect-video flex items-center justify-center">
          {error ? (
            <p className="text-red-400 text-sm text-center px-6">{error}</p>
          ) : captured ? (
            <img src={captured} alt="captured" className="w-full h-full object-cover" />
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-5 py-4 gap-3">
          {!captured ? (
            <>
              <button
                onClick={() => setFacingMode((m) => m === 'user' ? 'environment' : 'user')}
                className="p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                title="Kamerani almashtirish"
              >
                <RotateCcw size={18} />
              </button>
              <button
                onClick={takePhoto}
                disabled={!!error}
                className="flex-1 py-3 rounded-xl bg-[#00ff88] hover:bg-[#00cc6d] text-gray-950 font-bold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Camera size={16} /> Rasm olish
              </button>
            </>
          ) : (
            <>
              <button
                onClick={retake}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium transition-colors"
              >
                <RotateCcw size={15} /> Qayta olish
              </button>
              <button
                onClick={confirm}
                className="flex-1 py-3 rounded-xl bg-[#00ff88] hover:bg-[#00cc6d] text-gray-950 font-bold text-sm transition-colors"
              >
                ✓ Tasdiqlash
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

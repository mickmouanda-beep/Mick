import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Trash2, RefreshCw, Check, AlertCircle, X, Image as ImageIcon } from 'lucide-react';

interface StudentPhotoCaptureProps {
  photoData: string | null;
  onPhotoChange: (base64Photo: string | null) => void;
  readOnly?: boolean;
}

export const StudentPhotoCapture: React.FC<StudentPhotoCaptureProps> = ({
  photoData,
  onPhotoChange,
  readOnly = false,
}) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Arrêter le flux caméra quand le composant se démonte
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraError(null);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Accès à la caméra refusé ou indisponible. Vous pouvez téléverser un fichier.');
    }
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    
    // Découper un carré centré façon photo d'identité
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;

    ctx.drawImage(video, startX, startY, size, size, 0, 0, 320, 320);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    onPhotoChange(dataUrl);
    stopCamera();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image valide (JPG, PNG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Redimensionner et compresser en carré d'identité
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = 320;
        canvas.height = 320;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const startX = (img.width - size) / 2;
        const startY = (img.height - size) / 2;

        ctx.drawImage(img, startX, startY, size, size, 0, 0, 320, 320);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        onPhotoChange(compressedDataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset file input
    e.target.value = '';
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center space-x-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
          <span>Photo d'Identité Scolaire de l'Élève</span>
        </label>
        {photoData && !readOnly && (
          <span className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <Check className="w-3 h-3" />
            <span>Photo chargée</span>
          </span>
        )}
      </div>

      {cameraError && (
        <div className="p-2.5 bg-rose-950/80 border border-rose-800 text-rose-200 rounded-lg text-[11px] flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Zone Caméra active */}
      {isCameraActive ? (
        <div className="space-y-2 bg-slate-900 p-3 rounded-xl border border-indigo-500/40 text-center">
          <div className="relative w-48 h-48 mx-auto rounded-xl overflow-hidden border-2 border-indigo-400 shadow-lg bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Guide ovale pour cadrer le visage */}
            <div className="absolute inset-0 border-2 border-dashed border-white/50 rounded-full m-4 pointer-events-none" />
          </div>
          <p className="text-[11px] text-slate-400">Centrez le visage de l'élève dans le cadre</p>

          <div className="flex items-center justify-center space-x-2 pt-1">
            <button
              type="button"
              onClick={takeSnapshot}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow"
            >
              <Camera className="w-4 h-4" />
              <span>Prendre la photo</span>
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Annuler</span>
            </button>
          </div>
        </div>
      ) : (
        /* Zone Photo & Boutons de scan */
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Cadre de la photo (style passeport) */}
          <div className="relative w-28 h-32 bg-slate-900 border-2 border-dashed border-slate-700 rounded-xl overflow-hidden flex flex-col items-center justify-center shrink-0 shadow-inner group">
            {photoData ? (
              <>
                <img
                  src={photoData}
                  alt="Photo de l'élève"
                  className="w-full h-full object-cover"
                />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => onPhotoChange(null)}
                    className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-md opacity-90 transition shadow"
                    title="Supprimer la photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            ) : (
              <div className="text-center p-2 text-slate-500">
                <Camera className="w-8 h-8 mx-auto mb-1 opacity-40" />
                <span className="text-[9px] uppercase font-bold tracking-wider leading-tight block">
                  Photo Passeport 35×45mm
                </span>
              </div>
            )}
          </div>

          {/* Contrôles Scanner & Téléversement */}
          {!readOnly && (
            <div className="space-y-2 flex-1 w-full text-xs">
              <p className="text-slate-400 text-[11px] leading-relaxed">
                La photo scannée ou capturée figurera automatiquement sur la <strong>fiche d'inscription officielle</strong>, le <strong>badge scolaire</strong> et les <strong>bulletins</strong>.
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {/* Bouton Caméra / Webcam */}
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Scanner via Caméra</span>
                </button>

                {/* Bouton Téléverser / Fichier */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition border border-slate-600"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Importer un fichier / scan</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {photoData && (
                <div className="flex items-center space-x-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => onPhotoChange(null)}
                    className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center space-x-1 underline"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Supprimer cette photo</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

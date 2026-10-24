import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Camera,
  Trash2,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Scan,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw
} from 'lucide-react';

interface SchoolLogoCaptureProps {
  logoUrl?: string | null;
  onChange: (logoBase64: string | null) => void;
  className?: string;
}

export const SchoolLogoCapture: React.FC<SchoolLogoCaptureProps> = ({
  logoUrl,
  onChange,
  className = '',
}) => {
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Pour le recadrage après photo ou import
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropRotation, setCropRotation] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputFallbackRef = useRef<HTMLInputElement | null>(null);

  // Nettoyage flux caméra
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraModalOpen(false);
    setCameraError(null);
  };

  // Traiter et optimiser une image vers un Data URL (max 400x400)
  const processImageToDataUrl = (
    img: HTMLImageElement,
    zoom = 1,
    rotation = 0
  ): string => {
    const canvas = document.createElement('canvas');
    const TARGET_SIZE = 400;
    canvas.width = TARGET_SIZE;
    canvas.height = TARGET_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Fond blanc ou transparent (selon type)
    ctx.clearRect(0, 0, TARGET_SIZE, TARGET_SIZE);

    ctx.save();
    ctx.translate(TARGET_SIZE / 2, TARGET_SIZE / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // Calcul de l'échelle pour adapter l'image
    const minDim = Math.min(img.width, img.height);
    const scale = (TARGET_SIZE / minDim) * zoom;
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;

    ctx.drawImage(
      img,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );
    ctx.restore();

    // Compression WebP haute compatibilité / fallback JPEG
    try {
      return canvas.toDataURL('image/webp', 0.88);
    } catch {
      return canvas.toDataURL('image/jpeg', 0.85);
    }
  };

  // 1. Gestion de l'import fichier (Galerie / Fichiers)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      alert('Format non pris en charge. Veuillez sélectionner une image au format PNG, JPG, JPEG ou WebP.');
      e.target.value = '';
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert("L'image sélectionnée est trop volumineuse (maximum 8 Mo).");
      e.target.value = '';
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const src = evt.target?.result as string;
      const img = new Image();
      img.onload = () => {
        // Préparer pour prévisualisation / recadrage
        setTempImageSrc(src);
        setCropZoom(1);
        setCropRotation(0);
        setCropModalOpen(true);
        setIsProcessing(false);
      };
      img.onerror = () => {
        alert("Impossible de lire l'image sélectionnée.");
        setIsProcessing(false);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 2. Démarrage caméra pour scanner / photographier
  const handleStartCamera = async () => {
    setCameraError(null);
    setIsCameraModalOpen(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('WebRTC non supporté');
      }

      // Tenter caméra arrière (environment) pour scanner un document physique
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch {
        // Fallback caméra frontale / standard si arrière non disponible
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }

      setCameraStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }
      }, 150);
    } catch (err) {
      console.warn("Échec d'accès caméra direct, utilisation du fallback mobile:", err);
      // Fallback natif appareil mobile
      setIsCameraModalOpen(false);
      if (cameraInputFallbackRef.current) {
        cameraInputFallbackRef.current.click();
      } else {
        alert("L'accès direct à la caméra n'a pas pu être initialisé. Veuillez sélectionner une photo depuis votre appareil.");
      }
    }
  };

  // Prise de vue depuis la caméra active
  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const snapSrc = canvas.toDataURL('image/jpeg', 0.95);

    stopCamera();

    // Ouvrir le recadreur pour ajuster le cadrage du logo scanné
    setTempImageSrc(snapSrc);
    setCropZoom(1);
    setCropRotation(0);
    setCropModalOpen(true);
  };

  // Validation finale du recadrage
  const handleApplyCrop = () => {
    if (!tempImageSrc) return;
    const img = new Image();
    img.onload = () => {
      const optimizedDataUrl = processImageToDataUrl(img, cropZoom, cropRotation);
      onChange(optimizedDataUrl);
      setCropModalOpen(false);
      setTempImageSrc(null);
    };
    img.src = tempImageSrc;
  };

  const handleRemoveLogo = () => {
    onChange(null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Inputs cachés pour fichiers et appareil photo natif */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputFallbackRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      <label className="block text-[11px] font-semibold text-slate-300">
        Logo de l'Établissement <span className="text-slate-400 font-normal">(Optionnel)</span>
      </label>

      {/* CAS 1 : LOGO ACTUELLEMENT SÉLECTIONNÉ */}
      {logoUrl ? (
        <div className="p-3 bg-slate-900/90 border border-indigo-500/40 rounded-xl flex items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-14 h-14 rounded-lg bg-slate-950 border border-slate-700 p-1 flex items-center justify-center shrink-0 overflow-hidden relative group">
              <img
                src={logoUrl}
                alt="Logo établissement"
                className="w-full h-full object-contain rounded"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Logo prêt pour l'école</span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                Sera affiché sur les reçus, bulletins et en-tête de l'école.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
              title="Remplacer par une autre image"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Remplacer</span>
            </button>
            <button
              type="button"
              onClick={handleRemoveLogo}
              className="p-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
              title="Supprimer le logo"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Supprimer</span>
            </button>
          </div>
        </div>
      ) : (
        /* CAS 2 : AUCUN LOGO ENCORE FOURNI (BOUTONS D'IMPORT ET SCAN) */
        <div className="p-3 bg-slate-900/80 border border-dashed border-slate-700 hover:border-slate-600 rounded-xl space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Option 1 : Importer une image */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 border border-slate-700 hover:border-indigo-500/50 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition shadow-sm"
            >
              <Upload className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Importer une image</span>
            </button>

            {/* Option 2 : Scanner ou photographier */}
            <button
              type="button"
              onClick={handleStartCamera}
              disabled={isProcessing}
              className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 border border-slate-700 hover:border-amber-500/50 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition shadow-sm"
            >
              <Camera className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Scanner / Photographier le logo</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span>Formats acceptés : PNG, JPG, JPEG, WebP</span>
            <span className="text-slate-400">Modifiable ultérieurement</span>
          </div>
        </div>
      )}

      {/* MODAL 1 : APPAREIL PHOTO / SCANNER EN DIRECT */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-xs">
            {/* Header modal */}
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center space-x-2">
                <Scan className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white text-sm">Scanner / Photographier le Logo</span>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Zone vidéo */}
            <div className="relative bg-black aspect-[4/3] flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Guide de cadrage pour scanner le logo physique */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div className="w-48 h-48 border-2 border-dashed border-amber-400/80 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                  <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-amber-400" />
                  <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-amber-400" />
                  <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-amber-400" />
                  <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-amber-400" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] text-amber-200/90 font-medium bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                      Centrez le logo ici
                    </span>
                  </div>
                </div>
              </div>

              {cameraError && (
                <div className="absolute inset-x-4 top-4 p-3 bg-rose-950/90 border border-rose-800 rounded-xl text-rose-200 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>

            {/* Actions modal caméra */}
            <div className="p-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={stopCamera}
                className="px-3 py-2 text-slate-400 hover:text-white font-medium"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleCaptureSnapshot}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 rounded-xl font-bold flex items-center space-x-2 shadow-lg shadow-amber-500/20"
              >
                <Camera className="w-4 h-4" />
                <span>Capturer le Logo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2 : APERÇU ET RECADRAGE DU LOGO */}
      {cropModalOpen && tempImageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-xs space-y-3">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center space-x-2">
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-white text-sm">Ajuster le Cadrage du Logo</span>
              </div>
              <button
                type="button"
                onClick={() => { setCropModalOpen(false); setTempImageSrc(null); }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-2 flex flex-col items-center space-y-3">
              {/* Cadre de prévisualisation carré */}
              <div className="w-48 h-48 rounded-xl bg-slate-950 border-2 border-indigo-500/60 overflow-hidden relative flex items-center justify-center shadow-lg">
                <img
                  src={tempImageSrc}
                  alt="Aperçu recadrage"
                  style={{
                    transform: `scale(${cropZoom}) rotate(${cropRotation}deg)`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.1s ease-out',
                  }}
                  className="max-w-none w-full h-full object-contain"
                />
              </div>

              {/* Contrôles de zoom et rotation */}
              <div className="w-full flex items-center justify-between gap-2 px-2 pt-1">
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setCropZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(1))))}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                    title="Zoom arrière"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] text-slate-400 font-mono w-10 text-center">
                    {Math.round(cropZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setCropZoom((z) => Math.min(2.5, Number((z + 0.1).toFixed(1))))}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                    title="Zoom avant"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setCropRotation((r) => (r + 90) % 360)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold flex items-center space-x-1"
                  title="Pivoter de 90°"
                >
                  <RotateCw className="w-3 h-3 text-indigo-400" />
                  <span>Pivoter</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => { setCropModalOpen(false); setTempImageSrc(null); }}
                className="px-3 py-1.5 text-slate-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleApplyCrop}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-600/30"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Valider le Logo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useCallback, useContext } from 'react';
import Cropper from 'react-easy-crop';
import { Area } from 'react-easy-crop';
import { ThemeContext } from '../types';

interface ImageCropperModalProps {
  imageUrl: string;
  onCropComplete: (croppedImageBase64: string) => void;
  onClose: () => void;
  aspectRatio?: number; // e.g., 1 for square, 16/9 for widescreen
}

const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  imageUrl,
  onCropComplete,
  onClose,
  aspectRatio = 1 / 1, // Default to square
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  const onCropChange = useCallback((newCrop: { x: number; y: number }) => {
    setCrop(newCrop);
  }, []);

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const onCropAreaChange = useCallback((_croppedArea: Area, newCroppedAreaPixels: Area) => {
    setCroppedAreaPixels(newCroppedAreaPixels);
  }, []);

  const getCroppedImage = useCallback(async () => {
    if (!croppedAreaPixels || !imageUrl) return;

    const image = new Image();
    image.src = imageUrl;
    await new Promise(resolve => {
      image.onload = resolve;
      image.onerror = () => console.error('Error loading image for cropping');
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context for canvas');
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;

    ctx.drawImage(
      image,
      croppedAreaPixels.x * scaleX,
      croppedAreaPixels.y * scaleY,
      croppedAreaPixels.width * scaleX,
      croppedAreaPixels.height * scaleY,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    );

    return new Promise<string>((resolve) => {
      const base64 = canvas.toDataURL('image/jpeg', 0.9);
        resolve(base64);
      });
  }, [imageUrl, croppedAreaPixels]);

  const handleCropAndUse = useCallback(async () => {
    try {
      const croppedImage = await getCroppedImage();
      if (croppedImage) {
        onCropComplete(croppedImage);
      }
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  }, [getCroppedImage, onCropComplete]);

  const modalBgClasses = isDark ? 'bg-[#2D1F49] border-white/10' : 'bg-white border-gray-200';
  const titleClasses = isDark ? 'text-gray-200' : 'text-gray-900';
  const buttonClasses = isDark ? 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white';
  const closeButtonClasses = isDark ? 'text-gray-400 hover:text-white bg-gray-800/50' : 'text-gray-500 hover:text-gray-800 bg-gray-100/50';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-[130] p-4">
      <div className={`relative border rounded-xl shadow-2xl w-full max-w-lg h-3/4 flex flex-col ${modalBgClasses}`}>
        <div className="flex justify-between items-center p-4 border-b border-gray-200/20">
          <h2 className={`text-xl font-bold ${titleClasses}`}>Cortar Imagem</h2>
          <button onClick={onClose} className={`rounded-full p-2 transition-colors ${closeButtonClasses}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="relative flex-grow bg-gray-800">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropAreaChange}
            showGrid={true}
            restrictPosition={false}
            classes={{
              containerClassName: 'bg-black',
              mediaClassName: 'object-contain',
              cropAreaClassName: 'border-fuchsia-500 border-2',
            }}
          />
        </div>

        <div className="p-4 flex flex-col gap-4 border-t border-gray-200/20">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Zoom:</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-lg dark:bg-gray-700"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
            >
              Cancelar
            </button>
            <button
              onClick={handleCropAndUse}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${buttonClasses}`}
            >
              Cortar e Usar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ImageCropperModal;

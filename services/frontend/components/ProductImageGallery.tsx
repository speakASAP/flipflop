'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface ProductImageGalleryProps {
  productName: string;
  images: string[];
  fallbackEmoji: string;
  gradientClass: string;
}

const MIN_SWIPE_DISTANCE = 48;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

export default function ProductImageGallery({
  productName,
  images,
  fallbackEmoji,
  gradientClass,
}: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const hasImages = images.length > 0;
  const selectedImage = images[selectedIndex];
  const canNavigate = images.length > 1;

  const selectImage = useCallback((index: number) => {
    setSelectedIndex(index);
    setZoom(1);
  }, []);

  const showPrevious = useCallback(() => {
    if (!canNavigate) return;
    setSelectedIndex((current) => (current === 0 ? images.length - 1 : current - 1));
    setZoom(1);
  }, [canNavigate, images.length]);

  const showNext = useCallback(() => {
    if (!canNavigate) return;
    setSelectedIndex((current) => (current === images.length - 1 ? 0 : current + 1));
    setZoom(1);
  }, [canNavigate, images.length]);

  const openLightbox = useCallback(() => {
    if (!hasImages) return;
    setIsLightboxOpen(true);
    setZoom(1);
  }, [hasImages]);

  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false);
    setZoom(1);
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((current) => Math.max(MIN_ZOOM, current - ZOOM_STEP));
  }, []);

  const zoomIn = useCallback(() => {
    setZoom((current) => Math.min(MAX_ZOOM, current + ZOOM_STEP));
  }, []);

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    const touch = event.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;
      touchStartX.current = null;
      touchStartY.current = null;

      if (Math.abs(deltaX) < MIN_SWIPE_DISTANCE || Math.abs(deltaY) > Math.abs(deltaX)) return;
      if (deltaX > 0) {
        showPrevious();
      } else {
        showNext();
      }
    },
    [showNext, showPrevious],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        showPrevious();
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        showNext();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        closeLightbox();
      }
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        zoomIn();
      }
      if (event.key === '-') {
        event.preventDefault();
        zoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeLightbox, isLightboxOpen, showNext, showPrevious, zoomIn, zoomOut]);

  useEffect(() => {
    if (!isLightboxOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isLightboxOpen]);

  const thumbnails = useMemo(() => images.slice(0, 8), [images]);

  return (
    <>
      <section className="space-y-3" aria-label="Fotografie produktu">
        <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
          <button
            type="button"
            onClick={openLightbox}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            disabled={!hasImages}
            className={`group relative flex aspect-square w-full items-center justify-center overflow-hidden bg-gradient-to-br ${gradientClass} focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 disabled:cursor-default`}
            aria-label={hasImages ? 'Otevřít fotografii na celou obrazovku' : 'Produkt bez fotografie'}
          >
            {selectedImage ? (
              <Image
                src={selectedImage}
                alt={`${productName} - fotografie ${selectedIndex + 1}`}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                priority
              />
            ) : (
              <div className="w-64 max-w-[55%] rounded-3xl bg-white/80 p-10 shadow-2xl backdrop-blur-sm">
                <span className="block text-center text-8xl drop-shadow-2xl">{fallbackEmoji}</span>
              </div>
            )}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/55 via-slate-950/10 to-transparent p-5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
              <span className="inline-flex items-center rounded-full bg-white/95 px-4 py-2 text-sm font-extrabold text-slate-900 shadow-lg">
                Kliknutím zvětšit
              </span>
            </div>

            {canNavigate && (
              <>
                <span
                  aria-hidden="true"
                  className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-3xl font-black text-blue-700 shadow-xl ring-1 ring-blue-100 transition-transform group-hover:scale-105"
                >
                  ‹
                </span>
                <span
                  aria-hidden="true"
                  className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-3xl font-black text-blue-700 shadow-xl ring-1 ring-blue-100 transition-transform group-hover:scale-105"
                >
                  ›
                </span>
              </>
            )}
          </button>
        </div>

        {canNavigate && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={showPrevious}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-2xl font-black text-blue-700 shadow-md ring-1 ring-blue-100 transition hover:bg-blue-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
              aria-label="Předchozí fotografie"
            >
              ‹
            </button>
            <div className="grid flex-1 grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-4 xl:grid-cols-6">
              {thumbnails.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => selectImage(index)}
                  className={`relative aspect-square overflow-hidden rounded-xl border-2 bg-white shadow-sm transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 ${
                    selectedIndex === index
                      ? 'border-blue-600 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  aria-label={`Zobrazit fotografii ${index + 1}`}
                  aria-current={selectedIndex === index ? 'true' : undefined}
                >
                  <Image
                    src={image}
                    alt={`${productName} - náhled ${index + 1}`}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={showNext}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-2xl font-black text-blue-700 shadow-md ring-1 ring-blue-100 transition hover:bg-blue-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
              aria-label="Další fotografie"
            >
              ›
            </button>
          </div>
        )}
      </section>

      {isLightboxOpen && selectedImage && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 text-white"
          role="dialog"
          aria-modal="true"
          aria-label="Zvětšená fotografie produktu"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-slate-950/90 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{productName}</p>
              <p className="text-xs font-semibold text-slate-300">
                {selectedIndex + 1} / {images.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={zoomOut}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl font-black text-white ring-1 ring-white/15 transition hover:bg-white/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
                aria-label="Zmenšit fotografii"
              >
                -
              </button>
              <span className="w-14 text-center text-sm font-bold text-slate-200">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={zoomIn}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl font-black text-white ring-1 ring-white/15 transition hover:bg-white/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
                aria-label="Zvětšit fotografii"
              >
                +
              </button>
              <button
                type="button"
                onClick={closeLightbox}
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl font-black text-slate-950 shadow-lg transition hover:bg-blue-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
                aria-label="Zavřít náhled"
              >
                ×
              </button>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto px-4 py-6">
            {canNavigate && (
              <button
                type="button"
                onClick={showPrevious}
                className="absolute left-4 top-1/2 z-10 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-white text-4xl font-black text-blue-700 shadow-2xl transition hover:bg-blue-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 md:left-8 md:h-16 md:w-16"
                aria-label="Předchozí fotografie"
              >
                ‹
              </button>
            )}

            <div className="relative h-full max-h-[82vh] w-full max-w-[92vw]">
              <Image
                src={selectedImage}
                alt={`${productName} - zvětšená fotografie ${selectedIndex + 1}`}
                fill
                sizes="100vw"
                className="object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
                priority
              />
            </div>

            {canNavigate && (
              <button
                type="button"
                onClick={showNext}
                className="absolute right-4 top-1/2 z-10 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-white text-4xl font-black text-blue-700 shadow-2xl transition hover:bg-blue-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 md:right-8 md:h-16 md:w-16"
                aria-label="Další fotografie"
              >
                ›
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

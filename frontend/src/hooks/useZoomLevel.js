import { useState, useEffect } from 'react'

export function useZoomLevel() {
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    function medir() {
      const z = Math.round((window.outerWidth / window.innerWidth) * 100) / 100
      setZoom(z > 0 ? z : 1)
    }
    medir()
    
    // FIX PERF: Removido o setInterval que forçava re-renderização a cada 400ms.
    // O zoom agora só é recalculado se a janela for redimensionada.
    window.addEventListener('resize', medir)
    
    return () => {
      window.removeEventListener('resize', medir)
    }
  }, [])

  return zoom
}
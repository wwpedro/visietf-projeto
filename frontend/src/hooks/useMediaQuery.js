// src/hooks/useMediaQuery.js
import { useEffect, useState } from 'react'

export function useMediaQuery(consulta) {
  const [corresponde, setCorresponde] = useState(() => window.matchMedia(consulta).matches)

  useEffect(() => {
    const listaDeCorrespondencia = window.matchMedia(consulta)
    const aoMudar = evento => setCorresponde(evento.matches)
    listaDeCorrespondencia.addEventListener('change', aoMudar)
    setCorresponde(listaDeCorrespondencia.matches)
    return () => listaDeCorrespondencia.removeEventListener('change', aoMudar)
  }, [consulta])

  return corresponde
}
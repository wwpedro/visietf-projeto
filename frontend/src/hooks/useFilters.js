// src/hooks/useFilters.js
import { useState, useEffect } from 'react'
import { api } from '../api'

export function useFilters() {
  const [yearMin, setYearMin] = useState(1969)
  const [yearMax, setYearMax] = useState(2025)

  const [categoria, setCategoria] = useState([])
  const [pais,      setPais]      = useState([])
  const [grupo,     setGrupo]     = useState([])
  const [meeting,   setMeeting]   = useState([])
  const [autor,     setAutor]     = useState([])
  const [rfcNumero, setRfcNumero] = useState([])
  const [draft,     setDraft]     = useState([])

  const [categoriaTodos, setCategoriaTodos] = useState(false)
  const [paisTodos,      setPaisTodos]      = useState(false)
  const [grupoTodos,     setGrupoTodos]     = useState(false)
  const [meetingTodos,   setMeetingTodos]   = useState(false)
  const [autorTodos,     setAutorTodos]     = useState(false)
  const [rfcTodos,       setRfcTodos]       = useState(false)
  const [draftTodos,     setDraftTodos]     = useState(false)

  const [categoriaOptions, setCategoriaOptions] = useState([])
  const [grupoOptions,     setGrupoOptions]     = useState([])
  const [paisOptions,      setPaisOptions]      = useState([])
  const [meetingOptions,   setMeetingOptions]   = useState([])
  const [autorOptions,     setAutorOptions]     = useState([])
  const [rfcOptions,       setRfcOptions]       = useState([])
  const [draftOptions,     setDraftOptions]     = useState([])
  const [loadingOptions,   setLoadingOptions]   = useState(true)

  useEffect(() => {
    let cancelado = false

    Promise.allSettled([
      api.categorias({}),
      api.grupos(), // Este endpoint lê da tabela draft
      api.porPais({}),
      api.edicoes(),
      api.autoresLista({ limit: 300 }),
      api.numerosLista({ limit: 300 }),
      api.draftsLista({ limit: 300 }),
    ])
      .then(resultados => {
        if (cancelado) return
        const [rCats, rGrps, rPaises, rEdicoes, rAutores, rNumeros, rDrafts] =
          resultados.map(r => (r.status === 'fulfilled' ? r.value : null))

        const nomesDasListas = ['categorias', 'grupos', 'países', 'edições', 'autores', 'números de RFC', 'drafts']
        resultados.forEach((resultado, indice) => {
          if (resultado.status === 'rejected') {
            console.warn(`[useFilters] Falha ao carregar a lista de ${nomesDasListas[indice]}:`, resultado.reason)
          }
        })

        const cleanArray = (arr, key) => {
          if (!Array.isArray(arr)) return []
          return [...new Set(arr.map(item => item && item[key]).filter(Boolean))]
        }

        setCategoriaOptions(cleanArray(rCats, 'category'))
        setGrupoOptions(cleanArray(rGrps, 'grupo')) // Usa a lista de grupos de draft
        setPaisOptions(cleanArray(rPaises, 'country'))
        setMeetingOptions(cleanArray(
          (rEdicoes || []).map(e => ({ value: `IETF ${e.edition}` })),
          'value'
        ))
        setAutorOptions(cleanArray(rAutores, 'autor'))
        setRfcOptions(cleanArray((rNumeros || []).map(n => ({ v: `RFC ${n.numero}` })), 'v'))
        setDraftOptions(cleanArray(rDrafts, 'draft'))
      })
      .finally(() => { if (!cancelado) setLoadingOptions(false) })

    return () => { cancelado = true }
  }, [])

  function toggle(list, setList, setTodosFlag, value) {
    if (value === '__todos__') {
      setList([])
      setTodosFlag(f => !f)
      return
    }
    setTodosFlag(false)
    setList(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
  }

  function resetFilters() {
    setYearMin(1969); setYearMax(2025)
    setCategoria([]); setCategoriaTodos(false)
    setPais([]);      setPaisTodos(false)
    setGrupo([]);     setGrupoTodos(false)
    setMeeting([]);   setMeetingTodos(false)
    setAutor([]);     setAutorTodos(false)
    setRfcNumero([]); setRfcTodos(false)
    setDraft([]);     setDraftTodos(false)
  }

  function limparFiltro(nomeDoFiltro) {
    switch (nomeDoFiltro) {
      case 'categoria': setCategoria([]); setCategoriaTodos(false); break
      case 'pais':      setPais([]);      setPaisTodos(false);      break
      case 'grupo':     setGrupo([]);     setGrupoTodos(false);     break
      case 'meeting':   setMeeting([]);   setMeetingTodos(false);   break
      case 'autor':     setAutor([]);     setAutorTodos(false);     break
      case 'rfcNumero': setRfcNumero([]); setRfcTodos(false);       break
      case 'draft':     setDraft([]);     setDraftTodos(false);     break
    }
  }

  return {
    yearMin, setYearMin, yearMax, setYearMax,

    categoria, categoriaTodos, toggleCategoria: v => toggle(categoria, setCategoria, setCategoriaTodos, v),
    pais,      paisTodos,      togglePais:      v => toggle(pais,      setPais,      setPaisTodos,      v),
    grupo,     grupoTodos,     toggleGrupo:     v => toggle(grupo,     setGrupo,     setGrupoTodos,     v),
    meeting,   meetingTodos,   toggleMeeting:   v => toggle(meeting,   setMeeting,   setMeetingTodos,   v),
    autor,     autorTodos,     toggleAutor:     v => toggle(autor,     setAutor,     setAutorTodos,     v),
    rfcNumero, rfcTodos,       toggleRfc:       v => toggle(rfcNumero, setRfcNumero, setRfcTodos,       v),
    draft,     draftTodos,     toggleDraft:     v => toggle(draft,     setDraft,     setDraftTodos,     v),

    categoriaOptions, grupoOptions, paisOptions, meetingOptions, autorOptions, rfcOptions, draftOptions,
    loadingOptions,
    resetFilters,
    limparFiltro,

    ativarTodosPara: (dimensoes) => {
      if (!dimensoes) return
      if (dimensoes.includes('categoria') && categoria.length === 0) setCategoriaTodos(true)
      if (dimensoes.includes('pais')      && pais.length === 0)      setPaisTodos(true)
      if (dimensoes.includes('grupo')     && grupo.length === 0)     setGrupoTodos(true)
      if (dimensoes.includes('meeting')   && meeting.length === 0)   setMeetingTodos(true)
      if (dimensoes.includes('autor')     && autor.length === 0)     setAutorTodos(true)
      if (dimensoes.includes('rfcNumero') && rfcNumero.length === 0) setRfcTodos(true)
      if (dimensoes.includes('draft')     && draft.length === 0)     setDraftTodos(true)
    },
  }
}
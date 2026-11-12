import { useState, useEffect, useMemo } from 'react'
import { Sidebar } from './components/Sidebar/Sidebar'
import { Topbar } from './components/Topbar/Topbar'
import { Canvas } from './components/Canvas/Canvas'
import { useFilters } from './hooks/useFilters'
import { useMediaQuery } from './hooks/useMediaQuery'
import { useZoomLevel } from './hooks/useZoomLevel' // Adicionado de volta
import { api } from './api'
import './App.css'

const CHAVE_DO_LOCAL_STORAGE = 'visietf.cards.v1'

const DIMENSAO_PARA_FILTRO = {
  categoria: 'categoria',
  grupo:     'grupo',
  pais:      'pais',
  autor:     'autor',
  edicao:    'meeting',
}

const FILTRO_PARA_DIMENSOES = {
  categoria: ['categoria'],
  grupo:     ['grupo'],
  pais:      ['pais'],
  autor:     ['autor'],
  meeting:   ['edicao'],
  rfcNumero: [],
  draft:     [],
}

const DIMENSAO_PRINCIPAL_LEGADA = {
  'rfcs-por-categoria':  'categoria',
  'rfcs-heatmap':        'categoria',
  'top-autores':         'autor',
  'drafts-por-pais':     'pais',
  'drafts-por-wg':       'grupo',
  'attendees-por-pais':  'pais',
  'attendees-por-edicao':'meeting',
}

function migrarCartao(cartao) {
  if (!cartao.configuracao) return cartao
  const config = cartao.configuracao
  let mudou = false

  if (config.tempo && config.tempo.modo === 'ignorar') {
    config.tempo.modo = 'filtrar'
    mudou = true
  }

  if (config.tempo && config.tempo.modo === 'filtrar') {
    if (config.tempo.anoMinimo === 1969 && config.tempo.anoMaximo === 2025) {
      config.tempo.anoMinimo = null
      config.tempo.anoMaximo = null
      mudou = true
    }
  }

  return mudou ? { ...cartao, configuracao: config } : cartao
}

function carregarCartoesSalvos() {
  try {
    const bruto = localStorage.getItem(CHAVE_DO_LOCAL_STORAGE)
    if (!bruto) return []
    const lista = JSON.parse(bruto)
    if (!Array.isArray(lista)) return []
    return lista.map(migrarCartao)
  } catch (erro) {
    console.warn('Não foi possível carregar cartões salvos:', erro)
    return []
  }
}

export default function App() {
  const filters = useFilters()
  const [cards, setCards] = useState(carregarCartoesSalvos)
  const [selectedCardId, setSelectedCardId] = useState(null)
  const [capacidades, setCapacidades] = useState(null)
  
  const ehTelaPequena = useMediaQuery('(max-width: 1024px)')
  const zoom = useZoomLevel() // Hook do zoom
  const [menuAberto, setMenuAberto] = useState(false)

  useEffect(() => {
    if (!ehTelaPequena) setMenuAberto(false)
  }, [ehTelaPequena])

  useEffect(() => {
    if (cards.length === 0) {
      filters.resetFilters()
    }
  }, [cards.length])

  useEffect(() => {
    let cancelado = false
    api.capacidades()
      .then(lista => { if (!cancelado) setCapacidades(lista) })
      .catch(err => console.error('Falha ao carregar capacidades:', err))
    return () => { cancelado = true }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_DO_LOCAL_STORAGE, JSON.stringify(cards))
    } catch (erro) {
      console.warn('Não foi possível salvar cartões:', erro)
    }
  }, [cards])

  const dimensoesEmUso = useMemo(() => {
    const emUso = new Set()
    cards.forEach(card => {
      if (card.configuracao?.agruparPor) {
        card.configuracao.agruparPor.forEach(dim => {
          const filtro = DIMENSAO_PARA_FILTRO[dim]
          if (filtro) emUso.add(filtro)
        })
      }
      if (card.tipo?.metricId) {
        const filtro = DIMENSAO_PRINCIPAL_LEGADA[card.tipo.metricId]
        if (filtro) emUso.add(filtro)
      }
    })
    return emUso
  }, [cards])

  const handleRemoveFilter = (dimensaoFiltro) => {
    filters.limparFiltro(dimensaoFiltro)
    const dimensoesDoFiltro = FILTRO_PARA_DIMENSOES[dimensaoFiltro] || []
    if (dimensoesDoFiltro.length === 0) return

    setCards(prev => prev.filter(card => {
      if (card.configuracao?.agruparPor?.some(d => dimensoesDoFiltro.includes(d))) {
        return false
      }
      if (card.tipo?.metricId && DIMENSAO_PRINCIPAL_LEGADA[card.tipo.metricId] === dimensaoFiltro) {
        return false
      }
      return true
    }))
  }

  const handleSelectViz = (vizData) => {
    const vizArray = Array.isArray(vizData) ? vizData : [vizData]
    const newCards = vizArray.map((item, index) => ({
      id: Date.now() + index,
      tipo: item.configuracao ? null : item,
      configuracao: item.configuracao ?? null,
      pos: {
        x: (window.innerWidth / 2) - 250 + (index * 40),
        y: (window.innerHeight / 2) - 180 + (index * 40)
      }
    }))
    setCards(prev => [...prev, ...newCards])
    if (ehTelaPequena) setMenuAberto(false)
  }

  const handleUpdateCard = (cardId, alteracoes) => {
    setCards(cartoesAnteriores => cartoesAnteriores.map(cartao => {
      if (cartao.id !== cardId) return cartao
      const configuracaoAtualizada = alteracoes.configuracao
        ? {
            ...cartao.configuracao,
            ...alteracoes.configuracao,
            tempo: { ...cartao.configuracao?.tempo, ...alteracoes.configuracao.tempo }
          }
        : cartao.configuracao
      return { ...cartao, ...alteracoes, configuracao: configuracaoAtualizada }
    }))
  }

  return (
    <>
      {menuAberto && ehTelaPequena && (
        <div className="sidebar-overlay" onClick={() => setMenuAberto(false)} />
      )}

      {/* Adicionado o scale(zoom) apenas para Desktop e o tri-back de volta */}
      <div 
        className={menuAberto ? 'sidebar-wrapper aberto' : 'sidebar-wrapper'}
        style={ehTelaPequena ? {} : { transform: `translateY(-50%) scale(${1 / zoom})` }}
      >
        <div className="tri-back" />
        <Sidebar 
          filters={filters} 
          onSelectViz={handleSelectViz} 
          capacidades={capacidades} 
          ehTelaPequena={ehTelaPequena}
          aoFecharMenu={() => setMenuAberto(false)}
        />
      </div>

      <Topbar
        filters={filters}
        onSelectViz={handleSelectViz}
        dimensoesEmUso={dimensoesEmUso}
        onRemoveFilter={handleRemoveFilter}
        ehTelaPequena={ehTelaPequena}
        menuAberto={menuAberto}
        aoAlternarMenu={() => setMenuAberto(!menuAberto)}
      />
      
      <Canvas
        filters={filters}
        cards={cards}
        setCards={setCards}
        selectedCardId={selectedCardId}
        onSelectCard={setSelectedCardId}
        onUpdateCard={handleUpdateCard}
        onAddCards={handleSelectViz}
        capacidades={capacidades}
        ehTelaPequena={ehTelaPequena}
      />
    </>
  )
}
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '../../LanguageContext'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'
import { METRICS } from '../../metrics'
import html2canvas from 'html2canvas'
import { BarChart2, Download, Loader2, X, Construction, Sparkles, AlertTriangle } from 'lucide-react'
import ForceGraph2D from 'react-force-graph-2d'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { ModalCombinacao } from '../Sidebar/ModalCombinacao'
import { BarraDeConfiguracao } from './BarraDeConfiguracao'
import { executarConsulta, converterRespostaParaDados } from '../../consulta'

const COLORS = ['#FBC663', '#C49830', '#E8A020', '#F0D080', '#B8860B', '#3498DB', '#9B59B6', '#1ABC9C']

const ISO2_TO_NAME = {
  "US": "United States of America", "BR": "Brazil", "GB": "United Kingdom",
  "DE": "Germany", "FR": "France", "JP": "Japan", "CN": "China",
  "IN": "India", "CA": "Canada", "AU": "Australia", "NL": "Netherlands",
  "SE": "Sweden", "FI": "Finland", "NO": "Norway", "DK": "Denmark",
  "IT": "Italy", "ES": "Spain", "CH": "Switzerland", "KR": "South Korea",
  "RU": "Russia", "IE": "Ireland", "BE": "Belgium", "AT": "Austria",
  "PL": "Poland", "CZ": "Czechia", "IL": "Israel", "ZA": "South Africa",
  "MX": "Mexico", "AR": "Argentina", "PT": "Portugal", "GR": "Greece"
}

const ROTULOS_DE_FONTE_FALLBACK = { rfc: 'RFCs', draft: 'Drafts', meeting: 'Meetings' }
const ROTULOS_DE_DIMENSAO_FALLBACK = {
  ano: 'Ano', categoria: 'Categoria', grupo: 'Grupo (WG)', autor: 'Autor',
  pais: 'País', keyword: 'Palavra-chave', status: 'Status pretendido',
  edicao: 'Edição', tipo_credenciamento: 'Tipo de credenciamento',
  organizacao: 'Organização',
}

function gerarTitulo(configuracao, capacidades) {
  if (!configuracao) return 'Visualização'
  const fonte = capacidades?.[configuracao.fonte]
  const prefixo = fonte?.rotulo ?? ROTULOS_DE_FONTE_FALLBACK[configuracao.fonte] ?? 'Visualização'

  const rotulos = configuracao.agruparPor
    .filter(id => id !== 'ano')
    .map(id => fonte?.dimensoes?.find(d => d.id === id)?.rotulo ?? ROTULOS_DE_DIMENSAO_FALLBACK[id] ?? id)

  if (configuracao.tempo?.modo === 'agrupar') {
    rotulos.unshift(fonte?.dimensoes?.find(d => d.id === 'ano')?.rotulo ?? 'Ano')
  }

  if (rotulos.length === 0) return prefixo
  return `${prefixo} por ${rotulos.join(' × ')}`
}

function normalizeData(raw, chartStyle) {
  if (!Array.isArray(raw) && chartStyle !== 'Rede') return []
  if (chartStyle === 'Rede') return raw

  if (chartStyle === 'Heatmap') {
    return raw.map(item => ({
      ...item,
      year:     String(item.year ?? ''),
      category: String(item.category ?? ''),
      total:    Number(item.total ?? 0),
    }))
  }

  return raw.map(item => {
    const label = item.x ?? item.nome ?? item.categoria ?? item.status ??
                  item.pais ?? item.keyword ?? item.ano ?? item.year ?? item.org_nome ?? item.name ?? "Outros"
    const val = item.y ?? item.total ?? item.count ?? item.value ?? 0

    return {
      ...item,
      x: String(label),
      y: Number(val),
      name: String(label),
      value: Number(val),
      year: String(label),
      total: Number(val)
    }
  })
}

// ─── Novo Componente Responsivo para o Mapa ───
function ResponsiveMap({ data }) {
  const [size, setSize] = useState({ width: 0, height: 0 })
  const containerRef = useRef(null)

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect
        setSize({ width, height })
      }
    })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const ESCALA_DE_COR = ['#FDE68A', '#FACC15', '#EAB308', '#CA8A04', '#A16207']
  const valoresPositivos = data.map(d => d.y).filter(v => v > 0)
  const valMax = Math.max(...valoresPositivos, 1)
  const valMin = valoresPositivos.length ? Math.min(...valoresPositivos) : 0

  function corDoValor(val) {
    if (val <= 0) return '#EAEAEA'
    if (valMax === valMin) return ESCALA_DE_COR[2]
    const passo = (valMax - valMin) / 5
    const indice = Math.min(4, Math.floor((val - valMin) / passo))
    return ESCALA_DE_COR[Math.max(0, indice)]
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div ref={containerRef} style={{ flex: 1, width: '100%', position: 'relative', overflow: 'hidden' }}>
        {size.width > 0 && (
          <ComposableMap
            projectionConfig={{ scale: Math.min(size.width, size.height) / 3.5 }}
            width={size.width}
            height={size.height}
            style={{ width: '100%', height: '100%' }}
          >
            <Geographies geography="https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json">
              {({ geographies }) =>
                geographies.map(geo => {
                  const countryName = geo.properties.name
                  const match = data.find(d => {
                    const mappedName = ISO2_TO_NAME[d.x] || d.x
                    return mappedName.toLowerCase() === countryName.toLowerCase() || d.x === countryName
                  })
                  const val = match ? match.y : 0
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={corDoValor(val)}
                      stroke="#FFFFFF"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none' },
                        hover: { fill: '#854D0E', outline: 'none', cursor: 'pointer' },
                        pressed: { outline: 'none' },
                      }}
                    >
                      <title>{countryName}: {val}</title>
                    </Geography>
                  )
                })
              }
            </Geographies>
          </ComposableMap>
        )}
      </div>
      
      {/* Legenda */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 4, padding: '4px 8px', fontSize: 10, color: '#555', flexShrink: 0,
      }}>
        <span style={{ marginRight: 4, color: '#999' }}>Sem dados</span>
        <span style={{ width: 16, height: 10, background: '#EAEAEA', border: '1px solid #D9D9D9' }} />
        <span style={{ margin: '0 4px', color: '#999' }}>{valMin}</span>
        {ESCALA_DE_COR.map(c => (
          <span key={c} style={{ width: 16, height: 10, background: c, border: '1px solid rgba(0,0,0,.05)' }} />
        ))}
        <span style={{ marginLeft: 4, color: '#999' }}>{valMax}</span>
      </div>
    </div>
  )
}

const CustomYAxisTick = ({ x, y, payload }) => {
  const text = payload.value || ''
  const words = text.split(' ')
  const lines = []
  let currentLine = ''

  words.forEach(word => {
    if ((currentLine + word).length > 25) {
      if (currentLine) lines.push(currentLine.trim())
      currentLine = word + ' '
    } else {
      currentLine += word + ' '
    }
  })
  if (currentLine) lines.push(currentLine.trim())

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={4} textAnchor="end" fill="#555555" fontSize={10}>
        {lines.map((line, i) => (
          <tspan x={0} dy={i === 0 ? 0 : 12} key={i}>{line}</tspan>
        ))}
      </text>
    </g>
  )
}

function VizCard({ card, index, filters, isSelected, onSelect, onDelete, onUpdate, onAddCards, capacidades, cardsAbertos, ehTelaPequena }) {
  const metricId = card.tipo?.metricId
  const chartStyle = card.configuracao?.tipoGrafico ?? card.tipo?.tipo
  const metric = METRICS.find(m => m.id === metricId)
  const { t } = useLanguage()

  const [pos, setPos] = useState(card.pos || { x: 380 + index * 28, y: 140 + index * 28 })
  const [size, setSize] = useState({ w: 500, h: 360 })
  const cardRef = useRef(null)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [baixando, setBaixando] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)

  const [avisos, setAvisos] = useState([])
  const [chavesDeSerie, setChavesDeSerie] = useState([])
  const [colunasDaTabela, setColunasDaTabela] = useState([])

  const tituloDoCartao = card.configuracao
    ? gerarTitulo(card.configuracao, capacidades)
    : (metric?.label ?? 'Visualização')

  useEffect(() => {
    if (!metric && !card.configuracao) {
      setLoading(false)
      return
    }

    let cancelado = false
    setLoading(true)
    setErro(null)

    const timerId = setTimeout(async () => {
      try {
        if (card.configuracao) {
          const resposta = await executarConsulta(card.configuracao, filters)
          if (cancelado) return
          const conversao = converterRespostaParaDados(resposta, card.configuracao.tipoGrafico)
          setAvisos(resposta.avisos ?? [])
          setChavesDeSerie(conversao.chavesDeSerie ?? [])
          setColunasDaTabela(conversao.colunas ?? [])
          const precisaDadosCrus = (conversao.chavesDeSerie && conversao.chavesDeSerie.length) ||
            card.configuracao.tipoGrafico === 'Tabela' ||
            card.configuracao.tipoGrafico === 'Heatmap'
          setData(precisaDadosCrus ? conversao.dados : normalizeData(conversao.dados, card.configuracao.tipoGrafico))
        } else if (metric) {
          const raw = await metric.fetch(filters)
          if (cancelado) return
          const mapped = metric.mapData ? metric.mapData(raw) : raw
          setData(normalizeData(mapped, chartStyle))
          setAvisos([])
          setChavesDeSerie([])
          setColunasDaTabela([])
        }
      } catch (e) {
        if (!cancelado) setErro(e.message)
      } finally {
        if (!cancelado) setLoading(false)
      }
    }, 250)

    return () => {
      cancelado = true
      clearTimeout(timerId)
    }
  }, [metricId, chartStyle, JSON.stringify(card.configuracao), filters?.yearMin, filters?.yearMax, filters?.categoria, filters?.pais, filters?.grupo, filters?.meeting, filters?.autor, filters?.rfcNumero])

  const baixarImagem = async () => {
    if (!cardRef.current) return
    setBaixando(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 150))
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          const clonedCard = clonedDoc.querySelector('.viz-card')
          if (clonedCard) {
            clonedCard.style.height = 'auto'
            clonedCard.style.minHeight = '300px'
            clonedCard.style.overflow = 'visible'

            const body = clonedCard.querySelector('.viz-card-body')
            if (body) { body.style.height = 'auto'; body.style.overflow = 'visible'; body.style.maxHeight = 'none' }
            const innerScrolls = clonedCard.querySelectorAll('[style*="overflow"]')
            innerScrolls.forEach(el => { el.style.overflow = 'visible'; el.style.height = 'auto'; el.style.maxHeight = 'none' })
            const header = clonedCard.querySelector('.viz-card-header')
            if (header) header.style.justifyContent = 'center'

            const closeBtn = clonedCard.querySelector('.viz-card-close')
            const downloadBtn = clonedCard.querySelector('.viz-card-download')
            const csvBtn = clonedCard.querySelector('.viz-card-csv')
            const resizeHandle = clonedCard.querySelector('.viz-card-resize')
            const combineBtn = clonedCard.querySelector('.viz-card-combine')
            const configBar = clonedCard.querySelector('.viz-card-config')

            if (closeBtn) closeBtn.style.display = 'none'
            if (downloadBtn) downloadBtn.style.display = 'none'
            if (csvBtn) csvBtn.style.display = 'none'
            if (resizeHandle) resizeHandle.style.display = 'none'
            if (combineBtn) combineBtn.style.display = 'none'
            if (configBar) configBar.style.display = 'none'
          }
        }
      })
      const link = document.createElement('a')
      link.download = `${tituloDoCartao || 'visualizacao'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      alert('Não foi possível gerar a imagem.')
    } finally {
      setBaixando(false)
    }
  }

  const baixarCSV = () => {
    if (!data || (Array.isArray(data) && data.length === 0)) return

    if (chartStyle === 'Rede') {
      alert('Export CSV não está disponível para Rede.')
      return
    }

    const colunas = Object.keys(data[0])

    const escapar = (v) => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }

    const linhasCSV = [
      colunas.join(','),
      ...data.map(item => colunas.map(c => escapar(item[c])).join(',')),
    ]

    const blob = new Blob(['\uFEFF' + linhasCSV.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.download = `${tituloDoCartao || 'dados'}.csv`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
  }

  function startDrag(e) {
    if (ehTelaPequena) return
    if (e.target.closest('.viz-card-close')
     || e.target.closest('.viz-card-resize')
     || e.target.closest('.viz-card-download')
     || e.target.closest('.viz-card-csv')
     || e.target.closest('.viz-card-combine')
     || e.target.closest('.viz-card-config')) return
    e.preventDefault()
    const ox = e.clientX - pos.x, oy = e.clientY - pos.y
    const move = ev => setPos({ x: ev.clientX - ox, y: ev.clientY - oy })
    const up = () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  function startResize(e) {
    if (ehTelaPequena) return
    e.preventDefault()
    e.stopPropagation()
    const sw = size.w, sh = size.h, sx = e.clientX, sy = e.clientY
    const move = ev => setSize({ w: Math.max(300, sw + ev.clientX - sx), h: Math.max(220, sh + ev.clientY - sy) })
    const up = () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  const alturaDoCartao = ehTelaPequena ? 380 : size.h
  const alturaDaBarraDeConfiguracao = card.configuracao ? 40 : 0
  const chartH = alturaDoCartao - 90 - alturaDaBarraDeConfiguracao

  const getDimension = () => {
    if (card.configuracao) {
      if (card.configuracao.agruparPor?.includes('autor')) return 'autor'
      if (card.configuracao.agruparPor?.includes('pais')) return 'pais'
      if (card.configuracao.agruparPor?.includes('categoria')) return 'categoria'
      if (card.configuracao.agruparPor?.includes('edicao')) return 'meeting'
      if (card.configuracao.fonte === 'meeting') return 'meeting'
    }
    if (!metric) return 'grupo'
    if (metric.filtros?.includes('autor')) return 'autor'
    if (metric.filtros?.includes('pais')) return 'pais'
    if (metric.filtros?.includes('categoria')) return 'categoria'
    if (metric.filtros?.includes('meeting')) return 'meeting'
    return 'grupo'
  }

  function renderChart() {
    if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height: chartH, color:'var(--text-muted)', fontSize:13 }}>{t('carregando')}</div>
    if (erro) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height: chartH, color:'#c0392b', fontSize:12, textAlign:'center', padding: 12 }}>Erro: {erro}<br/>(backend rodando?)</div>
    if (!data || (Array.isArray(data) && data.length === 0)) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height: chartH, color:'var(--text-muted)', fontSize:13 }}>{t('semDados')}</div>

    switch (chartStyle) {
      case 'Barras': {
        const comSeries = chavesDeSerie.length > 0
        return (
          <ResponsiveContainer width="100%" height={chartH}>
            <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 70 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="x" interval={0} angle={-45} textAnchor="end" tick={{ fontSize: 10, fill: '#555555' }} height={70} />
              <YAxis tick={{ fontSize: 10, fill: '#555555' }} />
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#D9D9D9', color: '#1A1A1A' }} />
              {comSeries ? (
                <>
                  {chavesDeSerie.map((serie, posicao) => (
                    <Bar key={serie} dataKey={serie} stackId="pilha" fill={COLORS[posicao % COLORS.length]} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </>
              ) : (
                <Bar dataKey="y" fill="#FBC663" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              )}
            </BarChart>
          </ResponsiveContainer>
        )
      }
      case 'Linhas':
        return (
          <div style={{ width: '100%', height: '100%', minHeight: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="x" tick={{ fontSize: 10, fill: '#555555' }} interval="preserveStartEnd" angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10, fill: '#555555' }} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#D9D9D9', color: '#1A1A1A' }} />
                {chavesDeSerie.length > 0 ? (
                  <>
                    {chavesDeSerie.map((serie, posicao) => (
                      <Line key={serie} type="monotone" dataKey={serie} stroke={COLORS[posicao % COLORS.length]} strokeWidth={2} dot={false} isAnimationActive={false} />
                    ))}
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </>
                ) : (
                  <Line type="monotone" dataKey="y" stroke="#C49830" strokeWidth={2} dot={false} isAnimationActive={false} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
      case 'Pizza':
        return (
          <ResponsiveContainer width="100%" height={chartH}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" outerRadius={Math.max(30, chartH / 2 - 35)} dataKey="value" nameKey="name" label={({ name, percent }) => `${String(name).substring(0, 10)}${String(name).length > 10 ? '...' : ''} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: '#666' }} isAnimationActive={false}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#D9D9D9', color: '#1A1A1A' }} />
            </PieChart>
          </ResponsiveContainer>
        )
      case 'Mapa':
        return (
          <div style={{ height: chartH, width: '100%', display: 'flex' }}>
             <ResponsiveMap data={data} />
          </div>
        )
      case 'Heatmap': {
        const years = [...new Set(data.map(d => d.year).filter(Boolean))].sort()
        const cats  = [...new Set(data.map(d => d.category).filter(Boolean))].sort()
        if (years.length === 0 || cats.length === 0) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height: chartH, color:'var(--text-muted)' }}>{t('semDados')}</div>

        const maxVal = Math.max(...data.map(d => d.total), 1)
        const cellValue = (cat, year) => data.find(d => d.category === cat && d.year === year)?.total ?? 0

        return (
          <div style={{ height: chartH, overflow: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 10, width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 2, background: '#FAFAFA', padding: '4px 8px', textAlign: 'left', color: '#666', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>Categoria / Ano</th>
                  {years.map(y => (
                    <th key={y} style={{ position: 'sticky', top: 0, background: '#FAFAFA', padding: '4px 6px', color: '#666', borderBottom: '1px solid var(--border)', minWidth: 30 }}>{y}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cats.map(c => (
                  <tr key={c}>
                    <td style={{ position: 'sticky', left: 0, zIndex: 1, background: '#fff', padding: '4px 8px', fontWeight: 600, whiteSpace: 'nowrap', borderRight: '1px solid var(--border)' }}>{c}</td>
                    {years.map(y => {
                      const v = cellValue(c, y)
                      const op = Math.min(1, Math.max(0.08, v / maxVal))
                      return <td key={y} title={`${c} · ${y}: ${v}`} style={{ backgroundColor: `rgba(251, 198, 99, ${op})`, color: op > 0.6 ? '#000' : '#333', padding: '6px 4px', textAlign: 'center', fontWeight: 600, borderBottom: '1px solid #F0F0F0', minWidth: 30 }}>{v || ''}</td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      case 'Tabela': {
        const colunas = colunasDaTabela.length ? colunasDaTabela : (data[0] ? Object.keys(data[0]) : ['total'])
        return (
          <div style={{ height: chartH, overflow: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 10, width: '100%' }}>
              <thead>
                <tr>
                  {colunas.map(col => (
                    <th key={col} style={{ position: 'sticky', top: 0, background: '#FAFAFA', padding: '4px 8px', textAlign: 'left', color: '#666', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                      {ROTULOS_DE_DIMENSAO_FALLBACK[col] ?? col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((linha, indice) => (
                  <tr key={indice}>
                    {colunas.map(col => (
                      <td key={col} style={{ padding: '4px 8px', borderBottom: '1px solid #F0F0F0', fontWeight: col === 'total' ? 600 : 400 }}>
                        {String(linha[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      case 'Rede':
        return (
          <div style={{ height: chartH, background: '#FAFAFA', borderRadius: 8, overflow: 'hidden' }}>
            <ForceGraph2D
              graphData={data}
              nodeLabel="name"
              nodeAutoColorBy="id"
              linkColor={() => '#C49830'}
              linkWidth={link => Math.min(5, Math.max(1, link.value * 0.5))}
              nodeRelSize={6}
              width={size.w - 32}
              height={chartH}
              backgroundColor="#FAFAFA"
              cooldownTicks={100}
              warmupTicks={50}
            />
          </div>
        )
      default:
        return (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height: chartH, color:'var(--text-muted)', flexDirection:'column', gap:8 }}>
            <Construction size={32} />
            <span>{chartStyle || 'Visualização'} — em desenvolvimento</span>
          </div>
        )
    }
  }

  return (
    <div
      ref={cardRef}
      className={`viz-card ${isSelected ? 'selected' : ''}`}
      style={ehTelaPequena ? {} : { left: pos.x, top: pos.y, width: size.w, height: size.h }}
      onMouseDown={e => { onSelect(card.id); startDrag(e) }}
      onClick={() => onSelect(card.id)}
    >
      <div className="viz-card-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <BarChart2 size={14} /> {tituloDoCartao}
          {card.configuracao && card.configuracao.herdarFiltrosGlobais === false && (
            <span
              title="Este cartão usa filtros próprios (não herda do global)"
              style={{
                fontSize: 9,
                padding: '1px 5px',
                border: '1px solid var(--gold-dark)',
                borderRadius: 3,
                color: 'var(--gold-text)',
                background: '#FFF8E8',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                cursor: 'help',
                marginLeft: 4
              }}
            >
              filtros próprios
            </span>
          )}
        </span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {avisos.length > 0 && (
            <span
              title={avisos.join(' ')}
              style={{ display: 'flex', alignItems: 'center', cursor: 'help', color: 'var(--gold-dark)' }}
              onMouseDown={e => e.stopPropagation()}
            >
              <AlertTriangle size={14} />
            </span>
          )}

          <span
            className="viz-card-combine"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--gold-dark)' }}
            title="Combinar com outros dados"
            onMouseDown={e => e.stopPropagation()}
            onClick={() => setModalAberto(true)}
          >
            <Sparkles size={16} />
          </span>

          <span
            className="viz-card-csv"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }}
            title="Exportar CSV"
            onMouseDown={e => e.stopPropagation()}
            onClick={baixarCSV}
          >
            CSV
          </span>

          <span className="viz-card-download" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: baixando ? 0.5 : 1, color: 'var(--text-primary)' }} title="Baixar imagem" onMouseDown={e => e.stopPropagation()} onClick={baixando ? undefined : baixarImagem}>
            {baixando ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
          </span>
          <span className="viz-card-close" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onMouseDown={e => e.stopPropagation()} onClick={() => onDelete(card.id)}><X size={16} /></span>
        </div>
      </div>

      {card.configuracao && (
        <BarraDeConfiguracao
          configuracao={card.configuracao}
          capacidades={capacidades}
          filtrosGlobais={filters}
          onAlterar={(alteracoes) => onUpdate(card.id, { configuracao: alteracoes })}
        />
      )}

      <div className="viz-card-body">
        {renderChart()}
      </div>

      {!ehTelaPequena && <div className="viz-card-resize" onMouseDown={startResize} />}

      {modalAberto && createPortal(
        <ModalCombinacao
          dimensao={getDimension()}
          configuracao={card.configuracao}
          cardsAbertos={cardsAbertos}
          capacidades={capacidades}
          onClose={() => setModalAberto(false)}
          onSelectViz={onAddCards}
        />,
        document.body
      )}
    </div>
  )
}

export function Canvas({ filters, cards, setCards, selectedCardId, onSelectCard, onUpdateCard, onAddCards, capacidades, ehTelaPequena }) {
  const { t } = useLanguage()

  return (
    <div className={`canvas-area ${ehTelaPequena ? 'mobile' : ''}`}>
      {cards.length === 0 && (
        <div className="canvas-placeholder">
          <BarChart2 size={48} color="#ccc" strokeWidth={1.5} />
          <p>{t('selecioneViz')}</p>
        </div>
      )}
      {cards.map((c, i) => (
        <VizCard
          key={c.id}
          card={c}
          index={i}
          filters={filters}
          isSelected={selectedCardId === c.id}
          onSelect={onSelectCard}
          onUpdate={onUpdateCard}
          onAddCards={onAddCards}
          capacidades={capacidades}
          cardsAbertos={cards}
          ehTelaPequena={ehTelaPequena}
          onDelete={(id) => setCards(prev => prev.filter(card => card.id !== id))}
        />
      ))}
    </div>
  )
}
import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { BarChart3, LineChart, PieChart, Share2, Map, Grid, Plus, X, Globe, Sparkles, Menu } from 'lucide-react'
import { metricasParaChart } from '../../metrics'
import { useLanguage } from '../../LanguageContext'
import { useZoomLevel } from '../../hooks/useZoomLevel'
import { criarConfiguracaoPadrao, configuracaoEquivalenteParaMetrica } from '../../consulta'
import { rotuloTipo } from '../../rotulos'

const VIZ_TYPES = [
  { id: 'Barras',  icon: BarChart3 },
  { id: 'Linhas',  icon: LineChart },
  { id: 'Pizza',   icon: PieChart },
  { id: 'Rede',    icon: Share2 },
  { id: 'Mapa',    icon: Map },
  { id: 'Heatmap', icon: Grid },
]

const LANGS = [
  { code: 'pt-br', label: 'Português' },
  { code: 'en',    label: 'English' },
  { code: 'es',    label: 'Español' },
]

function agruparPorGrupo(lista) {
  const grupos = {}
  lista.forEach(m => {
    if (!grupos[m.group]) grupos[m.group] = []
    grupos[m.group].push(m)
  })
  return grupos
}

function GrupoFiltroAtivo({ f, t }) {
  return (
    <div className="active-filter">
      <span className="active-filter-label">{t(f.key)}</span>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
        {f.emUso ? (
          <span className="active-filter-chip" onClick={f.onRemove}
            style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            {t('todos')} <X size={12} />
          </span>
        ) : f.todos ? (
          <span className="active-filter-chip" onClick={() => f.toggle('__todos__')}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {t('todos')} <X size={12} />
          </span>
        ) : (
          f.values.map(v => (
            <span key={v} className="active-filter-chip" onClick={() => f.toggle(v)}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {v} <X size={12} />
            </span>
          ))
        )}
      </div>
    </div>
  )
}

function useOverflowDeGrupos(grupos) {
  const containerRef = useRef(null)
  const medidaRefs = useRef([])
  const [visibleCount, setVisibleCount] = useState(grupos.length)

  useLayoutEffect(() => {
    function medir() {
      const container = containerRef.current
      if (!container) return
      if (grupos.length === 0) { setVisibleCount(0); return }

      const larguraDisponivel = container.offsetWidth
      const espacoBotaoVerMais = 110
      let usado = 0
      let count = 0

      for (let i = 0; i < grupos.length; i++) {
        const el = medidaRefs.current[i]
        const largura = (el ? el.offsetWidth : 100) + 10
        const sobraramItens = i < grupos.length - 1
        const limite = sobraramItens ? larguraDisponivel - espacoBotaoVerMais : larguraDisponivel
        if (usado + largura > limite) break
        usado += largura
        count++
      }
      setVisibleCount(count)
    }

    medir()
    const resizeObserver = new ResizeObserver(medir)
    if (containerRef.current) resizeObserver.observe(containerRef.current)
    window.addEventListener('resize', medir)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', medir)
    }
  }, [grupos.map(g => `${g.key}-${g.emUso ? 'uso' : g.todos ? 'todos' : 'valores'}-${g.values ? g.values.join(',') : ''}`).join('|')])

  return { containerRef, medidaRefs, visibleCount }
}

export function Topbar({ filters, onSelectViz, dimensoesEmUso, onRemoveFilter, ehTelaPequena, menuAberto, aoAlternarMenu }) {
  const [langOpen, setLangOpen] = useState(false)
  const { lang, setLang, t } = useLanguage()
  const zoom = useZoomLevel()

  const [tipoOpen, setTipoOpen] = useState(false)
  const [dadoOpen, setDadoOpen] = useState(false)
  const [pendingTipo, setPendingTipo] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)

  const vizRef = useRef(null)
  const langRef = useRef(null)

  useEffect(() => {
    function handleClickFora(e) {
      if (vizRef.current && !vizRef.current.contains(e.target)) {
        setTipoOpen(false)
        setDadoOpen(false)
        setPendingTipo(null)
      }
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [])

  const activeFilters = []
  const filtrosDoTopo = [
    { filtro: 'categoria', chave: 'categoria', toggle: filters.toggleCategoria, valores: filters.categoria, todos: filters.categoriaTodos },
    { filtro: 'pais',      chave: 'pais',      toggle: filters.togglePais,      valores: filters.pais,      todos: filters.paisTodos      },
    { filtro: 'grupo',     chave: 'grupo',     toggle: filters.toggleGrupo,     valores: filters.grupo,     todos: filters.grupoTodos     },
    { filtro: 'meeting',   chave: 'meetings',  toggle: filters.toggleMeeting,   valores: filters.meeting,   todos: filters.meetingTodos   },
    { filtro: 'autor',     chave: 'autores',   toggle: filters.toggleAutor,     valores: filters.autor,     todos: filters.autorTodos     },
    { filtro: 'rfcNumero', chave: 'rfcs',      toggle: filters.toggleRfc,       valores: filters.rfcNumero, todos: filters.rfcTodos       },
  ]

  filtrosDoTopo.forEach(({ filtro, chave, toggle, valores, todos }) => {
    if (todos) {
      activeFilters.push({ key: chave, todos: true, toggle })
    } else if (valores && valores.length > 0) {
      activeFilters.push({ key: chave, values: valores, toggle })
    } else if (dimensoesEmUso && dimensoesEmUso.has(filtro)) {
      activeFilters.push({ key: chave, emUso: true, onRemove: () => onRemoveFilter(filtro) })
    }
  })

  const chaveGrupo = (f, i) =>
    `${f.key}-${f.emUso ? 'uso' : f.todos ? 'todos' : 'valores'}-${i}`

  const { containerRef: filtrosContainerRef, medidaRefs, visibleCount } = useOverflowDeGrupos(activeFilters)
  const escondidos = activeFilters.length - visibleCount

  return (
    <div
      className="topbar-outer"
      style={ehTelaPequena ? {} : { transform: `translateX(-50%) scale(${1 / zoom})` }}
    >
      <div className="topbar-back" />
      <div className="topbar-inner">

        {/* Botão Sanduíche */}
        {ehTelaPequena && (
          <button
            className="btn-sanduiche"
            onClick={aoAlternarMenu}
            aria-expanded={menuAberto}
            aria-controls="sidebar-menu"
            aria-label={t('abrirMenu')}
          >
            <Menu size={24} />
          </button>
        )}

        <div ref={filtrosContainerRef} className="active-filters-row" style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', top: 0, left: 0, display: 'flex', gap: 10, whiteSpace: 'nowrap' }}>
            {activeFilters.map((f, i) => (
              <div key={chaveGrupo(f, i)} ref={el => { medidaRefs.current[i] = el }}>
                <GrupoFiltroAtivo f={f} t={t} />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'nowrap', overflow: 'hidden' }}>
            {activeFilters.slice(0, visibleCount).map((f, i) => (
              <GrupoFiltroAtivo key={chaveGrupo(f, i)} f={f} t={t} />
            ))}
            {activeFilters.length === 0 && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('semFiltros')}</span>
            )}
            {escondidos > 0 && (
              <span className="active-filter-chip" style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => setModalAberto(true)}>
                +{escondidos} {t('verMais')}
              </span>
            )}
          </div>
        </div>

        <div className="topbar-spacer" />

        <div ref={vizRef} style={{ position: 'relative' }}>
          <div className="viz-selector" onClick={() => { setTipoOpen(o => !o); setDadoOpen(false) }}>
            <Plus size={14} /> {ehTelaPequena ? '' : t('escolherDado')}
          </div>

          {tipoOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#fff', border: '1px solid #D9D9D9', borderRadius: 8, minWidth: 220, overflow: 'hidden', zIndex: 300, boxShadow: '0 4px 16px rgba(0,0,0,.1)' }}>
              <div
                className="lang-option"
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, borderBottom: '1px solid #F0F0F0' }}
                onClick={() => {
                  onSelectViz([{ configuracao: criarConfiguracaoPadrao('rfc', ['categoria'], 'filtrar', 'Barras') }])
                  setTipoOpen(false)
                  setDadoOpen(false)
                  setPendingTipo(null)
                }}
              >
                <Sparkles size={16} color="var(--gold-dark)" /> {t('montarViz')}
              </div>

              {VIZ_TYPES.map(vt => {
                const Icon = vt.icon
                return (
                  <div key={vt.id} className="lang-option" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => { setPendingTipo(vt.id); setTipoOpen(false); setDadoOpen(true) }}>
                    <Icon size={16} color="var(--text-secondary)" /> {rotuloTipo(t, vt.id)}
                  </div>
                )
              })}
            </div>
          )}

          {dadoOpen && pendingTipo && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#fff', border: '1px solid #D9D9D9', borderRadius: 8, minWidth: 260, maxHeight: 340, overflowY: 'auto', zIndex: 300, boxShadow: '0 4px 16px rgba(0,0,0,.1)' }}>
              <div style={{ padding: '6px 14px', fontSize: 11, fontWeight: 700, color: '#999', display: 'flex', alignItems: 'center', gap: 6 }}>
                {(() => { const Icon = VIZ_TYPES.find(v => v.id === pendingTipo)?.icon; return Icon ? <Icon size={14} /> : null })()} {rotuloTipo(t, pendingTipo)}
              </div>
              {Object.entries(agruparPorGrupo(metricasParaChart(pendingTipo))).map(([grupo, metricas]) => (
                <div key={grupo}>
                  <div style={{ padding: '6px 14px', fontSize: 11, fontWeight: 700, color: '#999', background: '#FAFAFA', textTransform: 'uppercase' }}>{grupo}</div>
                  {metricas.map(m => (
                    <div key={m.id} className="lang-option" onClick={() => {
                        filters.ativarTodosPara(m.filtros)
                        const configuracaoEquivalente = configuracaoEquivalenteParaMetrica(m.id, pendingTipo)
                        if (configuracaoEquivalente) {
                          onSelectViz([{ configuracao: configuracaoEquivalente }])
                        } else {
                          onSelectViz([{ tipo: pendingTipo, metricId: m.id }])
                        }
                        setDadoOpen(false)
                        setPendingTipo(null)
                      }}>
                      {m.label}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div ref={langRef} className="lang-btn" onClick={e => { e.stopPropagation(); setLangOpen(o => !o) }}>
          <div className="lang-icon"><Globe size={16} /></div>
          {!ehTelaPequena && <span className="lang-label">{lang}</span>}
          <div className={`lang-dropdown ${langOpen ? 'open' : ''}`}>
            {LANGS.map(l => (
              <div key={l.code} className={`lang-option ${lang === l.code ? 'active' : ''}`} onClick={e => { e.stopPropagation(); setLang(l.code); setLangOpen(false) }}>
                {l.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Filtros Ativos (+N ver mais) */}
      {modalAberto && (
        <div className="modal-overlay" onClick={() => setModalAberto(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <strong style={{ fontSize: 18 }}>{t('filtrosAtivos')}</strong>
              <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => setModalAberto(false)}><X size={24} /></span>
            </div>
            <div className="modal-content" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {activeFilters.map((f, i) => <GrupoFiltroAtivo key={chaveGrupo(f, i)} f={f} t={t} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
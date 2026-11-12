import { useState, useEffect } from 'react'
import { Search, ChevronRight, X } from 'lucide-react'
import { useLanguage } from '../../LanguageContext'
import { ModalCombinacao } from './ModalCombinacao'
import { createPortal } from 'react-dom'

function SearchIcon() { return <Search size={18} className="ico-search" /> }

function ChipGrid({ options, selected, todosSelected, onToggle, onClickTodos, todosLabel }) {
  const uniqueOptions = [...new Set(options.filter(op => op && op.trim() !== ''))]

  return (
    <div className="chip-grid">
      <span className={`chip wide ${todosSelected ? 'active' : ''}`}
        onClick={() => {
          if (!todosSelected) onClickTodos()
          onToggle('__todos__')
        }}>
        {todosLabel}
      </span>
      {uniqueOptions.map((op, index) => (
        <span key={`${op}-${index}`}
          className={`chip narrow ${selected.includes(op) ? 'active' : ''}`}
          onClick={() => onToggle(op)}>{op}</span>
      ))}
    </div>
  )
}

function MobileFilterModal({ title, options, selected, todosSelected, onToggle, onClickTodos, onClose }) {
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const uniqueOptions = [...new Set(options.filter(o => o != null && o !== ''))]
  
  const filtered = uniqueOptions.filter(o => 
    String(o).toLowerCase().includes(search.toLowerCase())
  )

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={onClose}>
            <X size={24} />
          </span>
        </div>
        
        <div className="modal-content">
          <div className="search-wrap">
            <input 
              type="text" 
              placeholder={`${t('buscar')} ${title.toLowerCase()}...`} 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
            <SearchIcon />
          </div>

          <div style={{ marginTop: 20 }}>
             <ChipGrid
                options={filtered}
                selected={selected}
                todosSelected={todosSelected}
                onToggle={onToggle}
                onClickTodos={onClickTodos}
                todosLabel={t('todos')}
              />
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export function FilterBlock({ titleKey, titleFixo, options, selected, todosSelected = false, onToggle, onClickTodos, defaultOpen = false, externalSearch = '', ehTelaPequena = false }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(defaultOpen)
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const title = titleFixo ?? t(titleKey)

  const uniqueOptions = [...new Set(options.filter(o => o != null && o !== ''))]
  const termoLocal = search.toLowerCase()
  const termoGeral = externalSearch.toLowerCase()

  const filtered = uniqueOptions.filter(o => {
    const texto = String(o).toLowerCase()
    return texto.includes(termoLocal) && (termoGeral === '' || texto.includes(termoGeral))
  })

  const temResultadoGeral = termoGeral !== '' && uniqueOptions.some(o => String(o).toLowerCase().includes(termoGeral))
  const badge = todosSelected ? `(${t('todos')})` : selected.length ? `(${selected.length})` : ''

  if (ehTelaPequena) {
    return (
      <>
        <div className="filter-block">
          <div className="filter-header" onClick={() => setModalOpen(true)}>
            <div className="filter-header-left">
              {title} <span className="filter-badge">{badge}</span>
            </div>
            <span className="filter-chevron" style={{ display: 'flex', alignItems: 'center' }}>
              <ChevronRight size={16} />
            </span>
          </div>
        </div>
        {modalOpen && (
          <MobileFilterModal 
            title={title} 
            options={options} 
            selected={selected} 
            todosSelected={todosSelected}
            onToggle={onToggle}
            onClickTodos={() => onClickTodos(titleKey)}
            onClose={() => setModalOpen(false)}
          />
        )}
      </>
    )
  }

  // Desktop
  const aberto = open || temResultadoGeral
  return (
    <div className="filter-block">
      <div className="filter-header" onClick={() => setOpen(o => !o)}>
        <div className="filter-header-left">
          {title} <span className="filter-badge">{badge}</span>
        </div>
        <span className={`filter-chevron ${aberto ? 'open' : ''}`} style={{ display: 'flex', alignItems: 'center' }}>
          <ChevronRight size={16} />
        </span>
      </div>
      <div className={`dropdown-body ${aberto ? 'open' : 'closed'}`}>
        <div className="search-wrap" style={{ marginTop: 6 }}>
          <input type="text" placeholder={`${t('buscar')} ${title.toLowerCase()}...`} value={search} onChange={e => setSearch(e.target.value)} />
          <SearchIcon />
        </div>
        {/* CORREÇÃO: Usando ChipGrid que passa o titleKey corretamente */}
        <ChipGrid
          options={filtered}
          selected={selected}
          todosSelected={todosSelected}
          onToggle={onToggle}
          onClickTodos={() => onClickTodos(titleKey)}
          todosLabel={t('todos')}
        />
      </div>
    </div>
  )
}

function YearRange({ yearMin, yearMax, setYearMin, setYearMax }) {
  const { t } = useLanguage()
  const MIN = 1969, MAX = 2025, TOTAL = MAX - MIN
  const pLo = ((yearMin - MIN) / TOTAL * 100).toFixed(1)
  const pHi = ((yearMax - MIN) / TOTAL * 100).toFixed(1)

  return (
    <div className="filter-block">
      <div className="year-label">{t('ano')}: {yearMin} – {yearMax}</div>
      <div className="range-track">
        <div className="range-bg" />
        <div className="range-fill" style={{ left: pLo + '%', right: (100 - parseFloat(pHi)).toFixed(1) + '%' }} />
        <input type="range" min={MIN} max={MAX} value={yearMin} onChange={e => setYearMin(Math.min(+e.target.value, yearMax - 1))} />
        <input type="range" min={MIN} max={MAX} value={yearMax} onChange={e => setYearMax(Math.max(+e.target.value, yearMin + 1))} />
        <div className="range-thumbs">
          <div className="thumb" style={{ left: pLo + '%' }} />
          <div className="thumb" style={{ left: pHi + '%' }} />
        </div>
      </div>
    </div>
  )
}

const DIMENSAO_POR_CHAVE_DO_BLOCO = {
  categoria: 'categoria', grupo: 'grupo', pais: 'pais', meeting: 'meeting',
  meetings: 'meeting', rfcs: 'rfcs', autor: 'autor', autores: 'autor', drafts: 'drafts',
}

export function Sidebar({ filters, onSelectViz, capacidades, ehTelaPequena, aoFecharMenu }) {
  const { t } = useLanguage()
  const [buscaGeral, setBuscaGeral] = useState('')
  const [modalCombinacao, setModalCombinacao] = useState(null)

  const {
    yearMin, yearMax, setYearMin, setYearMax,
    categoria, categoriaTodos, toggleCategoria,
    pais,      paisTodos,      togglePais,
    grupo,     grupoTodos,     toggleGrupo,
    meeting,   meetingTodos,   toggleMeeting,
    autor,     autorTodos,     toggleAutor,
    rfcNumero, rfcTodos,       toggleRfc,
    draft,     draftTodos,     toggleDraft,
    categoriaOptions, grupoOptions, paisOptions, meetingOptions, autorOptions, rfcOptions,
    draftOptions,
  } = filters

  useEffect(() => {
    if (!ehTelaPequena) return
    const aoApertarTecla = (e) => {
      if (e.key === 'Escape') aoFecharMenu()
    }
    document.addEventListener('keydown', aoApertarTecla)
    return () => document.removeEventListener('keydown', aoApertarTecla)
  }, [ehTelaPequena, aoFecharMenu])

  const handleTodosClick = (chaveDoBloco) => {
    const dimensao = DIMENSAO_POR_CHAVE_DO_BLOCO[chaveDoBloco]
    if (dimensao) setModalCombinacao(dimensao)
  }

  const handleSelectVizEFecharMenu = (viz) => {
    onSelectViz(viz)
    if (ehTelaPequena) aoFecharMenu()
  }

  return (
    <div className="tri-front">
      <div className="logo-area">
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', alignItems: 'center', position: 'relative' }}>
          <div className="logo-img">
            <svg width="95" height="34" viewBox="0 0 95 34" xmlns="http://www.w3.org/2000/svg">
              <rect x="4"  y="12" width="10" height="10" rx="1.5" fill="#B9B9B9" transform="rotate(45 9 17)"/>
              <rect x="16" y="9"  width="13" height="13" rx="1.5" fill="#C49830" transform="rotate(45 22.5 15.5)"/>
              <rect x="30" y="12" width="10" height="10" rx="1.5" fill="#B9B9B9" transform="rotate(45 35 17)"/>
              <rect x="55" y="12" width="10" height="10" rx="1.5" fill="#B9B9B9" transform="rotate(45 60 17)"/>
              <rect x="66" y="9"  width="13" height="13" rx="1.5" fill="#C49830" transform="rotate(45 72.5 15.5)"/>
              <rect x="81" y="12" width="10" height="10" rx="1.5" fill="#B9B9B9" transform="rotate(45 86 17)"/>
              <circle cx="47.5" cy="17" r="10" fill="#FFFFFF" stroke="#1A1A1A" strokeWidth="1.6"/>
              <circle cx="47.5" cy="17" r="4.2" fill="#1A1A1A"/>
              <circle cx="45.3" cy="14.6" r="1.4" fill="#FFFFFF" opacity="0.85"/>
            </svg>
            <span className="logo-text-label">VIsIETF</span>
          </div>
          {ehTelaPequena && (
            <span onClick={aoFecharMenu} style={{ cursor: 'pointer', padding: 10 }}>
              <X size={24} color="var(--text-primary)" />
            </span>
          )}
        </div>
      </div>

      <div className="sidebar-scroll">
        <div className="section-title">{t('filtros')}</div>
        <div className="search-wrap">
          <input type="text" placeholder={t('pesquisar')} value={buscaGeral} onChange={e => setBuscaGeral(e.target.value)} />
          <SearchIcon />
        </div>

        <YearRange yearMin={yearMin} yearMax={yearMax} setYearMin={setYearMin} setYearMax={setYearMax} />

        <FilterBlock ehTelaPequena={ehTelaPequena} titleKey="categoria" options={categoriaOptions} selected={categoria} todosSelected={categoriaTodos} onToggle={toggleCategoria} onClickTodos={handleTodosClick} externalSearch={buscaGeral} />
        <FilterBlock ehTelaPequena={ehTelaPequena} titleKey="pais" options={paisOptions} selected={pais} todosSelected={paisTodos} onToggle={togglePais} onClickTodos={handleTodosClick} externalSearch={buscaGeral} />
        <FilterBlock ehTelaPequena={ehTelaPequena} titleKey="rfcs" options={rfcOptions} selected={rfcNumero} todosSelected={rfcTodos} onToggle={toggleRfc} onClickTodos={handleTodosClick} externalSearch={buscaGeral} />
        <FilterBlock ehTelaPequena={ehTelaPequena} titleKey="autores" options={autorOptions} selected={autor} todosSelected={autorTodos} onToggle={toggleAutor} onClickTodos={handleTodosClick} externalSearch={buscaGeral} />
        <FilterBlock ehTelaPequena={ehTelaPequena} titleKey="drafts" options={draftOptions} selected={draft} todosSelected={draftTodos} onToggle={toggleDraft} onClickTodos={handleTodosClick} externalSearch={buscaGeral} />
        <FilterBlock ehTelaPequena={ehTelaPequena} titleKey="grupo" options={grupoOptions} selected={grupo} todosSelected={grupoTodos} onToggle={toggleGrupo} onClickTodos={handleTodosClick} externalSearch={buscaGeral} />
        <FilterBlock ehTelaPequena={ehTelaPequena} titleKey="meetings" options={meetingOptions} selected={meeting} todosSelected={meetingTodos} onToggle={toggleMeeting} onClickTodos={handleTodosClick} externalSearch={buscaGeral} />
      </div>

      {modalCombinacao && (
        <ModalCombinacao
          dimensao={modalCombinacao}
          capacidades={capacidades}
          onClose={() => setModalCombinacao(null)}
          onSelectViz={handleSelectVizEFecharMenu}
        />
      )}
    </div>
  )
}
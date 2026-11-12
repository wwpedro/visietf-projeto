// src/components/Sidebar/ModalCombinacao.jsx
import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Sparkles, LayoutTemplate } from 'lucide-react'
import { criarConfiguracaoPadrao, tiposCompativeis, contarAtributos } from '../../consulta'
import { useLanguage } from '../../LanguageContext'
import { rotuloFonte, rotuloDimensao, rotuloTipo, tituloDaConfiguracao } from '../../rotulos'

const CHAVE_DE_DIMENSAO = {
  rfcs: 'rfcs', autor: 'autores', categoria: 'categoria',
  grupo: 'grupo', pais: 'pais', meeting: 'meetings', drafts: 'drafts',
}

function gerarPrincipal(dimensao) {
  switch (dimensao) {
    case 'rfcs':
      return { label: 'RFCs por ano', configuracao: criarConfiguracaoPadrao('rfc', [], 'agrupar', 'Linhas') }
    case 'autor':
      return { label: 'Autores com mais RFCs', configuracao: criarConfiguracaoPadrao('rfc', ['autor'], 'filtrar', 'Barras') }
    case 'categoria':
      return { label: 'RFCs por categoria', configuracao: criarConfiguracaoPadrao('rfc', ['categoria'], 'filtrar', 'Pizza') }
    case 'grupo':
      return { label: 'Drafts por grupo', configuracao: criarConfiguracaoPadrao('draft', ['grupo'], 'filtrar', 'Barras') } // Fonte draft, não rfc
    case 'pais':
      return { label: 'Participantes por país', configuracao: criarConfiguracaoPadrao('meeting', ['pais'], 'filtrar', 'Mapa') }
    case 'meeting':
      return { label: 'Participantes por edição', configuracao: criarConfiguracaoPadrao('meeting', ['edicao'], 'agrupar', 'Barras') }
    case 'drafts':
      return { label: 'Drafts por ano', configuracao: criarConfiguracaoPadrao('draft', [], 'agrupar', 'Linhas') }
    case 'combinacoes':
      return null
    default:
      return { label: 'RFCs por ano', configuracao: criarConfiguracaoPadrao('rfc', [], 'agrupar', 'Linhas') }
  }
}

function gerarCombinacoes(dimensao, capacidades) {
  const fontes = capacidades || {}
  const fonteSuporta = (fonte, dim) => fontes[fonte]?.dimensoes?.some(d => d.id === dim)
  const opcoes = []

  if (dimensao === 'rfcs') {
    opcoes.push({ label: 'RFCs por categoria', configuracao: criarConfiguracaoPadrao('rfc', ['categoria'], 'filtrar', 'Pizza') })
    opcoes.push({ label: 'RFCs por categoria × ano', configuracao: criarConfiguracaoPadrao('rfc', ['categoria'], 'agrupar', 'Heatmap') })
    opcoes.push({ label: 'Autores com mais RFCs', configuracao: criarConfiguracaoPadrao('rfc', ['autor'], 'filtrar', 'Barras') })
  } else if (dimensao === 'autor') {
    opcoes.push({ label: 'Autores com mais RFCs por ano', configuracao: criarConfiguracaoPadrao('rfc', ['autor'], 'agrupar', 'Linhas') })
    opcoes.push({ label: 'Autores × categoria', configuracao: criarConfiguracaoPadrao('rfc', ['autor', 'categoria'], 'filtrar', 'Heatmap') })
    if (fonteSuporta('draft', 'autor')) {
      opcoes.push({ label: 'Autores com mais drafts', configuracao: criarConfiguracaoPadrao('draft', ['autor'], 'filtrar', 'Barras') })
    }
  } else if (dimensao === 'categoria') {
    opcoes.push({ label: 'Categoria × ano', configuracao: criarConfiguracaoPadrao('rfc', ['categoria'], 'agrupar', 'Heatmap') })
    if (fonteSuporta('rfc', 'autor')) {
      opcoes.push({ label: 'Autores por categoria', configuracao: criarConfiguracaoPadrao('rfc', ['autor', 'categoria'], 'filtrar', 'Heatmap') })
    }
  } else if (dimensao === 'grupo') {
    if (fonteSuporta('draft', 'grupo')) {
      opcoes.push({ label: 'Drafts por grupo', configuracao: criarConfiguracaoPadrao('draft', ['grupo'], 'filtrar', 'Barras') })
    }
    if (fonteSuporta('draft', 'grupo')) {
      opcoes.push({ label: 'Drafts por grupo × ano', configuracao: criarConfiguracaoPadrao('draft', ['grupo'], 'agrupar', 'Heatmap') })
    }
  } else if (dimensao === 'pais') {
    if (fonteSuporta('draft', 'pais')) {
      opcoes.push({ label: 'Drafts por país', configuracao: criarConfiguracaoPadrao('draft', ['pais'], 'filtrar', 'Barras') })
    }
    if (fonteSuporta('rfc', 'pais')) {
      opcoes.push({ label: 'RFCs por país', configuracao: criarConfiguracaoPadrao('rfc', ['pais'], 'filtrar', 'Mapa') })
    }
  } else if (dimensao === 'meeting') {
    if (fonteSuporta('meeting', 'pais')) {
      opcoes.push({ label: 'País × edição', configuracao: criarConfiguracaoPadrao('meeting', ['edicao', 'pais'], 'agrupar', 'Heatmap') })
    }
    if (fonteSuporta('meeting', 'tipo_credenciamento')) {
      opcoes.push({ label: 'Tipo de credenciamento', configuracao: criarConfiguracaoPadrao('meeting', ['tipo_credenciamento'], 'filtrar', 'Pizza') })
    }
  } else if (dimensao === 'drafts') {
    if (fonteSuporta('draft', 'grupo')) {
      opcoes.push({ label: 'Drafts por grupo', configuracao: criarConfiguracaoPadrao('draft', ['grupo'], 'filtrar', 'Barras') })
    }
    if (fonteSuporta('draft', 'pais')) {
      opcoes.push({ label: 'Drafts por país', configuracao: criarConfiguracaoPadrao('draft', ['pais'], 'filtrar', 'Barras') })
    }
    if (fonteSuporta('draft', 'keyword')) {
      opcoes.push({ label: 'Drafts por palavra-chave', configuracao: criarConfiguracaoPadrao('draft', ['keyword'], 'filtrar', 'Barras') })
    }
    if (fonteSuporta('draft', 'status')) {
      opcoes.push({ label: 'Status pretendido dos drafts', configuracao: criarConfiguracaoPadrao('draft', ['status'], 'filtrar', 'Pizza') })
    }
    if (fonteSuporta('draft', 'grupo')) {
      opcoes.push({ label: 'Drafts por grupo × ano', configuracao: criarConfiguracaoPadrao('draft', ['grupo'], 'agrupar', 'Heatmap') })
    }
  } else if (dimensao === 'combinacoes') {
    // Mantém apenas combinações que fazem sentido
    opcoes.push({ label: 'RFCs × Categoria × Ano',      configuracao: criarConfiguracaoPadrao('rfc', ['categoria'], 'agrupar', 'Heatmap') })
    opcoes.push({ label: 'RFCs × Autor × Categoria',      configuracao: criarConfiguracaoPadrao('rfc', ['autor', 'categoria'], 'filtrar', 'Heatmap') })
    opcoes.push({ label: 'RFCs por ano × Autor',          configuracao: criarConfiguracaoPadrao('rfc', ['autor'], 'agrupar', 'Linhas') })
    if (fonteSuporta('draft', 'pais')) {
      opcoes.push({ label: 'Drafts × País × Ano',         configuracao: criarConfiguracaoPadrao('draft', ['pais'], 'agrupar', 'Heatmap') })
    }
    if (fonteSuporta('draft', 'grupo')) {
      opcoes.push({ label: 'Drafts × Grupo × Ano',        configuracao: criarConfiguracaoPadrao('draft', ['grupo'], 'agrupar', 'Heatmap') })
    }
    if (fonteSuporta('meeting', 'pais') && fonteSuporta('meeting', 'edicao')) {
      opcoes.push({ label: 'Meetings × Edição × País',    configuracao: criarConfiguracaoPadrao('meeting', ['edicao', 'pais'], 'agrupar', 'Heatmap') })
    }
  }

  const maxOpcoes = dimensao === 'combinacoes' ? 10 : 7
  return opcoes.slice(0, maxOpcoes)
}

// ─── Modo contextual (Canvas): sugestões a partir da config atual ─
function mesmaConfiguracao(c1, c2) {
  if (c1.fonte !== c2.fonte) return false
  const a = [...c1.agruparPor].sort().join(',')
  const b = [...c2.agruparPor].sort().join(',')
  if (a !== b) return false
  return (c1.tempo?.modo ?? 'filtrar') === (c2.tempo?.modo ?? 'filtrar')
}

function configuracaoJaAberta(configuracao, cardsAbertos) {
  return (cardsAbertos || []).some(card =>
    card.configuracao && mesmaConfiguracao(card.configuracao, configuracao)
  )
}

function rotuloDaConfiguracao(configuracao, capacidades) {
  const fonte = capacidades?.[configuracao.fonte]
  const prefixo = fonte?.rotulo ?? configuracao.fonte
  const rotulos = configuracao.agruparPor.map(id =>
    fonte?.dimensoes?.find(d => d.id === id)?.rotulo ?? id
  )
  if (configuracao.tempo?.modo === 'agrupar') {
    rotulos.unshift(fonte?.dimensoes?.find(d => d.id === 'ano')?.rotulo ?? 'Ano')
  }
  if (rotulos.length === 0) return prefixo
  return `${prefixo} por ${rotulos.join(' × ')}`
}

function escolherTipoGrafico(configuracao, tipoPreferido) {
  const tipos = tiposCompativeis(configuracao)
  if (tipoPreferido && tipos.includes(tipoPreferido)) return tipoPreferido
  return tipos[0]
}

function gerarSugestoesContextuais(configuracao, capacidades, cardsAbertos, t) {
  if (!configuracao || !capacidades) return []
  const fonteAtual = capacidades[configuracao.fonte]
  if (!fonteAtual) return []

  const dimensoesDisponiveis = fonteAtual.dimensoes.map(d => d.id).filter(id => id !== 'ano')
  const sugestoes = []
  const tipoOriginal = configuracao.tipoGrafico

  // 1) Tempo: desligar (se agrupar) ou ligar (se filtrar)
  if (configuracao.tempo?.modo === 'agrupar') {
    const nova = { ...configuracao, tempo: { ...configuracao.tempo, modo: 'filtrar' } }
    nova.tipoGrafico = escolherTipoGrafico(nova, 'Barras')
    sugestoes.push({
      label: rotuloDaConfiguracao(nova, capacidades),
      descricaoCurta: t('semEixoTempo'),
      configuracao: nova,
    })
  } else if (contarAtributos(configuracao) < 3) {
    const nova = { ...configuracao, tempo: { ...configuracao.tempo, modo: 'agrupar' } }
    nova.tipoGrafico = escolherTipoGrafico(nova, 'Linhas')
    sugestoes.push({
      label: rotuloDaConfiguracao(nova, capacidades),
      descricaoCurta: t('addEixoAno'),
      configuracao: nova,
    })
  }

  // 2) Adicionar segunda dimensão
  if (configuracao.agruparPor.length < 2 && contarAtributos(configuracao) < 3) {
    for (const dim of dimensoesDisponiveis) {
      if (configuracao.agruparPor.includes(dim)) continue
      const nova = { ...configuracao, agruparPor: [...configuracao.agruparPor, dim] }
      nova.tipoGrafico = escolherTipoGrafico(nova, 'Heatmap')
      sugestoes.push({
        label: rotuloDaConfiguracao(nova, capacidades),
        descricaoCurta: `${t('dividePor')} ${rotuloDimensao(t, dim, fonteAtual.dimensoes.find(d => d.id === dim)?.rotulo)}`,
        configuracao: nova,
      })
    }
  }

  // 3) Trocar a primeira dimensão
  if (configuracao.agruparPor.length === 1) {
    for (const dim of dimensoesDisponiveis) {
      if (configuracao.agruparPor.includes(dim)) continue
      const nova = { ...configuracao, agruparPor: [dim] }
      nova.tipoGrafico = escolherTipoGrafico(nova, tipoOriginal)
      sugestoes.push({
        label: rotuloDaConfiguracao(nova, capacidades),
        descricaoCurta: `${t('trocaPara')} ${rotuloDimensao(t, dim, fonteAtual.dimensoes.find(d => d.id === dim)?.rotulo)}`,
        configuracao: nova,
      })
    }
  }

  // 4) Trocar de fonte
  for (const [idFonte, defFonte] of Object.entries(capacidades)) {
    if (idFonte === configuracao.fonte) continue
    const dimsDaFonte = defFonte.dimensoes.map(d => d.id)
    const agruparCompativeis = configuracao.agruparPor.filter(d => dimsDaFonte.includes(d))
    if (agruparCompativeis.length === 0) continue
    const nova = { ...configuracao, fonte: idFonte, agruparPor: agruparCompativeis }
    nova.tipoGrafico = escolherTipoGrafico(nova, tipoOriginal)
    sugestoes.push({
      label: rotuloDaConfiguracao(nova, capacidades),
      descricaoCurta: `${t('mudaFonte')} ${rotuloFonte(t, idFonte, defFonte.rotulo)}`,
      configuracao: nova,
    })
  }

  const vistos = new Set()
  return sugestoes
    .filter(s => {
      if (configuracaoJaAberta(s.configuracao, cardsAbertos)) return false
      const chave = s.configuracao.fonte + '|' + [...s.configuracao.agruparPor].sort().join(',') + '|' + (s.configuracao.tempo?.modo ?? 'filtrar')
      if (vistos.has(chave)) return false
      vistos.add(chave)
      return true
    })
    .slice(0, 8)
}

// ─── Componente ───────────────────────────────────────────────────
export function ModalCombinacao({ dimensao, configuracao, cardsAbertos, capacidades, onClose, onSelectViz }) {
  const { t } = useLanguage()
  const modoContextual = !!configuracao

  const opcoes = useMemo(() => {
    if (modoContextual) {
      return gerarSugestoesContextuais(configuracao, capacidades, cardsAbertos, t)
    }
    const principal = gerarPrincipal(dimensao)
    const combinacoes = gerarCombinacoes(dimensao, capacidades)
    return principal ? [principal, ...combinacoes] : combinacoes
  }, [dimensao, capacidades, configuracao, cardsAbertos, modoContextual, t])

  const titulo = modoContextual
    ? `${t('combinarTitulo')} ${tituloDaConfiguracao(t, configuracao, capacidades)}`
    : dimensao === 'combinacoes'
      ? t('explorarComb')
      : `${t('visualizar')} ${CHAVE_DE_DIMENSAO[dimensao] ? t(CHAVE_DE_DIMENSAO[dimensao]) : ''}`

  function escolher(item) {
    onSelectViz([{ configuracao: item.configuracao }])
    onClose()
  }

  function renderOpcao(opcao) {
    return (
      <div
        key={opcao.label}
        className="modal-option"
        style={{ cursor: 'pointer' }}
        onClick={() => escolher(opcao)}
      >
        <div className="modal-option-text">
          <span className="modal-option-label">{tituloDaConfiguracao(t, opcao.configuracao, capacidades)}</span>
          <span className="modal-option-desc">
            {opcao.descricaoCurta
              ? `${opcao.descricaoCurta} · ${t('graficoTipo')}: ${rotuloTipo(t, opcao.configuracao.tipoGrafico)}`
              : `${t('graficoTipo')}: ${rotuloTipo(t, opcao.configuracao.tipoGrafico)}`}
          </span>
        </div>
        <LayoutTemplate size={18} color="var(--border)" />
      </div>
    )
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">
              <Sparkles size={18} color="var(--gold-dark)" />
              {titulo}
            </div>
            <div className="modal-subtitle">
              {opcoes.length === 0
                ? (dimensao === 'combinacoes' ? t('modalSubNenhum') : t('modalSubTodasAbertas'))
                : t('modalSubClique')}
            </div>
          </div>
          <span style={{ cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }} onClick={onClose}>
            <X size={20} />
          </span>
        </div>

        <div className="modal-content">
          {modoContextual ? (
            opcoes.length === 0 ? (
              <div style={{ padding: '20px 4px', color: 'var(--text-muted)', textAlign: 'center', fontSize: 12 }}>
                {t('modalCtxVazio')}
              </div>
            ) : (
              opcoes.map(renderOpcao)
            )
          ) : dimensao === 'combinacoes' ? (
            <>
              <div className="modal-divider-title">{t('modalCruzamentos')}</div>
              {opcoes.map(renderOpcao)}
            </>
          ) : (
            <>
              <div className="modal-divider-title">{t('modalPrincipal')}</div>
              {opcoes[0] && renderOpcao(opcoes[0])}
              {opcoes.length > 1 && (
                <>
                  <div className="modal-divider-title" style={{ marginTop: 12 }}>{t('modalCombinarCom')}</div>
                  {opcoes.slice(1).map(renderOpcao)}
                </>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-modal-secondary" onClick={onClose}>{t('cancelar')}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
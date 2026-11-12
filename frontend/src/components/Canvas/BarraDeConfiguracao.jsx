import { useEffect, useRef, useState } from 'react'
import { Clock, Filter, X } from 'lucide-react'
import { FilterBlock } from '../Sidebar/Sidebar'
import { contarAtributos, tiposCompativeis, eixoDeTempoDa } from '../../consulta'
import { useLanguage } from '../../LanguageContext'
import { rotuloFonte, rotuloDimensao, rotuloTipo } from '../../rotulos'

const TODOS_OS_TIPOS_DE_GRAFICO = ['Barras', 'Linhas', 'Pizza', 'Mapa', 'Heatmap', 'Tabela']

export function BarraDeConfiguracao({ configuracao, capacidades, filtrosGlobais, onAlterar }) {
  const [popoverRelogio, setPopoverRelogio] = useState(false)
  const [popoverFiltros, setPopoverFiltros] = useState(false)
  const referenciaRelogio = useRef(null)
  const referenciaFiltros = useRef(null)
  const { t } = useLanguage()

  useEffect(() => {
    if (!popoverRelogio && !popoverFiltros) return
    const aoClicarFora = (evento) => {
      if (popoverRelogio && referenciaRelogio.current && !referenciaRelogio.current.contains(evento.target)) {
        setPopoverRelogio(false)
      }
      if (popoverFiltros && referenciaFiltros.current && !referenciaFiltros.current.contains(evento.target)) {
        setPopoverFiltros(false)
      }
    }
    document.addEventListener('mousedown', aoClicarFora)
    return () => document.removeEventListener('mousedown', aoClicarFora)
  }, [popoverRelogio, popoverFiltros])

  if (!capacidades || !capacidades[configuracao.fonte]) {
    return <div className="viz-card-config" />
  }

  const fonteDefinicao = capacidades[configuracao.fonte]
  const dimensoesDaFonte = (fonteDefinicao.dimensoes ?? []).filter(d => d.id !== 'ano')
  const tiposPossiveis = tiposCompativeis(configuracao)
  const eixo = eixoDeTempoDa(configuracao)
  const eixoEhEdicao = eixo === 'edicao'
  
  // Força o modo 'agrupar' se for edição, senão usa o que estiver
  const modoTempo = eixoEhEdicao ? 'agrupar' : (configuracao.tempo?.modo ?? 'filtrar')
  
  const filtrosLocais = configuracao.filtros || { categoria: [], grupo: [], pais: [], autor: [], rfcNumero: [], meeting: [] }

  const opcoesPrimeiraDimensao = dimensoesDaFonte.filter(d => d.id !== configuracao.agruparPor[1])
  const opcoesSegundaDimensao = dimensoesDaFonte.filter(d => !configuracao.agruparPor.includes(d.id))
  const podeAdicionarSegunda = configuracao.agruparPor.length < 2 && contarAtributos(configuracao) < 3

  function ajustarTipoGrafico(novaConfiguracao) {
    const lista = tiposCompativeis(novaConfiguracao)
    return lista.includes(novaConfiguracao.tipoGrafico) ? novaConfiguracao.tipoGrafico : lista[0]
  }

  function alterarFonte(novaFonte) {
    if (novaFonte === configuracao.fonte) return
    const dimensoesDaNovaFonte = (capacidades[novaFonte]?.dimensoes ?? [])
      .map(d => d.id)
      .filter(id => id !== 'ano')
    let novoAgruparPor = configuracao.agruparPor.filter(id => dimensoesDaNovaFonte.includes(id))
    if (novoAgruparPor.length === 0 && dimensoesDaNovaFonte.length > 0) {
      novoAgruparPor = [dimensoesDaNovaFonte[0]]
    }
    const intermediaria = { ...configuracao, fonte: novaFonte, agruparPor: novoAgruparPor }
    onAlterar({ fonte: novaFonte, agruparPor: novoAgruparPor, tipoGrafico: ajustarTipoGrafico(intermediaria) })
  }

  function alterarDimensao(indice, novaDimensao) {
    if (!novaDimensao) return
    const novoAgruparPor = [...configuracao.agruparPor]
    if (indice < novoAgruparPor.length) novoAgruparPor[indice] = novaDimensao
    else novoAgruparPor.push(novaDimensao)
    const intermediaria = { ...configuracao, agruparPor: novoAgruparPor }
    onAlterar({ agruparPor: novoAgruparPor, tipoGrafico: ajustarTipoGrafico(intermediaria) })
  }

  function removerDimensao(indice) {
    if (configuracao.agruparPor.length <= 1) return
    const novoAgruparPor = configuracao.agruparPor.filter((_, i) => i !== indice)
    const intermediaria = { ...configuracao, agruparPor: novoAgruparPor }
    onAlterar({ agruparPor: novoAgruparPor, tipoGrafico: ajustarTipoGrafico(intermediaria) })
  }

  function alterarModoTempo(novoModo) {
    if (eixoEhEdicao) return // Não permite mudar se for edição
    if (novoModo === modoTempo) return
    if (novoModo === 'agrupar' && configuracao.agruparPor.length + 1 > 3) return

    let novoTempo = { ...configuracao.tempo, modo: novoModo }
    if (novoModo === 'filtrar') {
      novoTempo.anoMinimo = null
      novoTempo.anoMaximo = null
    }
    const intermediaria = { ...configuracao, tempo: novoTempo }
    onAlterar({ tempo: novoTempo, tipoGrafico: ajustarTipoGrafico(intermediaria) })
  }

  function alterarAnoDoFiltro(campo, valor) {
    const numero = valor === '' ? null : parseInt(valor, 10)
    onAlterar({ tempo: { ...configuracao.tempo, [campo]: Number.isFinite(numero) ? numero : null } })
  }

  function alterarTipoGrafico(novoTipo) {
    if (tiposPossiveis.includes(novoTipo)) onAlterar({ tipoGrafico: novoTipo })
  }

  function alterarHerdarFiltros(herdar) {
    if (herdar) {
      onAlterar({ herdarFiltrosGlobais: true })
    } else {
      const filtrosCopiados = {
        categoria: [...(filtrosGlobais.categoria || [])],
        grupo:     [...(filtrosGlobais.grupo || [])],
        pais:      [...(filtrosGlobais.pais || [])],
        autor:     [...(filtrosGlobais.autor || [])],
        rfcNumero: [...(filtrosGlobais.rfcNumero || [])],
        meeting:   [...(filtrosGlobais.meeting || [])],
      }
      onAlterar({ herdarFiltrosGlobais: false, filtros: filtrosCopiados })
    }
  }

  function toggleFiltroLocal(chave, valor) {
    const listaAtual = filtrosLocais[chave] || []
    const novaLista = valor === '__todos__'
      ? []
      : listaAtual.includes(valor)
        ? listaAtual.filter(v => v !== valor)
        : [...listaAtual, valor]
    onAlterar({ filtros: { ...filtrosLocais, [chave]: novaLista } })
  }

  const opcoesDeFiltro = [
    { chave: 'categoria',  titleKey: 'categoria',  options: filtrosGlobais.categoriaOptions },
    { chave: 'grupo',      titleKey: 'grupo',      options: filtrosGlobais.grupoOptions },
    { chave: 'pais',       titleKey: 'pais',       options: filtrosGlobais.paisOptions },
    { chave: 'autor',      titleKey: 'autores',    options: filtrosGlobais.autorOptions },
    { chave: 'meeting',    titleKey: 'meetings',   options: filtrosGlobais.meetingOptions },
    { chave: 'rfcNumero',  titleKey: 'rfcs',       options: filtrosGlobais.rfcOptions },
  ]

  return (
    <div className="viz-card-config" onMouseDown={e => e.stopPropagation()}>
      <select
        className="viz-card-config-select"
        title={t('cfgFonte')}
        value={configuracao.fonte}
        onChange={e => alterarFonte(e.target.value)}
      >
        {Object.entries(capacidades).map(([id, def]) => (
          <option key={id} value={id}>{rotuloFonte(t, id, def.rotulo)}</option>
        ))}
      </select>

      <select
        className="viz-card-config-select"
        title={t('cfgAgruparPor')}
        value={configuracao.agruparPor[0] || ''}
        onChange={e => alterarDimensao(0, e.target.value)}
      >
        {opcoesPrimeiraDimensao.map(d => (
          <option key={d.id} value={d.id}>{d.rotulo}</option>
        ))}
      </select>

      {configuracao.agruparPor.length >= 2 ? (
        <span className="viz-card-config-segunda">
          <select
            className="viz-card-config-select"
            title={t('cfgSegundaDim')}
            value={configuracao.agruparPor[1] || ''}
            onChange={e => alterarDimensao(1, e.target.value)}
          >
            {opcoesSegundaDimensao.map(d => (
              <option key={d.id} value={d.id}>{d.rotulo}</option>
            ))}
          </select>
          <span
            className="viz-card-config-remover"
            title={t('cfgRemoverSegunda')}
            onClick={() => removerDimensao(1)}
          >
            <X size={12} />
          </span>
        </span>
      ) : (
        podeAdicionarSegunda && opcoesSegundaDimensao.length > 0 && (
          <select
            className="viz-card-config-select"
            value=""
            onChange={e => { if (e.target.value) alterarDimensao(1, e.target.value) }}
          >
            <option value="">{t('cfgDividirPor')}</option>
            {opcoesSegundaDimensao.map(d => (
              <option key={d.id} value={d.id}>{d.rotulo}</option>
            ))}
          </select>
        )
      )}

      <div className="viz-card-config-ancora" ref={referenciaRelogio}>
        <span
          className="viz-card-config-icon"
          title={t('cfgTempo')}
          onClick={() => !eixoEhEdicao && setPopoverRelogio(v => !v)}
          style={{ color: eixoEhEdicao || modoTempo === 'agrupar' ? 'var(--gold-dark)' : 'var(--text-muted)' }}
        >
          <Clock size={14} />
        </span>
        {popoverRelogio && !eixoEhEdicao && (
          <div className="viz-card-config-popover viz-card-config-popover-relogio">
            <div
              className={`viz-card-config-option ${modoTempo === 'agrupar' ? 'active' : ''}`}
              onClick={() => alterarModoTempo('agrupar')}
            >
              {t('cfgPorAno')}
            </div>
            <div
              className={`viz-card-config-option ${modoTempo === 'filtrar' ? 'active' : ''}`}
              onClick={() => alterarModoTempo('filtrar')}
            >
              {t('cfgSoFiltrar')}
            </div>
            {modoTempo === 'filtrar' && (
              <div className="viz-card-config-anos">
                <input
                  type="number"
                  className="viz-card-config-input"
                  placeholder={t('cfgAnoMin')}
                  value={configuracao.tempo.anoMinimo ?? ''}
                  onChange={e => alterarAnoDoFiltro('anoMinimo', e.target.value)}
                />
                <input
                  type="number"
                  className="viz-card-config-input"
                  placeholder={t('cfgAnoMax')}
                  value={configuracao.tempo.anoMaximo ?? ''}
                  onChange={e => alterarAnoDoFiltro('anoMaximo', e.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <select
        className="viz-card-config-select"
        title={t('cfgTipoGrafico')}
        value={configuracao.tipoGrafico}
        onChange={e => alterarTipoGrafico(e.target.value)}
      >
        {tiposPossiveis.map(tipo => (
          <option key={tipo} value={tipo}>{rotuloTipo(t, tipo)}</option>
        ))}
      </select>

      <div className="viz-card-config-ancora" ref={referenciaFiltros}>
        <span
          className="viz-card-config-icon"
          title={configuracao.herdarFiltrosGlobais ? t('cfgUsarGlobais') : t('cfgFiltrosProprios')}
          onClick={() => setPopoverFiltros(v => !v)}
          style={{ color: configuracao.herdarFiltrosGlobais ? 'var(--text-muted)' : 'var(--gold-dark)' }}
        >
          <Filter size={14} />
        </span>
        {popoverFiltros && (
          <div className="viz-card-config-popover viz-card-config-popover-filtros">
            <div className="viz-card-config-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={!!configuracao.herdarFiltrosGlobais}
                  onChange={e => alterarHerdarFiltros(e.target.checked)}
                />
                Usar filtros globais
              </label>
            </div>
            {!configuracao.herdarFiltrosGlobais && (
              <div className="viz-card-config-filtros-lista">
                {opcoesDeFiltro.map(({ chave, titleKey, options }) => (
                  <FilterBlock
                    key={chave}
                    titleKey={titleKey}
                    options={options || []}
                    selected={filtrosLocais[chave] || []}
                    todosSelected={(filtrosLocais[chave] || []).length === 0}
                    onToggle={(valor) => toggleFiltroLocal(chave, valor)}
                    onClickTodos={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
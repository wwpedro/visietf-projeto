// src/consulta.js
import { api } from './api'

export const DIMENSOES_DE_TEMPO = ['ano', 'edicao']
const DIMENSOES_ORDINAIS = ['ano', 'edicao']

const EIXO_DE_TEMPO_POR_FONTE = {
  rfc: 'ano',
  draft: 'ano',
  meeting: 'edicao',
}

function juntarComVirgula(lista) {
  return lista && lista.length ? lista.join('||') : undefined
}

function extrairNumeros(lista) {
  if (!lista || !lista.length) return undefined
  return lista.map(valor => String(valor).replace(/\D/g, '')).filter(Boolean).join('||')
}

export function eixoDeTempoDa(configuracao) {
  return configuracao.tempo?.eixo
      ?? EIXO_DE_TEMPO_POR_FONTE[configuracao.fonte]
      ?? 'ano'
}

export function criarConfiguracaoPadrao(fonte, agruparPor, modoDeTempo, tipoGrafico, eixoDeTempo) {
  let modoFinal = modoDeTempo
  if (fonte === 'meeting' && agruparPor.includes('edicao')) {
    modoFinal = 'agrupar'
  }

  const contemDimensaoOrdinal = agruparPor.some(d => DIMENSOES_ORDINAIS.includes(d))
  const limite = (contemDimensaoOrdinal || modoFinal === 'agrupar') ? 500 : 20

  const eixo = eixoDeTempo ?? EIXO_DE_TEMPO_POR_FONTE[fonte] ?? 'ano'

  return {
    fonte,
    agruparPor,
    tempo: { modo: modoFinal, eixo, anoMinimo: null, anoMaximo: null },
    herdarFiltrosGlobais: true,
    filtros: { categoria: [], grupo: [], pais: [], autor: [], rfcNumero: [], meeting: [], draft: [] },
    tipoGrafico,
    limite,
  }
}

export function contarAtributos(configuracao) {
  const eixo = eixoDeTempoDa(configuracao)
  const modo = configuracao.tempo?.modo ?? 'filtrar'
  const eixoJaEmAgrupar = configuracao.agruparPor.includes(eixo)
  const atributosDeTempo = (modo === 'agrupar' && !eixoJaEmAgrupar) ? 1 : 0
  return configuracao.agruparPor.length + atributosDeTempo
}

export function tiposCompativeis(configuracao) {
  const eixo = eixoDeTempoDa(configuracao)
  const usaTempo = configuracao.tempo.modo === 'agrupar'
  const eixoJaEmAgrupar = configuracao.agruparPor.includes(eixo)
  const total = contarAtributos(configuracao)

  if (total >= 3 || total === 0) return ['Tabela']

  if (total === 1) {
    if (usaTempo && !eixoJaEmAgrupar && configuracao.agruparPor.length === 0) {
      return ['Linhas', 'Barras']
    }
    const unica = eixoJaEmAgrupar ? eixo : configuracao.agruparPor[0]
    const tipos = []
    if (DIMENSOES_ORDINAIS.includes(unica)) tipos.push('Linhas')
    tipos.push('Barras', 'Pizza')
    if (unica === 'pais') tipos.push('Mapa')
    return tipos
  }

  return ['Heatmap', 'Barras', 'Linhas']
}

export function construirParametrosDaConsulta(configuracao, filtrosGlobais) {
  const filtros = configuracao.herdarFiltrosGlobais
    ? {
        categoria: filtrosGlobais.categoria, grupo: filtrosGlobais.grupo, pais: filtrosGlobais.pais,
        autor: filtrosGlobais.autor, rfcNumero: filtrosGlobais.rfcNumero, meeting: filtrosGlobais.meeting,
        draft: filtrosGlobais.draft,
      }
    : configuracao.filtros

  const modoDeTempo = configuracao.tempo.modo === 'ignorar' ? 'filtrar' : configuracao.tempo.modo
  const eixoDeTempo = eixoDeTempoDa(configuracao)
  const eixoJaEmAgrupar = configuracao.agruparPor.includes(eixoDeTempo)

  const dimensoesSemTempo = configuracao.agruparPor.filter(d => d !== eixoDeTempo)

  const dimensoesEnviadas = (modoDeTempo === 'agrupar' && !eixoJaEmAgrupar)
    ? [eixoDeTempo, ...dimensoesSemTempo]
    : configuracao.agruparPor

  // CORREÇÃO: Sempre envia os anos (do cartão ou do slider global)
  const anoMinimo = configuracao.tempo.anoMinimo ?? filtrosGlobais.yearMin
  const anoMaximo = configuracao.tempo.anoMaximo ?? filtrosGlobais.yearMax

  return {
    fonte: configuracao.fonte,
    agrupar_por: dimensoesEnviadas.join(','),
    year_min: anoMinimo,
    year_max: anoMaximo,
    category: juntarComVirgula(filtros.categoria),
    wg: juntarComVirgula(filtros.grupo),
    pais: juntarComVirgula(filtros.pais),
    autor: juntarComVirgula(filtros.autor),
    numero: extrairNumeros(filtros.rfcNumero),
    edition: extrairNumeros(filtros.meeting),
    draft: juntarComVirgula(filtros.draft),
    limite: configuracao.limite,
  }
}

export async function executarConsulta(configuracao, filtrosGlobais) {
  const parametros = construirParametrosDaConsulta(configuracao, filtrosGlobais)
  return api.consulta(parametros)
}

export function converterRespostaParaDados(resposta, tipoGrafico) {
  const linhas = resposta.linhas ?? []
  const dimensoes = resposta.dimensoes ?? []

  if (tipoGrafico === 'Tabela') {
    return { dados: linhas, chavesDeSerie: [], colunas: [...dimensoes, 'total'] }
  }

  if (dimensoes.length === 1) {
    const dados = linhas.map(linha => ({ x: String(linha[dimensoes[0]]), y: Number(linha.total) }))
    if (DIMENSOES_ORDINAIS.includes(dimensoes[0])) {
      dados.sort((a, b) => Number(a.x) - Number(b.x))
    }
    return { dados, chavesDeSerie: [] }
  }

  const [primeiraDimensao, segundaDimensao] = dimensoes

  if (tipoGrafico === 'Heatmap') {
    const dados = linhas.map(linha => ({
      year: String(linha[primeiraDimensao]),
      category: String(linha[segundaDimensao]),
      total: Number(linha.total),
    }))
    return { dados, chavesDeSerie: [] }
  }

  const totalPorSerie = new Map()
  linhas.forEach(linha => {
    const chave = String(linha[segundaDimensao])
    totalPorSerie.set(chave, (totalPorSerie.get(chave) ?? 0) + Number(linha.total))
  })
  const chavesDeSerie = [...totalPorSerie.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([chave]) => chave)

  const registrosPorX = new Map()
  linhas.forEach(linha => {
    const chave = String(linha[segundaDimensao])
    if (!chavesDeSerie.includes(chave)) return
    const valorDoEixoX = String(linha[primeiraDimensao])
    const registro = registrosPorX.get(valorDoEixoX) ?? { x: valorDoEixoX }
    chavesDeSerie.forEach(serie => { if (registro[serie] === undefined) registro[serie] = 0 })
    registro[chave] = Number(linha.total)
    registrosPorX.set(valorDoEixoX, registro)
  })

  const dados = [...registrosPorX.values()]
  if (DIMENSOES_ORDINAIS.includes(primeiraDimensao)) {
    dados.sort((a, b) => Number(a.x) - Number(b.x))
  }
  return { dados, chavesDeSerie }
}

const CONFIGURACAO_POR_METRICA = {
  'rfcs-por-ano':                (tipo) => criarConfiguracaoPadrao('rfc', [], 'agrupar', tipo),
  'rfcs-por-categoria':          (tipo) => criarConfiguracaoPadrao('rfc', ['categoria'], 'filtrar', tipo),
  'rfcs-heatmap':                (tipo) => criarConfiguracaoPadrao('rfc', ['categoria'], 'agrupar', tipo),
  'top-autores':                 (tipo) => criarConfiguracaoPadrao('rfc', ['autor'], 'filtrar', tipo),
  'drafts-por-ano':              (tipo) => criarConfiguracaoPadrao('draft', [], 'agrupar', tipo),
  'drafts-status':               (tipo) => criarConfiguracaoPadrao('draft', ['status'], 'filtrar', tipo),
  'drafts-por-pais':             (tipo) => ({ ...criarConfiguracaoPadrao('draft', ['pais'], 'filtrar', tipo), limite: 30 }),
  'drafts-keywords':             (tipo) => ({ ...criarConfiguracaoPadrao('draft', ['keyword'], 'filtrar', tipo), limite: 25 }),
  'drafts-por-wg':               (tipo) => criarConfiguracaoPadrao('draft', ['grupo'], 'filtrar', tipo),
  'organizacoes-ranking':        (tipo) => criarConfiguracaoPadrao('rfc', ['organizacao'], 'filtrar', tipo),
  'organizacoes-ranking-drafts': (tipo) => criarConfiguracaoPadrao('draft', ['organizacao'], 'filtrar', tipo),
  'attendees-por-pais':          (tipo) => ({ ...criarConfiguracaoPadrao('meeting', ['pais'], 'filtrar', tipo), limite: 30 }),
  'attendees-por-edicao':        (tipo) => criarConfiguracaoPadrao('meeting', ['edicao'], 'agrupar', tipo),
  'attendees-reg-type':          (tipo) => criarConfiguracaoPadrao('meeting', ['tipo_credenciamento'], 'filtrar', tipo),
}

export function configuracaoEquivalenteParaMetrica(metricId, tipoDesejado) {
  const fabrica = CONFIGURACAO_POR_METRICA[metricId]
  if (!fabrica) return null
  const configuracao = fabrica(tipoDesejado)
  const tiposValidos = tiposCompativeis(configuracao)
  if (!tiposValidos.includes(configuracao.tipoGrafico)) {
    configuracao.tipoGrafico = tiposValidos[0]
  }
  return configuracao
}
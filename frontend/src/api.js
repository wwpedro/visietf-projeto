// src/api.js
//const API_BASE = 'http://localhost:8000'
const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function apiGet(path, params = {}) {
  // CORREÇÃO: Adicionado window.location.origin para resolver a URL relativa
  const url = new URL(API_BASE + path, window.location.origin)
  
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
  })
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Erro ${res.status} ao chamar ${path}`)
  }
  return res.json()
}

export const api = {
  rfcsPorAno:  (params) => apiGet('/rfcs/por-ano', params),
  categorias:  (params) => apiGet('/rfcs/categorias', params),
  topAutores:  (params) => apiGet('/rfcs/top-autores', params),
  grupos:      ()       => apiGet('/rfcs/grupos'),
  gruposUnificados: ()  => apiGet('/rfcs/grupos-unificados'),
  porEdicao:   (params) => apiGet('/meetings/por-edicao', params),
  porPais:     (params) => apiGet('/meetings/por-pais', params),
  edicoes:     ()       => apiGet('/meetings/edicoes'),
  locais:      ()       => apiGet('/meetings/locais'), 
  heatmapCategoriaAno: (params) => apiGet('/rfcs/heatmap-categoria-ano', params),

  draftsPorAno:  (params) => apiGet('/drafts/por-ano', params),
  draftsStatus:  (params) => apiGet('/drafts/status', params),
  draftsPorPais: (params) => apiGet('/drafts/por-pais', params),
  draftsKeywords:(params) => apiGet('/drafts/keywords', params),
  draftsPorWg:      (params) => apiGet('/drafts/por-wg', params),
  versoesPorDraft:  (params) => apiGet('/drafts/versoes-por-draft', params),
  draftsLista:      (params) => apiGet('/drafts/lista', params),

  organizacoesRanking:       (params) => apiGet('/organizacoes/ranking', params),
  organizacoesRankingDrafts: (params) => apiGet('/organizacoes/ranking-drafts', params),
  organizacoesEmAmbos:       (params) => apiGet('/organizacoes/organizacoes-em-ambos', params),

  regType: (params) => apiGet('/meetings/reg-type', params),

  coautoria: (params) => apiGet('/network/coautoria', params),

  autoresLista: (params) => apiGet('/rfcs/autores-lista', params),
  numerosLista: (params) => apiGet('/rfcs/numeros-lista', params),

  // Fase 2 — endpoint genérico de consulta e catálogo de capacidades
  consulta:    (parametros) => apiGet('/consulta', parametros),
  capacidades: ()           => apiGet('/consulta/capacidades'),
}
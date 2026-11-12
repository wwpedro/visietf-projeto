// src/metrics.js
import { api } from './api'

function csv(arr) {
  return arr && arr.length ? arr.join('||') : undefined
}

function csvNumero(arr) {
  if (!arr || !arr.length) return undefined
  return arr.map(v => String(v).replace(/\D/g, '')).join(',')
}

export const METRICS = [
  // ── RFCs ──
  {
    id: 'rfcs-por-ano',
    label: 'RFCs por ano',
    group: 'RFCs',
    filtros: ['categoria', 'grupo', 'autor', 'rfcNumero', 'pais'],
    chartTypes: ['Barras', 'Linhas'],
    fetch: (f) => api.rfcsPorAno({
      year_min: f.yearMin, year_max: f.yearMax,
      category: csv(f.categoria), wg: csv(f.grupo),
      autor: csv(f.autor), numero: csvNumero(f.rfcNumero), pais: csv(f.pais),
    }),
    mapData: (rows) => rows.map(r => ({ x: r.year, y: r.total })),
  },
  {
    id: 'rfcs-por-categoria',
    label: 'RFCs por categoria',
    group: 'RFCs',
    filtros: ['categoria', 'grupo', 'pais'],
    chartTypes: ['Pizza', 'Barras'],
    fetch: (f) => api.categorias({
      year_min: f.yearMin, year_max: f.yearMax,
      category: csv(f.categoria), wg: csv(f.grupo), pais: csv(f.pais),
    }),
    mapData: (rows) => rows.map(r => ({ x: r.category, y: r.total })),
  },
  {
    id: 'rfcs-heatmap',
    label: 'RFCs: categoria × ano',
    group: 'RFCs',
    filtros: ['grupo', 'pais'],
    chartTypes: ['Heatmap'],
    fetch: (f) => api.heatmapCategoriaAno({
      year_min: f.yearMin, year_max: f.yearMax, wg: csv(f.grupo),
      pais: csv(f.pais),
    }),
    mapData: (rows) => rows,
  },
  {
    id: 'top-autores',
    label: 'Autores mais produtivos (RFC)',
    group: 'RFCs',
    filtros: ['categoria', 'grupo', 'pais'],
    chartTypes: ['Barras'],
    fetch: (f) => api.topAutores({
      year_min: f.yearMin, year_max: f.yearMax,
      category: csv(f.categoria), wg: csv(f.grupo), pais: csv(f.pais), limit: 20,
    }),
    mapData: (rows) => rows.map(r => ({ x: r.autor, y: r.total })),
  },
  
  // NOTA: Métrica 'rfcs-por-grupo' foi REMOVIDA

  // ── Drafts ──
  {
    id: 'drafts-por-ano',
    label: 'Drafts por ano',
    group: 'Drafts',
    filtros: ['grupo', 'pais'],
    chartTypes: ['Barras', 'Linhas'],
    fetch: (f) => api.draftsPorAno({
      year_min: f.yearMin, year_max: f.yearMax,
      wg: csv(f.grupo), pais: csv(f.pais),
    }),
    mapData: (rows) => rows.map(r => ({ x: r.year, y: r.total })),
  },
  {
    id: 'drafts-status',
    label: 'Status pretendido dos drafts',
    group: 'Drafts',
    filtros: ['grupo', 'pais'],
    chartTypes: ['Pizza', 'Barras'],
    fetch: (f) => api.draftsStatus({
      year_min: f.yearMin, year_max: f.yearMax, wg: csv(f.grupo), pais: csv(f.pais),
    }),
    mapData: (rows) => rows.map(r => ({ x: r.status, y: r.total })),
  },
  {
    id: 'drafts-por-pais',
    label: 'Drafts por país (autoria)',
    group: 'Drafts',
    filtros: ['grupo', 'pais'],
    chartTypes: ['Barras', 'Mapa'],
    fetch: (f) => api.draftsPorPais({
      year_min: f.yearMin, year_max: f.yearMax, wg: csv(f.grupo), pais: csv(f.pais),
    }),
    mapData: (rows) => rows.map(r => ({ x: r.country, y: r.total })),
  },
  {
    id: 'drafts-keywords',
    label: 'Palavras-chave mais usadas',
    group: 'Drafts',
    filtros: ['grupo', 'pais'],
    chartTypes: ['Barras', 'Pizza'],
    fetch: (f) => api.draftsKeywords({
      year_min: f.yearMin, year_max: f.yearMax, wg: csv(f.grupo), pais: csv(f.pais), limit: 25,
    }),
    mapData: (rows) => rows.map(r => ({ x: r.keyword, y: r.total })),
  },
  {
    id: 'drafts-por-wg',
    label: 'Drafts por Working Group',
    group: 'Drafts',
    filtros: ['grupo', 'pais'],
    chartTypes: ['Barras', 'Pizza'],
    fetch: (f) => api.draftsPorWg({
      year_min: f.yearMin, year_max: f.yearMax, pais: csv(f.pais), wg: csv(f.grupo), limit: 20,
    }),
    mapData: (rows) => rows.map(r => ({ x: r.wg, y: r.total })),
  },
  {
    id: 'versoes-por-draft',
    label: 'Drafts com mais revisões',
    group: 'Drafts',
    filtros: ['grupo', 'pais'],
    chartTypes: ['Barras'],
    fetch: (f) => api.versoesPorDraft({
      year_min: f.yearMin, year_max: f.yearMax, wg: csv(f.grupo), pais: csv(f.pais), limit: 20,
    }),
    mapData: (rows) => rows.map(r => ({ x: r.draft, y: r.total })),
  },

  // ── Organizações ──
  {
    id: 'organizacoes-ranking',
    label: 'Organizações mais produtivas (RFC)',
    group: 'Organizações',
    filtros: ['categoria', 'grupo', 'pais'],
    chartTypes: ['Barras'],
    fetch: (f) => api.organizacoesRanking({
      year_min: f.yearMin, year_max: f.yearMax,
      category: csv(f.categoria), wg: csv(f.grupo), pais: csv(f.pais), limit: 20,
    }),
    mapData: (rows) => rows.map(r => ({ x: r.organizacao, y: r.total })),
  },
  {
    id: 'organizacoes-ranking-drafts',
    label: 'Organizações mais produtivas (Drafts)',
    group: 'Organizações',
    filtros: ['grupo', 'pais'],
    chartTypes: ['Barras'],
    fetch: (f) => api.organizacoesRankingDrafts({
      year_min: f.yearMin, year_max: f.yearMax, wg: csv(f.grupo), pais: csv(f.pais), limit: 20,
    }),
    mapData: (rows) => rows.map(r => ({ x: r.organizacao, y: r.total })),
  },
  {
    id: 'organizacoes-em-ambos',
    label: 'Organizações em RFCs e Meetings',
    group: 'Organizações',
    filtros: [],
    chartTypes: ['Barras'],
    fetch: () => api.organizacoesEmAmbos({ limit: 20 }),
    mapData: (rows) => rows.map(r => ({ x: r.organizacao, y: r.rfcs })),
  },

  // ── Meetings ──
  {
    id: 'attendees-por-pais',
    label: 'Participantes de meetings por país',
    group: 'Meetings',
    filtros: ['pais', 'meeting'],
    chartTypes: ['Barras', 'Mapa'],
    fetch: (f) => api.porPais({
      year_min: f.yearMin, year_max: f.yearMax,
      edition: f.meeting?.length ? Number(String(f.meeting[0]).replace(/\D/g, '')) || undefined : undefined,
      pais: csv(f.pais),
    }),
    mapData: (rows) => rows.map(r => ({ x: r.country, y: r.total })),
  },
  {
    id: 'attendees-por-edicao',
    label: 'Participantes por edição do IETF',
    group: 'Meetings',
    filtros: ['pais', 'meeting'],
    chartTypes: ['Barras', 'Linhas'],
    fetch: (f) => api.porEdicao({
      year_min: f.yearMin, year_max: f.yearMax,
      edition: f.meeting?.length ? Number(String(f.meeting[0]).replace(/\D/g, '')) || undefined : undefined,
      pais: csv(f.pais),
    }),
    mapData: (rows) => rows.map(r => ({ x: `IETF ${r.edition}`, y: r.total })),
  },
  {
    id: 'attendees-reg-type',
    label: 'Tipo de credenciamento dos participantes',
    group: 'Meetings',
    filtros: ['pais', 'meeting'],
    chartTypes: ['Pizza', 'Barras'],
    fetch: (f) => api.regType({
      year_min: f.yearMin, year_max: f.yearMax,
      edition: f.meeting?.length ? Number(String(f.meeting[0]).replace(/\D/g, '')) || undefined : undefined,
      pais: csv(f.pais),
    }),
    mapData: (rows) => rows.map(r => ({ x: r.tipo, y: r.total })),
  },

  // ── Rede ──
  {
    id: 'coautoria',
    label: 'Rede de coautoria entre autores',
    group: 'Rede',
    filtros: ['categoria', 'grupo', 'pais'],
    chartTypes: ['Rede'],
    fetch: (f) => api.coautoria({
      year_min: f.yearMin, year_max: f.yearMax,
      category: csv(f.categoria), wg: csv(f.grupo),
      pais: csv(f.pais),
      min_colaboracoes: 2, limit: 150,
    }),
    mapData: (data) => ({
      nodes: (data?.nodes ?? []).map(n => ({ id: n.id, name: n.id })),
      links: (data?.edges ?? []).map(e => ({ source: e.source, target: e.target, value: e.weight }))
    }),
  },
]

export function metricasParaChart(tipo) {
  return METRICS.filter(m => m.chartTypes.includes(tipo))
}

export function metricasAgrupadas() {
  const grupos = {}
  METRICS.forEach(m => {
    if (!grupos[m.group]) grupos[m.group] = []
    grupos[m.group].push(m)
  })
  return grupos
}
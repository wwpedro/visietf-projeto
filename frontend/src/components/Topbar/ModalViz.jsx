import { useState } from 'react'
import { X, Sparkles, LayoutDashboard, ChevronRight } from 'lucide-react'
import { useLanguage } from '../../LanguageContext'
import { METRICS } from '../../metrics'

const VIZ_TYPES = ['Barras', 'Linhas', 'Pizza', 'Rede', 'Mapa', 'Heatmap']

// Dashboards pré-definidos para o botão "Prontos"
const READY_MADE = [
  {
    id: 'rfcs-overview',
    title: 'Visão Geral de RFCs',
    desc: 'Evolução temporal, categorias e autores.',
    viz: [
      { tipo: 'Linhas', metricId: 'rfcs-por-ano' },
      { tipo: 'Pizza', metricId: 'rfcs-por-categoria' },
      { tipo: 'Barras', metricId: 'top-autores' }
    ]
  },
  {
    id: 'meetings-overview',
    title: 'Visão Geral de Meetings',
    desc: 'Distribuição geográfica e histórico.',
    viz: [
      { tipo: 'Mapa', metricId: 'attendees-por-pais' },
      { tipo: 'Barras', metricId: 'attendees-por-edicao' }
    ]
  }
]

export function ModalViz({ isOpen, onClose, onSelectViz, filters }) {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState('explorar')
  const [selectedGroup, setSelectedGroup] = useState('RFCs')

  if (!isOpen) return null

  const grupos = [...new Set(METRICS.map(m => m.group))]
  const metricasDoGrupo = METRICS.filter(m => m.group === selectedGroup)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={onClose}>
      <div style={{ background: '#fff', width: '90%', maxWidth: 700, borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #EAEAEA' }}>
          <div style={{ display: 'flex', gap: 20 }}>
            <span style={{ fontWeight: 700, cursor: 'pointer', borderBottom: activeTab === 'explorar' ? '2px solid #C49830' : 'none', paddingBottom: 4 }} onClick={() => setActiveTab('explorar')}>Explorar Dados</span>
            <span style={{ fontWeight: 700, cursor: 'pointer', borderBottom: activeTab === 'prontos' ? '2px solid #C49830' : 'none', paddingBottom: 4 }} onClick={() => setActiveTab('prontos')}>{t('prontos')}</span>
          </div>
          <X size={20} style={{ cursor: 'pointer', color: '#666' }} onClick={onClose} />
        </div>

        <div style={{ display: 'flex', height: 400 }}>
          {activeTab === 'explorar' ? (
            <>
              {/* Menu Lateral de Grupos */}
              <div style={{ width: 180, background: '#F9F9F9', borderRight: '1px solid #EAEAEA', padding: '10px 0' }}>
                {grupos.map(g => (
                  <div key={g} onClick={() => setSelectedGroup(g)} style={{ padding: '10px 20px', cursor: 'pointer', fontWeight: selectedGroup === g ? 700 : 400, color: selectedGroup === g ? '#C49830' : '#333', background: selectedGroup === g ? '#FFF' : 'transparent' }}>
                    {g}
                  </div>
                ))}
              </div>

              {/* Lista de Métricas Recomendadas */}
              <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} color="#C49830" /> {t('sugestoes')} {selectedGroup}
                </h3>
                
                {metricasDoGrupo.map(m => (
                  <div key={m.id} style={{ border: '1px solid #EAEAEA', borderRadius: 8, padding: 12, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{m.label}</div>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Formatos: {m.chartTypes.join(', ')}</div>
                    </div>
                    <button 
                      onClick={() => { onSelectViz([{ tipo: m.chartTypes[0], metricId: m.id }]); onClose(); }}
                      style={{ background: '#FBC663', border: 'none', borderRadius: 4, padding: '6px 12px', fontWeight: 700, cursor: 'pointer', color: '#5C3D00', display: 'flex', alignItems: 'center', gap: 4 }}>
                      Add <ChevronRight size={14} />
                    </button>
                  </div>
                ))}

                <div style={{ marginTop: 30, paddingTop: 20, borderTop: '1px dashed #EAEAEA' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 14, color: '#555' }}>{t('combinarCom')}</h4>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['País', 'Grupo', 'Ano'].map(comb => (
                      <button key={comb} 
                        onClick={() => { 
                          // Exemplo de combinação: Adiciona a métrica principal E a de ano
                          onSelectViz([
                            { tipo: 'Pizza', metricId: 'rfcs-por-categoria' },
                            { tipo: 'Barras', metricId: 'rfcs-por-ano' }
                          ]); 
                          onClose(); 
                        }}
                        style={{ background: '#FFF', border: '1px solid #CCC', padding: '6px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer' }}>
                        + {comb}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Aba de Dashboards Prontos */
            <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <LayoutDashboard size={18} color="#C49830" /> {t('prontos')}
              </h3>
              {READY_MADE.map(dash => (
                <div key={dash.id} style={{ border: '1px solid #EAEAEA', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{dash.title}</div>
                  <div style={{ fontSize: 13, color: '#666', margin: '4px 0 12px 0' }}>{dash.desc}</div>
                  <button 
                    onClick={() => { onSelectViz(dash.viz); onClose(); }}
                    style={{ background: '#1A1A1A', color: '#FFF', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                    {t('adicionar')} ({dash.viz.length} gráficos)
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
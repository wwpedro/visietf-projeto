export function rotulo(t, chave, fallback) {
  const v = t(chave)
  return v && v !== chave ? v : fallback
}
export const rotuloFonte = (t, id, fallback) => rotulo(t, `fonte_${id}`, fallback ?? id)
export const rotuloDimensao = (t, id, fallback) => rotulo(t, `dim_${id}`, fallback ?? id)
export const rotuloTipo = (t, tipo) => rotulo(t, `tipo_${tipo}`, tipo)

export function tituloDaConfiguracao(t, configuracao, capacidades) {
  if (!configuracao) return rotulo(t, 'visualizacao', 'Visualização')
  const fonte = capacidades?.[configuracao.fonte]
  const prefixo = rotuloFonte(t, configuracao.fonte, fonte?.rotulo)
  const rotulos = configuracao.agruparPor
    .filter(id => id !== 'ano')
    .map(id => rotuloDimensao(t, id, fonte?.dimensoes?.find(d => d.id === id)?.rotulo))
  if (configuracao.tempo?.modo === 'agrupar') rotulos.unshift(rotuloDimensao(t, 'ano', 'Ano'))
  return rotulos.length ? `${prefixo} ${t('por')} ${rotulos.join(' × ')}` : prefixo
}
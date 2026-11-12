import { createContext, useContext, useState } from 'react'
import { TRANSLATIONS } from './i18n'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('pt-br')
  const t = (key) => TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS['pt-br'][key] ?? key
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
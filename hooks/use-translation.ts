"use client"

import { useState, useEffect } from "react"
import translations from "@/lib/translations"

// Define available languages
type AvailableLanguages = keyof typeof translations
type TranslationKey = keyof typeof translations.en

// Type for the translation hook return value
interface TranslationHook {
  t: (key: string) => string
  currentLanguage: AvailableLanguages
  setLanguage: (lang: AvailableLanguages) => void
}

export function useTranslation(): TranslationHook {
  const [currentLanguage, setCurrentLanguage] = useState<AvailableLanguages>("en")

  // Load language preference from localStorage on initial render
  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem("language") as AvailableLanguages
      if (savedLanguage && translations[savedLanguage]) {
        setCurrentLanguage(savedLanguage)
      }
    } catch (error) {
      console.error("Error loading language preference:", error)
    }
  }, [])

  const t = (key: string): string => {
    if (!key) return ""
    try {
      const translation = translations[currentLanguage]?.[key as TranslationKey]
      return translation || translations.en[key as TranslationKey] || key
    } catch (error) {
      console.error(`Translation error for key '${key}':`, error)
      return key
    }
  }

  const setLanguage = (lang: AvailableLanguages): void => {
    if (translations[lang]) {
      try {
        setCurrentLanguage(lang)
        localStorage.setItem("language", lang)
      } catch (error) {
        console.error("Error saving language preference:", error)
      }
    } else {
      console.warn(`Invalid language: ${lang}`)
    }
  }

  return { t, currentLanguage, setLanguage }
}

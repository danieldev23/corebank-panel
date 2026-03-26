import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import vi from './locales/vi.json';

const messages = {
  en,
  vi,
};

const savedLocale = localStorage.getItem('locale') || 'vi';

const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages,
});

export default i18n;

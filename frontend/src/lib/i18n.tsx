import { createContext, useContext, useState, ReactNode } from "react";

export type Lang = "en" | "hi" | "mr";

const translations: Record<string, Record<Lang, string>> = {
  "nav.home": { en: "Home", hi: "होम", mr: "होम" },
  "nav.dashboard": { en: "Dashboard", hi: "डैशबोर्ड", mr: "डॅशबोर्ड" },
  "nav.sos": { en: "SOS", hi: "एसओएस", mr: "एसओएस" },
  "nav.report": { en: "Report", hi: "रिपोर्ट", mr: "अहवाल" },
  "nav.police": { en: "Police Stations", hi: "पुलिस स्टेशन", mr: "पोलीस स्टेशन" },
  "nav.settings": { en: "Settings", hi: "सेटिंग्स", mr: "सेटिंग्ज" },
  "nav.login": { en: "Login", hi: "लॉगिन", mr: "लॉगिन" },
  "nav.logout": { en: "Logout", hi: "लॉगआउट", mr: "लॉगआउट" },
  "hero.title": { en: "Navigate Safely, Always", hi: "हमेशा सुरक्षित नेविगेट करें", mr: "सुरक्षितपणे नेव्हिगेट करा, नेहमी" },
  "hero.subtitle": { en: "AI-powered safety navigation for women. Real-time alerts, safe routes, and emergency SOS — all in one app.", hi: "महिलाओं के लिए AI-संचालित सुरक्षा नेविगेशन।", mr: "महिलांसाठी AI-संचालित सुरक्षा नेव्हिगेशन." },
  "hero.cta": { en: "Get Started", hi: "शुरू करें", mr: "सुरू करा" },
  "sos.title": { en: "Emergency SOS", hi: "आपातकालीन SOS", mr: "आणीबाणी SOS" },
  "sos.police": { en: "Police", hi: "पुलिस", mr: "पोलीस" },
  "sos.ambulance": { en: "Ambulance", hi: "एम्बुलेंस", mr: "रुग्णवाहिका" },
  "sos.nirbhaya": { en: "Nirbhaya Squad", hi: "निर्भया दस्ता", mr: "निर्भया पथक" },
  "settings.language": { en: "Language", hi: "भाषा", mr: "भाषा" },
  "settings.theme": { en: "Theme", hi: "थीम", mr: "थीम" },
  "settings.contacts": { en: "Trusted Contacts", hi: "विश्वसनीय संपर्क", mr: "विश्वासू संपर्क" },
  "report.title": { en: "Report an Incident", hi: "घटना की रिपोर्ट करें", mr: "घटना नोंदवा" },
  "report.anonymous": { en: "Report Anonymously", hi: "गुमनाम रिपोर्ट", mr: "अनामिक अहवाल" },
};

const I18nContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}>({ lang: "en", setLang: () => {}, t: (k) => k });

export const useI18n = () => useContext(I18nContext);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem("sr-lang") as Lang) || "en";
  });

  const changeLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem("sr-lang", l);
  };

  const t = (key: string) => translations[key]?.[lang] || key;

  return (
    <I18nContext.Provider value={{ lang, setLang: changeLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

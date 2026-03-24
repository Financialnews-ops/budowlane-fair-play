import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Search, ShieldCheck, AlertTriangle, XCircle, CheckCircle2, Building2, MapPin, Phone, Star, FileText, Landmark, Users, Wrench, Mail, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Initialize Gemini API lazily inside the search handler to ensure it uses the latest key


interface VerificationCategory {
  status: string;
  isPositive: boolean;
}

interface Company {
  name?: string;
  description?: string;
  fullAddress?: string;
  location?: string;
  locationType?: 'city' | 'surroundings';
  phone?: string;
  contact?: string;
  email?: string;
  reviewSources?: string[];
  verification?: {
    ceidgKrs?: VerificationCategory;
    vatWhitelist?: VerificationCategory;
    debtRegisters?: VerificationCategory;
    industryPortals?: VerificationCategory;
    licenses?: VerificationCategory;
  };
  trustScore?: number;
  summary?: string;
}

const CITIES = [
  'Kraków', 'Katowice', 'Rzeszów', 'Lublin', 'Opole', 'Wrocław',
  'Kielce', 'Łódź', 'Warszawa', 'Białystok', 'Poznań', 'Gorzów Wlkp.',
  'Bydgoszcz', 'Toruń', 'Olsztyn', 'Gdańsk', 'Gdynia', 'Szczecin'
];

const TASKS_BY_INDUSTRY: Record<string, string[]> = {
  'Budownictwo': [
    'Fundamenty',
    'Mury i ściany',
    'Stropy',
    'Konstrukcje stalowe',
    'Elewacje',
    'Wyburzenia',
    'Roboty ziemne',
    'Nadzór budowlany',
    'Kierownik budowy'
  ],
  'Elektryka': [
    'Instalacje od nowa',
    'Modernizacja',
    'Tablica rozdzielcza',
    'Oświetlenie LED',
    'Instalacja alarmowa',
    'Monitoring CCTV',
    'Smart Home',
    'Pomiar instalacji',
    'Awaryjne naprawy'
  ],
  'Hydraulika': [
    'Instalacje wod-kan',
    'Wymiana pionów',
    'Ogrzewanie podłogowe',
    'Wymiana grzejników',
    'Przyłącze wodne',
    'Drenaż i odprowadzenie wody',
    'Awarie i przecieki'
  ],
  'Instalacje grzewcze': [
    'Pompy ciepła',
    'Kotłownia gazowa',
    'Kotłownia na pellet',
    'Rekuperacja',
    'Ogrzewanie podłogowe',
    'Regulacja C.O.',
    'Kolektory słoneczne'
  ],
  'Wykończenia wnętrz': [
    'Tynki gipsowe',
    'Malowanie',
    'Kładzenie płytek ceramicznych',
    'Wykończenie podłóg',
    'Gładzenie i szpachlowanie',
    'Sufity GK',
    'Remont łazienki',
    'Remont kuchni'
  ],
  'Dachy': [
    'Nowy dach płaski',
    'Więźby dachowe',
    'Wymiana pokrycia',
    'Naprawy',
    'Orynnowanie',
    'Okna połaciowe',
    'Obróbki blacharskie',
    'Podbitki'
  ],
  'Ogrody i otoczenie': [
    'Mała architektura',
    'Projekt ogrodu',
    'Projekt małej architektury',
    'Zagospodarowanie terenu',
    'Nasadzenia',
    'Trawniki',
    'Nawadnianie automatyczne',
    'Systemy Smart',
    'Ogrodzenia',
    'Podłoże',
    'Kostka brukowa',
    'Tarasy',
    'Alejki i place zabaw'
  ],
  'Okna i drzwi': [
    'Montaż okien PVC',
    'Montaż okien drewnianych',
    'Wymiana okien',
    'Drzwi wejściowe',
    'Drzwi wewnętrzne',
    'Bramy garażowe',
    'Automatyka bram garażowych',
    'Żaluzje i rolety',
    'Serwis'
  ],
  'Klimatyzacja': [
    'Montaż Split',
    'Multisplit',
    'Klimatyzacja kanałowa',
    'Serwis i przegląd',
    'Certyfikacja F-gaz'
  ],
  'Fotowoltaika': [
    'Instalacja PV do 10 kWp',
    'Instalacja PV powyżej 10 kWp',
    'Magazyn energii',
    'Montaż na gruncie',
    'Przegląd i serwis PV'
  ]
};

const INDUSTRIES = Object.keys(TASKS_BY_INDUSTRY);

const LOADING_MESSAGES = [
  'Irena parzy melisę i odpala systemy państwowe...',
  'Irena dzwoni do szwagra z urzędu skarbowego...',
  'Prześwietlam KRS. Oho, ktoś tu ma długi...',
  'Czytam opinie na fejsiku. "Somsiad" płakał jak oceniał...',
  'Szukam, czy szef nie uciekł z zaliczką w Bieszczady...',
  'Irena zakłada okulary. Zaraz polecą wióry...',
  'Weryfikacja uprawnień. Papiery muszą się zgadzać!',
  'Sprawdzam, czy "panie, kto panu tak spier..." to ich motto...',
  'Analizuję powiązania kapitałowe. Czysto, albo wcale!',
  'Pukam do drzwi wirtualnych dłużników...'
];

export default function App() {
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [task, setTask] = useState(TASKS_BY_INDUSTRY[INDUSTRIES[0]][0]);
  const [location, setLocation] = useState(CITIES[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [results, setResults] = useState<Company[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !location) {
      setError('Irena mówi: "Wpisz co mają zrobić i gdzie, bo z fusów nie wróżę!"');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);
    setLoadingMsgIdx(0);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setError('Irena mówi: "Brak klucza API! Dodaj GEMINI_API_KEY w ustawieniach."');
        setIsLoading(false);
        return;
      }
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
        Jesteś "Ireną z Zarzecza" - bezlitosną, ale sprawiedliwą weryfikatorką fachowców.
        Wygeneruj dokładnie 20 FIKCYJNYCH, zmyślonych firm (mock data) z branży "${industry}", 
        które wykonują usługę "${task}". 
        Użyj całkowicie zmyślonych danych kontaktowych (np. losowe numery telefonów, wymyślone adresy e-mail).
        
        Podział lokalizacyjny:
        - 10 firm musi znajdować się dokładnie w mieście: ${location}. (ustaw locationType na "city")
        - 10 firm musi znajdować się w okolicach miasta ${location} (w promieniu do 50 km, w różnych kierunkach, poza samym miastem). (ustaw locationType na "surroundings")
        
        Dla każdej firmy przeprowadź wirtualną "weryfikację" w 5 szczegółowych kategoriach:
        1. CEIDG / KRS (Aktywny status, data założenia, historia zawieszeń)
        2. Biała lista podatników VAT (Weryfikacja rzetelności podatkowej)
        3. Rejestry Dłużników (KRD, BIG InfoMonitor, ewentualne zadłużenia)
        4. Specjalistyczne Portale Branżowe (Fixly, Oferteo, Oferia - opinie i historia zleceń)
        5. Rejestry Uprawnień (UDT, SEP, PIIB - rzeczywiste uprawnienia elektryczne, budowlane, gazowe itp.)
        
        Zwróć dane w formacie JSON. Bądź konkretny. 
        Wymagane dane dla każdej firmy:
        - Pełny adres (ulica, kod pocztowy, miasto)
        - locationType: "city" (jeśli z samego miasta) lub "surroundings" (jeśli z okolic)
        - Telefon kontaktowy
        - Adres e-mail
        - Skąd pochodzą opinie (tablica stringów, np. ["Google Maps", "Fixly", "Grupa FB: Budowa Domu"])
        - trustScore: wskaźnik zaufania, MUSI być w skali od 0 do 100 (np. 95, 82, 45). Nie używaj skali 1-10.
        
        W polu "summary" napisz krótki, charakterny komentarz Ireny (np. "Firma solidna, ale w 2018 mieli mały poślizg z VATem. Można brać.").
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              companies: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    fullAddress: { type: Type.STRING },
                    locationType: { type: Type.STRING },
                    phone: { type: Type.STRING },
                    email: { type: Type.STRING },
                    reviewSources: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    verification: {
                      type: Type.OBJECT,
                      properties: {
                        ceidgKrs: {
                          type: Type.OBJECT,
                          properties: {
                            status: { type: Type.STRING },
                            isPositive: { type: Type.BOOLEAN }
                          }
                        },
                        vatWhitelist: {
                          type: Type.OBJECT,
                          properties: {
                            status: { type: Type.STRING },
                            isPositive: { type: Type.BOOLEAN }
                          }
                        },
                        debtRegisters: {
                          type: Type.OBJECT,
                          properties: {
                            status: { type: Type.STRING },
                            isPositive: { type: Type.BOOLEAN }
                          }
                        },
                        industryPortals: {
                          type: Type.OBJECT,
                          properties: {
                            status: { type: Type.STRING },
                            isPositive: { type: Type.BOOLEAN }
                          }
                        },
                        licenses: {
                          type: Type.OBJECT,
                          properties: {
                            status: { type: Type.STRING },
                            isPositive: { type: Type.BOOLEAN }
                          }
                        }
                      }
                    },
                    trustScore: { type: Type.NUMBER },
                    summary: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      if (data && data.companies && Array.isArray(data.companies) && data.companies.length > 0) {
        setResults(data.companies);
      } else {
        setError('Irena nie znalazła nikogo godnego zaufania w tej okolicy.');
      }
    } catch (err) {
      console.error(err);
      setError('Irenie zawiesił się system (błąd API). Spróbuj ponownie.');
    } finally {
      setIsLoading(false);
    }
  };

  const getNormalizedScore = (score?: number) => {
    if (score === undefined || score === null) return 0;
    // If AI hallucinates a 1-10 scale instead of 0-100, fix it
    if (score > 0 && score <= 10) {
      return score * 10;
    }
    return score;
  };

  const getScoreColor = (score?: number) => {
    const normalized = getNormalizedScore(score);
    if (normalized >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (normalized >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const renderCompanyCard = (company: Company, idx: number, prefix: string) => {
    const score = getNormalizedScore(company.trustScore);
    const isFailed = score < 50;
    return (
      <motion.div
        key={`${prefix}-${idx}`}
        initial={{ opacity: 0, y: 20 }}
        animate={isFailed ? {
          opacity: 1, y: 0,
          boxShadow: ['0px 0px 0px 0px rgba(239,68,68,0)', '0px 0px 20px 5px rgba(239,68,68,0.4)', '0px 0px 0px 0px rgba(239,68,68,0)'],
          borderColor: ['#e5e7eb', '#ef4444', '#e5e7eb']
        } : { opacity: 1, y: 0 }}
        transition={isFailed ? {
          opacity: { duration: 0.3 },
          y: { duration: 0.3 },
          boxShadow: { repeat: Infinity, duration: 3, ease: "easeInOut" },
          borderColor: { repeat: Infinity, duration: 3, ease: "easeInOut" }
        } : { delay: idx * 0.1 }}
        className={`bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col p-5 ${isFailed ? 'border-red-400 relative z-10' : 'border-gray-200'}`}
      >
        <div className="flex justify-between items-start gap-4 mb-2">
          <h4 className="text-xl font-bold text-gray-900 leading-tight">{company.name || 'Nieznana firma'}</h4>
          <div className={`px-3 py-1 rounded-full text-sm font-bold border shrink-0 ${getScoreColor(company.trustScore)}`}>
            {score}/100
          </div>
        </div>
        <p className="text-gray-700 text-sm mb-4">{company.description || 'Brak opisu'}</p>

        {/* Integrated Verification Details */}
        {company.verification && (
          <div className="mb-4 space-y-1.5">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Szczegóły Weryfikacji</div>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              <div className={`flex items-start gap-2 ${company.verification.ceidgKrs?.isPositive ? 'text-green-700' : 'text-red-700'}`}>
                {company.verification.ceidgKrs?.isPositive ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                <span><strong>CEIDG/KRS:</strong> {company.verification.ceidgKrs?.status}</span>
              </div>
              <div className={`flex items-start gap-2 ${company.verification.vatWhitelist?.isPositive ? 'text-green-700' : 'text-red-700'}`}>
                {company.verification.vatWhitelist?.isPositive ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                <span><strong>Biała Lista VAT:</strong> {company.verification.vatWhitelist?.status}</span>
              </div>
              <div className={`flex items-start gap-2 ${company.verification.debtRegisters?.isPositive ? 'text-green-700' : 'text-red-700'}`}>
                {company.verification.debtRegisters?.isPositive ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                <span><strong>KRD/BIG:</strong> {company.verification.debtRegisters?.status}</span>
              </div>
              <div className={`flex items-start gap-2 ${company.verification.industryPortals?.isPositive ? 'text-green-700' : 'text-red-700'}`}>
                {company.verification.industryPortals?.isPositive ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                <span><strong>Fixly/Oferteo:</strong> {company.verification.industryPortals?.status}</span>
              </div>
              <div className={`flex items-start gap-2 ${company.verification.licenses?.isPositive ? 'text-green-700' : 'text-red-700'}`}>
                {company.verification.licenses?.isPositive ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                <span><strong>Uprawnienia:</strong> {company.verification.licenses?.status}</span>
              </div>
            </div>
          </div>
        )}

        {/* Verdict */}
        <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100 flex gap-3 items-start">
          <div className="w-8 h-8 rounded-full bg-[#021128] flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-slate-200" />
          </div>
          <div>
            <h5 className="text-[10px] font-bold text-[#021128] uppercase tracking-wider mb-1">Werdykt Ireny</h5>
            <p className="text-xs text-slate-800 italic font-medium">"{company.summary || 'Brak werdyktu'}"</p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-auto pt-3 border-t border-gray-100">
          <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">INFORMACJE KONTAKTOWE</h5>
          <div className="text-xs text-gray-800 flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
            <span>{company.fullAddress || company.location || 'Brak adresu'}</span>
            <span className="text-gray-300">|</span>
            <span>{company.phone || company.contact || 'Brak telefonu'}</span>
            <span className="text-gray-300">|</span>
            <span>{company.email || 'Brak e-maila'}</span>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-gray-900 font-sans selection:bg-blue-200">
      {/* Header - Navy & Silver Theme */}
      <header className="bg-[#021128] border-b border-slate-800 sticky top-0 z-10 overflow-hidden relative shadow-xl">
        {/* Silver highlight effect in background mimicking the uploaded logo */}
        <div className="absolute inset-0 flex justify-center pointer-events-none">
          <div className="w-64 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent blur-2xl"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_50%)]"></div>
        </div>
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 flex flex-col items-center justify-center text-center">
          <img 
            src="/logo.png" 
            alt="Budowlane SC PL" 
            className="h-24 md:h-32 lg:h-40 object-contain drop-shadow-2xl mb-6"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] mb-2 uppercase" style={{ textShadow: '0px 4px 10px rgba(0,0,0,0.5)' }}>
            BUDOWLANE FAIR-PLAY
          </h1>
          <h2 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-300 tracking-wide mb-3 drop-shadow-md">
            by IRENA
          </h2>
          <p className="text-sm md:text-base text-slate-300 tracking-[0.2em] uppercase font-semibold drop-shadow-sm">
            powered by HTNY STUDIOS
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        
        {/* Large Loading Overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-[#021128]/80 backdrop-blur-md p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-gradient-to-br from-slate-800 to-[#021128] p-10 md:p-14 rounded-3xl shadow-2xl max-w-3xl w-full text-center border border-slate-600 relative overflow-hidden"
              >
                {/* Decorative background glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-blue-500/20 blur-3xl rounded-full pointer-events-none"></div>
                
                <div className="w-28 h-28 mx-auto mb-10 relative">
                  <motion.div 
                    animate={{ rotate: 360 }} 
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }} 
                    className="absolute inset-0 border-t-4 border-b-4 border-slate-200 rounded-full opacity-80"
                  ></motion.div>
                  <motion.div 
                    animate={{ rotate: -360 }} 
                    transition={{ repeat: Infinity, duration: 3, ease: "linear" }} 
                    className="absolute inset-2 border-l-4 border-r-4 border-slate-400 rounded-full opacity-60"
                  ></motion.div>
                  <Search className="w-12 h-12 text-slate-200 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                
                <h3 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-200 via-white to-slate-200 mb-8 drop-shadow-sm">
                  Irena w akcji...
                </h3>
                
                <div className="h-24 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={loadingMsgIdx}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.4 }}
                      className="text-2xl md:text-3xl text-slate-300 font-medium italic leading-relaxed"
                    >
                      "{LOADING_MESSAGES[loadingMsgIdx]}"
                    </motion.p>
                  </AnimatePresence>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Search Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 mb-8">
          <div className="mb-8">
            <h2 className="text-3xl font-semibold mb-3">Znajdź pewnego wykonawcę</h2>
            <p className="text-lg text-gray-600">Irena prześwietli ich w CEIDG, KRS, KRD i sprawdzi opinie, żebyś Ty nie musiał.</p>
          </div>

          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-5">
            <div className="md:col-span-3">
              <label className="block text-base font-medium text-gray-700 mb-2">Branża</label>
              <select 
                value={industry}
                onChange={(e) => {
                  const newIndustry = e.target.value;
                  setIndustry(newIndustry);
                  setTask(TASKS_BY_INDUSTRY[newIndustry][0]);
                }}
                className="w-full rounded-xl border-gray-300 bg-gray-50 px-4 py-3.5 text-base text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all border"
              >
                {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
              </select>
            </div>
            
            <div className="md:col-span-4">
              <label className="block text-base font-medium text-gray-700 mb-2">Co jest do zrobienia? (Robota)</label>
              <select 
                value={task}
                onChange={(e) => setTask(e.target.value)}
                className="w-full rounded-xl border-gray-300 bg-gray-50 px-4 py-3.5 text-base text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all border"
              >
                {TASKS_BY_INDUSTRY[industry].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="md:col-span-5">
              <label className="block text-base font-medium text-gray-700 mb-2">Lokalizacja</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-xl border-gray-300 bg-gray-50 pl-11 pr-4 py-3.5 text-base text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all border appearance-none"
                >
                  {CITIES.map(city => <option key={city} value={city}>{city} (+50 km)</option>)}
                </select>
              </div>
            </div>

            <div className="md:col-span-12 mt-4">
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full md:w-auto px-10 py-4 bg-[#021128] hover:bg-slate-800 text-white text-lg font-bold tracking-wide rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed border border-slate-700 hover:border-slate-500"
              >
                <Search className="w-6 h-6 text-slate-300" />
                {isLoading ? 'Irena weryfikuje...' : 'SZUKAJ I WERYFIKUJ'}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
        </section>

        {/* Loading State */}
        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="relative w-24 h-24 mb-6">
                <motion.div 
                  className="absolute inset-0 border-4 border-blue-200 rounded-full"
                />
                <motion.div 
                  className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                />
                <ShieldCheck className="absolute inset-0 m-auto w-10 h-10 text-blue-600" />
              </div>
              <motion.p 
                key={loadingMsgIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-lg font-medium text-gray-700"
              >
                {LOADING_MESSAGES[loadingMsgIdx]}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        {!isLoading && results && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Raport Ireny ({results.length} znalezionych)</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* City Column */}
              <div>
                <h3 className="text-2xl font-bold text-[#021128] mb-6 border-b-2 border-[#021128] pb-2">Z Miasta</h3>
                <div className="space-y-6">
                  {results.filter(r => r.locationType?.toLowerCase() === 'city' || r.locationType?.toLowerCase() === 'miasto').map((company, idx) => renderCompanyCard(company, idx, 'city'))}
                  {results.filter(r => r.locationType?.toLowerCase() === 'city' || r.locationType?.toLowerCase() === 'miasto').length === 0 && (
                    <p className="text-gray-500 italic">Brak wyników w tej kategorii.</p>
                  )}
                </div>
              </div>

              {/* Surroundings Column */}
              <div>
                <h3 className="text-2xl font-bold text-[#021128] mb-6 border-b-2 border-[#021128] pb-2">Z Okolicy</h3>
                <div className="space-y-6">
                  {results.filter(r => r.locationType?.toLowerCase() === 'surroundings' || r.locationType?.toLowerCase() === 'okolica' || r.locationType?.toLowerCase() === 'okolice').map((company, idx) => renderCompanyCard(company, idx, 'surroundings'))}
                  {results.filter(r => r.locationType?.toLowerCase() === 'surroundings' || r.locationType?.toLowerCase() === 'okolica' || r.locationType?.toLowerCase() === 'okolice').length === 0 && (
                    <p className="text-gray-500 italic">Brak wyników w tej kategorii.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Search, ShieldCheck, AlertTriangle, XCircle, CheckCircle2, Building2, MapPin, Phone, Star, FileText, Landmark, Users, Wrench } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface VerificationCategory {
  status: string;
  isPositive: boolean;
}

interface Company {
  name: string;
  description: string;
  location: string;
  contact: string;
  verification: {
    stateRegisters: VerificationCategory;
    financial: VerificationCategory;
    socialProof: VerificationCategory;
    specialized: VerificationCategory;
  };
  trustScore: number;
  summary: string;
}

const INDUSTRIES = [
  'Budownictwo (Stan surowy, konstrukcje)',
  'Elektryka (Instalacje, automatyka)',
  'Hydraulika (Wod-kan, ogrzewanie)',
  'Instalacje grzewcze (Pompy ciepła, kotły, wentylacja)',
  'Wykończenia wnętrz (Tynki, płytki, malowanie)',
  'Dachy (Pokrycia, obróbki, rynny)',
  'Ogrody i otoczenie (Kostka, ogrodzenia, zieleń)',
  'Okna i drzwi (Montaż, wymiana)',
  'Klimatyzacja (Montaż, serwis F-gaz)',
  'Fotowoltaika (PV, magazyny energii)'
];

const LOADING_MESSAGES = [
  'Irena zakłada okulary i odpala CEIDG...',
  'Irena dzwoni do szwagra z urzędu skarbowego...',
  'Irena sprawdza, czy nie wiszą kasy w KRD...',
  'Irena czyta opinie na Google Maps (nawet te z jedną gwiazdką)...',
  'Irena weryfikuje uprawnienia UDT...',
  'Irena parzy melisę, bo znalazła podejrzaną spółkę z o.o....',
];

export default function App() {
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [task, setTask] = useState('');
  const [location, setLocation] = useState('Kraków');
  const [radius, setRadius] = useState('10');
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
      const prompt = `
        Jesteś "Ireną z Zarzecza" - bezlitosną, ale sprawiedliwą weryfikatorką fachowców.
        Znajdź 3 realistyczne (lub prawdziwe, jeśli znasz) firmy z branży "${industry}", 
        które wykonują usługę "${task}" w lokalizacji "${location}" (lub w promieniu do ${radius} km).
        
        Dla każdej firmy przeprowadź wirtualną "weryfikację" w 4 kategoriach:
        1. Rejestry Państwowe (CEIDG, KRS, VAT, REGON)
        2. Finanse i Długi (KRD, BIG, KRZ)
        3. Social Proof (Google Maps, Oferteo, Fixly)
        4. Branżowe (Uprawnienia, UDT, GUNB, Certyfikaty)
        
        Zwróć dane w formacie JSON. Bądź konkretny. W polu "summary" napisz krótki, 
        charakterny komentarz Ireny (np. "Firma solidna, ale w 2018 mieli mały poślizg z VATem. Można brać.").
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
                    location: { type: Type.STRING },
                    contact: { type: Type.STRING },
                    verification: {
                      type: Type.OBJECT,
                      properties: {
                        stateRegisters: {
                          type: Type.OBJECT,
                          properties: {
                            status: { type: Type.STRING },
                            isPositive: { type: Type.BOOLEAN }
                          }
                        },
                        financial: {
                          type: Type.OBJECT,
                          properties: {
                            status: { type: Type.STRING },
                            isPositive: { type: Type.BOOLEAN }
                          }
                        },
                        socialProof: {
                          type: Type.OBJECT,
                          properties: {
                            status: { type: Type.STRING },
                            isPositive: { type: Type.BOOLEAN }
                          }
                        },
                        specialized: {
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
      if (data.companies && data.companies.length > 0) {
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const QuickBadge = ({ title, isPositive, icon: Icon }: { title: string, isPositive: boolean, icon: any }) => (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold border ${isPositive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
      <Icon className="w-3.5 h-3.5" />
      {title}
      {isPositive ? <CheckCircle2 className="w-4 h-4 ml-1" /> : <XCircle className="w-4 h-4 ml-1" />}
    </div>
  );

  const VerificationBadge = ({ title, icon: Icon, data }: { title: string, icon: any, data: VerificationCategory }) => (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${data.isPositive ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'}`}>
      <div className={`mt-0.5 p-1.5 rounded-full ${data.isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
        {data.isPositive ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
      </div>
      <div>
        <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-1 ${data.isPositive ? 'text-green-800' : 'text-red-800'}`}>
          <Icon className="w-3.5 h-3.5" />
          {title}
        </div>
        <p className={`text-sm leading-snug ${data.isPositive ? 'text-green-900' : 'text-red-900'}`}>{data.status}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-gray-900 font-sans selection:bg-blue-200">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-blue-600" />
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              Weryfikator Fachowców <span className="text-blue-600">BY IRENA Z ZARZECZA</span>
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">Znajdź pewnego wykonawcę</h2>
            <p className="text-gray-500">Irena prześwietli ich w CEIDG, KRS, KRD i sprawdzi opinie, żebyś Ty nie musiał.</p>
          </div>

          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Branża</label>
              <select 
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-xl border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all border"
              >
                {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
              </select>
            </div>
            
            <div className="md:col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Co jest do zrobienia? (Robota)</label>
              <input 
                type="text" 
                placeholder="np. Kładzenie płytek, Montaż pompy..."
                value={task}
                onChange={(e) => setTask(e.target.value)}
                className="w-full rounded-xl border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all border"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Lokalizacja</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="np. Warszawa, Kraków"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-xl border-gray-300 bg-gray-50 pl-10 pr-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all border"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Odległość</label>
              <select 
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-full rounded-xl border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all border"
              >
                <option value="5">+ 5 km</option>
                <option value="10">+ 10 km</option>
                <option value="15">+ 15 km</option>
              </select>
            </div>

            <div className="md:col-span-12 mt-2">
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full md:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                    <Search className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <Search className="w-5 h-5" />
                )}
                {isLoading ? 'Irena weryfikuje...' : 'Szukaj i Weryfikuj'}
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

            {results.map((company, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-xl font-bold text-gray-900">{company.name}</h4>
                      <div className={`px-3 py-1 rounded-full text-sm font-bold border ${getScoreColor(company.trustScore)}`}>
                        Trust Score: {company.trustScore}/100
                      </div>
                    </div>
                    <p className="text-gray-600 mb-3">{company.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                      <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {company.location}</span>
                      <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {company.contact}</span>
                    </div>
                    
                    {/* Quick Summary Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <QuickBadge title="Rejestry" isPositive={company.verification.stateRegisters.isPositive} icon={Landmark} />
                      <QuickBadge title="Finanse" isPositive={company.verification.financial.isPositive} icon={FileText} />
                      <QuickBadge title="Opinie" isPositive={company.verification.socialProof.isPositive} icon={Star} />
                      <QuickBadge title="Uprawnienia" isPositive={company.verification.specialized.isPositive} icon={Wrench} />
                    </div>
                  </div>
                </div>

                {/* Verification Grid */}
                <div className="p-6 bg-gray-50/50">
                  <h5 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Szczegóły Weryfikacji</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <VerificationBadge 
                      title="Rejestry Państwowe (CEIDG/KRS/VAT)" 
                      icon={Landmark} 
                      data={company.verification.stateRegisters} 
                    />
                    <VerificationBadge 
                      title="Finanse i Długi (KRD/BIG/KRZ)" 
                      icon={FileText} 
                      data={company.verification.financial} 
                    />
                    <VerificationBadge 
                      title="Social Proof (Opinie, Google, Fixly)" 
                      icon={Star} 
                      data={company.verification.socialProof} 
                    />
                    <VerificationBadge 
                      title="Uprawnienia Branżowe (UDT/GUNB)" 
                      icon={Wrench} 
                      data={company.verification.specialized} 
                    />
                  </div>
                </div>

                {/* Irena's Summary */}
                <div className="p-6 bg-blue-50 border-t border-blue-100 flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                    <Users className="w-6 h-6 text-blue-700" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-1">Werdykt Ireny</h5>
                    <p className="text-blue-800 italic font-medium">"{company.summary}"</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

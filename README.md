# Weryfikator Fachowców BY IRENA Z ZARZECZA

Aplikacja oparta na sztucznej inteligencji (Google Gemini) do wyszukiwania i "weryfikacji" wykonawców budowlanych, remontowych i usługowych. Główną twarzą aplikacji jest "Irena z Zarzecza" – bezlitosna, ale sprawiedliwa weryfikatorka, która prześwietla firmy w poszukiwaniu rzetelnych fachowców.

## 🌟 Główne funkcje

* **Wyszukiwanie AI:** Wyszukiwanie fachowców na podstawie branży, konkretnego zadania oraz lokalizacji.
* **Podział lokalizacyjny:** Wyniki są automatycznie dzielone na dwie kategorie:
  * **Z Miasta:** 10 firm z wybranej miejscowości.
  * **Z Okolicy:** 10 firm z okolic (do 50 km).
* **Szczegółowa weryfikacja (Mock):** Każda firma jest weryfikowana w 5 kategoriach:
  1. CEIDG / KRS (status, historia)
  2. Biała lista podatników VAT
  3. Rejestry Dłużników (KRD, BIG InfoMonitor)
  4. Portale Branżowe (Fixly, Oferteo itp.)
  5. Rejestry Uprawnień (UDT, SEP, PIIB)
* **Trust Score (Wskaźnik Zaufania):** Procentowy wskaźnik wiarygodności firmy. Najlepsze firmy z wynikiem od 80% wzwyż są wyróżniane (szybciej pulsujące, zielone obramowanie).
* **Werdykt Ireny:** Krótkie, dosadne podsumowanie każdej firmy napisane w charakterystycznym stylu "Ireny".

> **Uwaga:** Ze względu na ograniczenia modeli AI dotyczące danych osobowych (PII), aplikacja obecnie generuje **fikcyjne, wysoce realistyczne dane (mock data)** w celu zaprezentowania mechanizmu działania i interfejsu.

## 🛠 Technologie

* **Frontend:** React 18, TypeScript, Vite
* **Styling:** Tailwind CSS
* **Animacje:** Motion (Framer Motion)
* **Ikony:** Lucide React
* **AI:** Google Gemini API (`@google/genai`)

## 🚀 Jak uruchomić projekt lokalnie

1. **Sklonuj repozytorium lub pobierz pliki projektu.**
2. **Zainstaluj zależności:**
   ```bash
   npm install
   ```
3. **Skonfiguruj zmienne środowiskowe:**
   Utwórz plik `.env` w głównym katalogu projektu i dodaj swój klucz API Google Gemini:
   ```env
   GEMINI_API_KEY=twoj_klucz_api_tutaj
   ```
4. **Uruchom serwer deweloperski:**
   ```bash
   npm run dev
   ```
5. Otwórz przeglądarkę i wejdź pod adres `http://localhost:3000`.

## 📦 Budowanie wersji produkcyjnej

Aby zbudować zoptymalizowaną wersję produkcyjną aplikacji:

```bash
npm run build
```

Pliki wynikowe znajdą się w folderze `dist/`.

## 📝 Struktura projektu

* `src/App.tsx` - Główny komponent aplikacji, zawiera logikę wyszukiwania, integrację z Gemini API oraz renderowanie interfejsu.
* `src/index.css` - Globalne style i konfiguracja Tailwind CSS.
* `src/main.tsx` - Punkt wejścia aplikacji React.
* `metadata.json` - Metadane aplikacji.

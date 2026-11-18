# RAM Plus A17

Aplikacja dla **Samsung Galaxy A17 (4 GB RAM)** — kalkulator i konfigurator zram.

Powiązana z rozwiązaniem `helios-android-zram-a17` (skrypty `10_zram_setup.sh`,
`40_verify.sh`, `60_noroot.sh`, `INSTRUKCJA.md`, `BUDZET.md`).

## Co robi

| Zakładka | Zawartość |
|---|---|
| **Budżet** | bilans 3,73 GiB − 2,00 One UI − zram = ile zostaje aplikacjom; werdykt |
| **Konfiguracja** | rozmiar 2/3/4/6 GiB, algorytm, generator komend (Włącz/Wyłącz/Autostart) |
| **Weryfikacja** | parser `mm_stat` → współczynnik, narzut RAM, ocena wg progów dla 4 GB |
| **Algorytmy** | lz4 / lz4hc / zstd / lzo-rle — kompresja, koszt CPU, opóźnienie |
| **Więcej** | wariant bez roota (RAM Plus), czego nie zrobisz bez roota, wariant z rootem |

## Kluczowa liczba

Przy 3 GiB zram i lz4hc zostaje **0,65 GiB** dla aplikacji. Przy 6 GiB — **−0,42 GiB**,
czyli cegła. Aplikacja ostrzega modalem, zanim ustawisz 4 lub 6 GiB.

## Zbudowanie APK

Workflow `.github/workflows/build-apk.yml` buduje APK na GitHubie — bez konta Expo.

1. **Actions** → **Build APK** → **Run workflow**
2. Po ~10–15 min: **Artifacts** → `ram-plus-a17-apk` → ZIP z `app-release.apk`
3. Albo wgraj tag: `git tag v1.0.0 && git push origin v1.0.0` → APK trafi do **Releases**

Pełna instrukcja: `BUILD_GUIDE.md`.

## Uwaga

To **pojemność LOGICZNA** (kompresja w RAM), nie fizyczny RAM. Telefon nadal ma 4 GB.
Aplikacja jest nakładką obliczeniową i edukacyjną — nie zmienia zram sama, generuje
komendy do wklejenia w terminal z rootem i analizuje to, co odczyta system.

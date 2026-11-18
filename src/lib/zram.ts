/**
 * Model obliczeniowy zram dla Samsung Galaxy A17 (4 GB RAM).
 *
 * Wszystkie pojemności w GiB, chyba że funkcja mówi inaczej.
 * 4 GB producenta = 3,73 GiB widziane przez system.
 */

export const DEVICE = {
  model: 'Samsung Galaxy A17',
  soc: 'MediaTek Helio G99',
  cores: '2× Cortex-A76 @ 2,2 GHz + 6× Cortex-A55',
  ramGb: 4,
  ramGib: 3.73,
  storage: 'UFS 2.2',
  android: 'Android 15 / One UI 7',
  sdSlot: 'slot hybrydowy (SIM2 albo microSD)',
} as const;

/** One UI 7 + GMS + usługi Samsunga na 4 GB — zmierzone/typowe. */
export const ONE_UI_BASELINE_GIB = 2.0;

export type AlgoId = 'lz4' | 'lz4hc' | 'zstd' | 'lzo-rle';

export type Algo = {
  id: AlgoId;
  name: string;
  /** Typowy współczynnik kompresji na danych z RAM Androida. */
  ratio: number;
  /** Koszt CPU przy kompresji, 1 = najtaniej. */
  cpu: number;
  /** Opóźnienie dekompresji w mikrosekundach na stronę 4 KiB. */
  latencyUs: number;
  speed: string;
  note: string;
  recommended?: boolean;
};

export const ALGOS: Algo[] = [
  {
    id: 'lz4',
    name: 'lz4',
    ratio: 2.3,
    cpu: 1,
    latencyUs: 45,
    speed: '~400 MB/s',
    note: 'Najszybszy, najniższy współczynnik. Domyślny w wielu ROM-ach. Na 4 GB zużywa najwięcej RAM na jednostkę treści.',
  },
  {
    id: 'lz4hc',
    name: 'lz4hc',
    ratio: 2.8,
    cpu: 2.4,
    latencyUs: 60,
    speed: '~120 MB/s',
    note: 'Ten sam dekoder co lz4 (szybki odczyt), mocniejsza kompresja przy zapisie. Najlepszy stosunek zysku do kosztu na 4 GB.',
    recommended: true,
  },
  {
    id: 'zstd',
    name: 'zstd',
    ratio: 3.2,
    cpu: 3.1,
    latencyUs: 95,
    speed: '~90 MB/s',
    note: 'Najlepsza kompresja, najdroższy CPU. Na Helio G99 odczuwalnie grzeje przy dużym swapie. Sensowny tylko przy 2 GiB urządzenia.',
  },
  {
    id: 'lzo-rle',
    name: 'lzo-rle',
    ratio: 2.5,
    cpu: 1.3,
    latencyUs: 50,
    speed: '~300 MB/s',
    note: 'RLE dobrze łapie zera w stronach jądra. Kompromis, ale lz4hc wygrywa na danych aplikacji.',
  },
];

export function algoById(id: AlgoId): Algo {
  return ALGOS.find((a) => a.id === id) ?? ALGOS[1];
}

export const ZRAM_SIZES_GIB = [2, 3, 4, 6] as const;
export type ZramSize = (typeof ZRAM_SIZES_GIB)[number];

export type Verdict = 'komfort' | 'zalecane' | 'granica' | 'cegla';

export type Budget = {
  sizeGib: number;
  algo: Algo;
  /** Ile treści zmieści się po kompresji. */
  contentGib: number;
  /** Ile fizycznego RAM zjada zram przy pełnym wypełnieniu. */
  memUsedGib: number;
  /** Ile zostaje dla aplikacji po odjęciu One UI i zram. */
  freeForAppsGib: number;
  verdict: Verdict;
  verdictLabel: string;
  verdictDetail: string;
};

export function computeBudget(sizeGib: number, algo: Algo): Budget {
  const contentGib = sizeGib * algo.ratio;
  const memUsedGib = sizeGib / algo.ratio;
  const freeForAppsGib = DEVICE.ramGib - ONE_UI_BASELINE_GIB - memUsedGib;

  let verdict: Verdict;
  let verdictLabel: string;
  let verdictDetail: string;

  if (freeForAppsGib >= 0.7) {
    verdict = 'komfort';
    verdictLabel = 'Komfort';
    verdictDetail = 'One UI ma zapas, aplikacje w tle przeżywają. Bezpieczny wybór.';
  } else if (freeForAppsGib >= 0.4) {
    verdict = 'zalecane';
    verdictLabel = 'Zalecane';
    verdictDetail = 'Działa, ale przy kilku ciężkich aplikacjach LMK zacznie ubijać tło.';
  } else if (freeForAppsGib >= 0.15) {
    verdict = 'granica';
    verdictLabel = 'Granica';
    verdictDetail = 'One UI ledwo oddycha. Przełączanie aplikacji będzie przeładowywać.';
  } else {
    verdict = 'cegla';
    verdictLabel = 'Cegła';
    verdictDetail = 'Brak miejsca dla One UI. Telefon wstanie, ale nie uruchomi aplikacji.';
  }

  return {
    sizeGib,
    algo,
    contentGib,
    memUsedGib,
    freeForAppsGib,
    verdict,
    verdictLabel,
    verdictDetail,
  };
}

export function allBudgets(algo: Algo): Budget[] {
  return ZRAM_SIZES_GIB.map((s) => computeBudget(s, algo));
}

/** Największy rozmiar, który nie wchodzi w „granicę" ani „cegłę". */
export function bestSize(algo: Algo): Budget {
  const ok = allBudgets(algo).filter((b) => b.verdict === 'komfort' || b.verdict === 'zalecane');
  return ok.length > 0 ? ok[ok.length - 1] : computeBudget(2, algo);
}

// ---------------------------------------------------------------------------
// Generowanie komend
// ---------------------------------------------------------------------------

export function setupCommands(sizeGib: number, algo: Algo): string[] {
  const bytes = sizeGib * 1024 * 1024 * 1024;
  return [
    '# 1. Załaduj moduł zram (jeśli nie jest wbudowany w jądro)',
    'modprobe zram num_devices=1',
    '',
    '# 2. Ustaw algorytm PRZED rozmiarem — po ustawieniu disksize jest za późno',
    `echo ${algo.id} > /sys/block/zram0/comp_algorithm`,
    '',
    '# 3. Rozmiar urządzenia',
    `echo ${bytes} > /sys/block/zram0/disksize`,
    '',
    '# 4. Sformatuj jako swap i włącz z priorytetem 100',
    'mkswap /dev/block/zram0',
    'swapon -p 100 /dev/block/zram0',
    '',
    '# 5. Tuning jądra pod 4 GB',
    'echo 100 > /proc/sys/vm/swappiness',
    'echo 0 > /proc/sys/vm/page-cluster',
    '',
    '# 6. Sprawdź',
    'zramctl',
    'cat /proc/swaps',
  ];
}

export function teardownCommands(): string[] {
  return [
    '# Wyłącz swap na zram',
    'swapoff /dev/block/zram0',
    '',
    '# Zresetuj urządzenie (zwalnia cały RAM)',
    'echo 1 > /sys/block/zram0/reset',
    '',
    '# Sprawdź, że zniknęło',
    'zramctl',
    'cat /proc/swaps',
  ];
}

export function persistCommands(sizeGib: number, algo: Algo): string[] {
  const bytes = sizeGib * 1024 * 1024 * 1024;
  return [
    '# Magisk: /data/adb/service.d/99-zram.sh (chmod 755)',
    '#!/system/bin/sh',
    'until [ "$(getprop sys.boot_completed)" = "1" ]; do sleep 1; done',
    'modprobe zram num_devices=1',
    `echo ${algo.id} > /sys/block/zram0/comp_algorithm`,
    `echo ${bytes} > /sys/block/zram0/disksize`,
    'mkswap /dev/block/zram0',
    'swapon -p 100 /dev/block/zram0',
    'echo 100 > /proc/sys/vm/swappiness',
    'echo 0 > /proc/sys/vm/page-cluster',
  ];
}

// ---------------------------------------------------------------------------
// Weryfikacja: parser mm_stat
// ---------------------------------------------------------------------------

export type MmStat = {
  origDataSize: number;
  comprDataSize: number;
  memUsedTotal: number;
  ratio: number;
  /** Ile bajtów RAM przypada na 1 bajt treści. */
  overhead: number;
  savedPct: number;
};

/**
 * Linia /sys/block/zram0/mm_stat:
 * orig_data_size compr_data_size mem_used_total mem_limit mem_used_max
 * same_pages pages_compacted huge_pages huge_pages_since
 */
export function parseMmStat(line: string): MmStat | null {
  const parts = line.trim().split(/\s+/).map(Number);
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [origDataSize, comprDataSize, memUsedTotal] = parts;
  if (origDataSize <= 0) return null;
  return {
    origDataSize,
    comprDataSize,
    memUsedTotal,
    ratio: origDataSize / comprDataSize,
    overhead: memUsedTotal / origDataSize,
    savedPct: (1 - comprDataSize / origDataSize) * 100,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GiB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${bytes} B`;
}

export type RatioVerdict = { label: string; detail: string; good: boolean };

export function judgeRatio(ratio: number): RatioVerdict {
  if (ratio >= 2.5) {
    return {
      label: 'Dobrze',
      detail: 'Kompresja pracuje jak należy. zram realnie mnoży pojemność.',
      good: true,
    };
  }
  if (ratio >= 2.0) {
    return {
      label: 'Ciasno',
      detail: 'Kompresja poniżej typowej. Dane są słabo ściśliwe (multimedia, już skompresowane pliki).',
      good: false,
    };
  }
  return {
    label: 'Nie warto',
    detail: 'Poniżej 2,0:1 zram zjada RAM szybciej, niż daje pojemności. Zmniejsz rozmiar urządzenia.',
    good: false,
  };
}

export const THRESHOLDS = [
  {
    metric: 'Wolne RAM',
    ok: '> 800 MiB',
    tight: '300–800 MiB',
    critical: '< 300 MiB',
    effect: 'LMK zaczyna ubijać aplikacje w tle',
  },
  {
    metric: 'Współczynnik kompresji',
    ok: '> 2,5:1',
    tight: '2,0–2,5:1',
    critical: '< 2,0:1',
    effect: 'zram zjada więcej RAM, niż daje',
  },
  {
    metric: 'Swap-in',
    ok: '< 5 MB/s',
    tight: '5–50 MB/s',
    critical: '> 50 MB/s',
    effect: 'CPU staje się wąskim gardłem',
  },
  {
    metric: 'Zużycie CPU przez kswapd',
    ok: '< 5%',
    tight: '5–15%',
    critical: '> 15%',
    effect: 'grzanie i spadek płynności',
  },
] as const;

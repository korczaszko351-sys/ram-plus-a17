import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button, Card, TextField } from '@/components/ui';
import { spacing, useColors } from '@/constants/theme';
import {
  THRESHOLDS,
  formatBytes,
  judgeRatio,
  parseMmStat,
  type MmStat,
} from '@/lib/zram';

const EXAMPLE = '12845056 4608000 4718592 0 4718592 12 0 0 0';

export default function VerifyScreen() {
  const colors = useColors();
  const [input, setInput] = useState('');
  const [stat, setStat] = useState<MmStat | null>(null);
  const [error, setError] = useState<string | null>(null);

  function analyse() {
    const parsed = parseMmStat(input);
    if (!parsed) {
      setStat(null);
      setError(
        'Nie udało się odczytać. Wklej całą linię z: cat /sys/block/zram0/mm_stat — musi być co najmniej 3 liczby, pierwsza większa od zera.',
      );
      return;
    }
    setError(null);
    setStat(parsed);
  }

  const verdict = stat ? judgeRatio(stat.ratio) : null;
  const verdictColor = !verdict ? colors.muted : verdict.good ? colors.success : colors.warning;

  return (
    <Screen>
      <Card>
        <Text style={[styles.label, { color: colors.muted }]}>Sprawdź swój zram</Text>
        <Text style={[styles.small, { color: colors.muted }]}>
          W terminalu na telefonie (adb shell lub Termux z rootem):
        </Text>
        <Text style={[styles.mono, { color: colors.primary }]} selectable>
          cat /sys/block/zram0/mm_stat
        </Text>
        <TextField
          label="mm_stat"
          value={input}
          onChangeText={setInput}
          placeholder="orig_data_size compr_data_size mem_used_total ..."
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          error={error}
          hint={`Przykład: ${EXAMPLE}`}
        />
        <Button title="Analizuj" icon="analytics-outline" onPress={analyse} />
      </Card>

      {stat ? (
        <>
          <Card>
            <View style={styles.rowBetween}>
              <Text style={[styles.label, { color: colors.muted }]}>Współczynnik kompresji</Text>
              <Text style={[styles.big, { color: verdictColor }]}>
                {stat.ratio.toFixed(2)}:1
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Row
              label="orig_data_size (dane przed kompresją)"
              value={formatBytes(stat.origDataSize)}
              colors={colors}
            />
            <Row
              label="compr_data_size (po kompresji)"
              value={formatBytes(stat.comprDataSize)}
              colors={colors}
            />
            <Row
              label="mem_used_total (realny RAM)"
              value={formatBytes(stat.memUsedTotal)}
              colors={colors}
            />
            <Row
              label="Narzut RAM na 1 B treści"
              value={`${stat.overhead.toFixed(2)} B`}
              colors={colors}
            />
            <Row
              label="Zaoszczędzone"
              value={`${stat.savedPct.toFixed(1)}%`}
              colors={colors}
            />
          </Card>

          <Card>
            <View style={styles.rowBetween}>
              <Text style={[styles.label, { color: colors.muted }]}>Ocena</Text>
              <Text style={[styles.badge, { color: verdictColor }]}>{verdict?.label}</Text>
            </View>
            <Text style={[styles.small, { color: colors.muted }]}>{verdict?.detail}</Text>
          </Card>

          <Card>
            <Text style={[styles.label, { color: colors.muted }]}>Interpretacja</Text>
            <Text style={[styles.small, { color: colors.muted }]}>
              Na Twoim telefonie {formatBytes(stat.memUsedTotal)} RAM trzyma{' '}
              {formatBytes(stat.origDataSize)} danych. Gdyby nie zram, potrzebowałbyś{' '}
              {formatBytes(stat.origDataSize)} wolnego RAM — czyli{' '}
              {(stat.origDataSize / 1024 ** 3).toFixed(2)} GiB, których nie masz.
            </Text>
          </Card>
        </>
      ) : null}

      <Card>
        <Text style={[styles.label, { color: colors.muted }]}>Progi dla 4 GB</Text>
        {THRESHOLDS.map((t) => (
          <View key={t.metric} style={styles.threshRow}>
            <Text style={[styles.threshMetric, { color: colors.text }]}>{t.metric}</Text>
            <Text style={[styles.small, { color: colors.success }]}>OK: {t.ok}</Text>
            <Text style={[styles.small, { color: colors.warning }]}>ciasno: {t.tight}</Text>
            <Text style={[styles.small, { color: colors.danger }]}>krytyczne: {t.critical}</Text>
            <Text style={[styles.threshEffect, { color: colors.muted }]}>{t.effect}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={[styles.label, { color: colors.muted }]}>Komendy kontrolne</Text>
        <Text style={[styles.mono, { color: colors.text }]} selectable>
          zramctl{'\n'}
          cat /proc/swaps{'\n'}
          cat /proc/meminfo | grep -E 'MemFree|MemAvailable|SwapTotal|SwapFree'{'\n'}
          free -h{'\n'}
          dumpsys meminfo | head -40
        </Text>
      </Card>

      <View style={[styles.warn, { backgroundColor: colors.card, borderColor: colors.warning }]}>
        <View style={styles.warnHead}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
          <Text style={[styles.warnTitle, { color: colors.warning }]}>
            Kiedy zram przestaje pomagać
          </Text>
        </View>
        <Text style={[styles.small, { color: colors.muted }]}>
          1. Współczynnik spada poniżej 2,0:1 — zram zjada więcej RAM, niż zwraca. Zmniejsz
          urządzenie. 2. Swap-in przekracza 50 MB/s — CPU nie nadąża z dekompresją, telefon
          mieli. 3. kswapd bierze powyżej 15% CPU — grzanie i spadek klatek. 4. One UI zabija
          aplikacje w tle przy mniej niż 300 MiB wolnego RAM (LMK) — wracasz do Messengera
          i widzisz ekran startowy. To nie błąd aplikacji, to brak pamięci.
        </Text>
      </View>
    </Screen>
  );
}

function Row({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { text: string; muted: string };
}) {
  return (
    <View style={styles.rowBetween}>
      <Text style={[styles.small, { color: colors.muted, flexShrink: 1 }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  small: { fontSize: 13, lineHeight: 19 },
  mono: { fontSize: 12, lineHeight: 18, fontFamily: 'monospace' },
  big: { fontSize: 26, fontWeight: '700' },
  badge: { fontSize: 15, fontWeight: '700' },
  value: { fontSize: 14, fontWeight: '600' },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
  threshRow: { gap: 1, marginBottom: spacing.sm },
  threshMetric: { fontSize: 14, fontWeight: '700' },
  threshEffect: { fontSize: 12, fontStyle: 'italic' },
  warn: { borderRadius: 16, borderWidth: 1, padding: spacing.md, gap: spacing.sm },
  warnHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  warnTitle: { fontSize: 15, fontWeight: '700' },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Card } from '@/components/ui';
import { spacing, useColors } from '@/constants/theme';
import { ALGOS } from '@/lib/zram';

export default function AlgosScreen() {
  const colors = useColors();

  return (
    <Screen>
      <Card>
        <Text style={[styles.label, { color: colors.muted }]}>Porównanie algorytmów</Text>
        <Text style={[styles.small, { color: colors.muted }]}>
          Współczynnik liczony na typowych danych z pamięci Androida (strony jądra, sterty
          aplikacji, cache Javy). Na Twoim telefonie może wyjść 2,4–3,2:1 — sprawdź w
          zakładce Weryfikacja.
        </Text>
      </Card>

      {ALGOS.map((a) => (
        <Card key={a.id} style={a.recommended ? { borderColor: colors.primary } : undefined}>
          <View style={styles.head}>
            <Text style={[styles.name, { color: colors.text }]}>{a.name}</Text>
            {a.recommended ? (
              <Text style={[styles.tag, { color: colors.success }]}>ZALECANY</Text>
            ) : null}
          </View>

          <Bar label="Kompresja" value={a.ratio / 3.2} text={`${a.ratio}:1`} color={colors.primary} colors={colors} />
          <Bar label="Koszt CPU" value={a.cpu / 3.1} text={`×${a.cpu}`} color={colors.warning} colors={colors} />
          <Bar
            label="Opóźnienie"
            value={a.latencyUs / 95}
            text={`${a.latencyUs} µs`}
            color={colors.muted}
            colors={colors}
          />

          <Text style={[styles.small, { color: colors.muted }]}>{a.note}</Text>
        </Card>
      ))}

      <Card>
        <Text style={[styles.label, { color: colors.muted }]}>Wniosek dla 4 GB</Text>
        <Text style={[styles.small, { color: colors.muted }]}>
          lz4hc. Ma ten sam, tani dekoder co lz4, ale kompresuje mocniej — a na telefonie
          z 4 GB dekodowanie zdarza się częściej niż kodowanie, bo strony wracają z zram do
          RAM. zstd daje 0,4:1 więcej, ale za to 3× droższym CPU; na Helio G99 to grzanie.
        </Text>
      </Card>

      <View style={[styles.warn, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.head}>
          <Ionicons name="hardware-chip-outline" size={20} color={colors.primary} />
          <Text style={[styles.warnTitle, { color: colors.text }]}>Dlaczego CPU jest granicą</Text>
        </View>
        <Text style={[styles.small, { color: colors.muted }]}>
          Helio G99 ma 2 szybkie rdzenie A76 i 6 wolnych A55. Dekompresja strony 4 KiB przy
          lz4hc to ~60 µs na A76, ale ~180 µs na A55. Przy 50 MB/s swap-in oznacza to
          ~12 800 stron/s — 0,77 rdzenia A76 zajęte wyłącznie na dekompresję. Stąd próg
          50 MB/s: powyżej niego zram zjada rdzenie potrzebne aplikacjom.
        </Text>
      </View>
    </Screen>
  );
}

function Bar({
  label,
  value,
  text,
  color,
  colors,
}: {
  label: string;
  value: number;
  text: string;
  color: string;
  colors: { border: string; muted: string };
}) {
  const pct = Math.max(2, Math.min(100, value * 100));
  return (
    <View style={styles.barRow}>
      <Text style={[styles.barLabel, { color: colors.muted }]}>{label}</Text>
      <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.barFill, { backgroundColor: color, width: `${pct}%` }]} />
      </View>
      <Text style={[styles.barValue, { color: colors.muted }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  small: { fontSize: 13, lineHeight: 19 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { fontSize: 18, fontWeight: '700' },
  tag: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { fontSize: 12, width: 74 },
  barTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barValue: { fontSize: 12, width: 56, textAlign: 'right' },
  warn: { borderRadius: 16, borderWidth: 1, padding: spacing.md, gap: spacing.sm },
  warnTitle: { fontSize: 15, fontWeight: '700' },
});

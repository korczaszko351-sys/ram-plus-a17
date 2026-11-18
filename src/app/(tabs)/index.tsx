import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Card } from '@/components/ui';
import { spacing, useColors } from '@/constants/theme';
import { usePersistentState } from '@/hooks/use-persistent-state';
import {
  DEVICE,
  ONE_UI_BASELINE_GIB,
  algoById,
  computeBudget,
  type AlgoId,
  type ZramSize,
} from '@/lib/zram';

export default function BudgetScreen() {
  const colors = useColors();
  const [size] = usePersistentState<ZramSize>('zram.size', 3);
  const [algoId] = usePersistentState<AlgoId>('zram.algo', 'lz4hc');
  const algo = algoById(algoId);
  const b = computeBudget(size, algo);

  const verdictColor =
    b.verdict === 'komfort' || b.verdict === 'zalecane'
      ? colors.success
      : b.verdict === 'granica'
        ? colors.warning
        : colors.danger;

  return (
    <Screen>
      <Card>
        <Text style={[styles.label, { color: colors.muted }]}>Urządzenie</Text>
        <Text style={[styles.device, { color: colors.text }]}>{DEVICE.model}</Text>
        <Text style={[styles.small, { color: colors.muted }]}>
          {DEVICE.soc} · {DEVICE.ramGb} GB RAM ({DEVICE.ramGib} GiB) · {DEVICE.android}
        </Text>
      </Card>

      <Card>
        <Text style={[styles.label, { color: colors.muted }]}>Konfiguracja</Text>
        <View style={styles.rowBetween}>
          <Text style={[styles.big, { color: colors.text }]}>zram {size} GiB</Text>
          <Text style={[styles.chip, { color: colors.primary }]}>{algo.name}</Text>
        </View>
        <Text style={[styles.small, { color: colors.muted }]}>
          Zmień rozmiar i algorytm w zakładce Konfiguracja. Wartości liczone dla pełnego
          wypełnienia zram.
        </Text>
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <Text style={[styles.label, { color: colors.muted }]}>Werdykt</Text>
          <Text style={[styles.badge, { color: verdictColor }]}>{b.verdictLabel}</Text>
        </View>
        <Text style={[styles.small, { color: colors.muted }]}>{b.verdictDetail}</Text>
      </Card>

      <Card>
        <Text style={[styles.label, { color: colors.muted }]}>Bilans RAM</Text>
        <Row
          label="RAM fizyczny"
          value={`${DEVICE.ramGib.toFixed(2)} GiB`}
          color={colors.text}
          muted={colors.muted}
        />
        <Row
          label="− One UI 7 + GMS"
          value={`−${ONE_UI_BASELINE_GIB.toFixed(2)} GiB`}
          color={colors.muted}
          muted={colors.muted}
        />
        <Row
          label={`− zram (${size} GiB ÷ ${algo.ratio}:1)`}
          value={`−${b.memUsedGib.toFixed(2)} GiB`}
          color={colors.muted}
          muted={colors.muted}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Row
          label="= wolne dla aplikacji"
          value={`${b.freeForAppsGib.toFixed(2)} GiB`}
          color={verdictColor}
          muted={colors.muted}
          bold
        />
      </Card>

      <Card>
        <Text style={[styles.label, { color: colors.muted }]}>Co zram daje</Text>
        <Row
          label="Treść w zram (po kompresji)"
          value={`${b.contentGib.toFixed(1)} GiB`}
          color={colors.text}
          muted={colors.muted}
        />
        <Row
          label="Współczynnik"
          value={`${algo.ratio}:1`}
          color={colors.text}
          muted={colors.muted}
        />
        <Row
          label="Oszczędność vs brak kompresji"
          value={`${((1 - 1 / algo.ratio) * 100).toFixed(0)}%`}
          color={colors.success}
          muted={colors.muted}
        />
      </Card>

      <View style={[styles.warn, { backgroundColor: colors.card, borderColor: colors.warning }]}>
        <View style={styles.warnHead}>
          <Ionicons name="warning-outline" size={20} color={colors.warning} />
          <Text style={[styles.warnTitle, { color: colors.warning }]}>To pojemność LOGICZNA</Text>
        </View>
        <Text style={[styles.small, { color: colors.muted }]}>
          zram nie dodaje pamięci RAM. To kompresja w locie: dane trafiają do tych samych 4 GB,
          tylko skompresowane. Telefon nadal ma 4 GB kości. Współczynnik {algo.ratio}:1 oznacza,
          że 1 GiB RAM przechowuje {algo.ratio} GiB danych — pod warunkiem, że dane są ściśliwe
          i że stać Cię na CPU.
        </Text>
      </View>
    </Screen>
  );
}

function Row({
  label,
  value,
  color,
  muted,
  bold,
}: {
  label: string;
  value: string;
  color: string;
  muted: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.rowBetween}>
      <Text style={[styles.small, { color: muted, flexShrink: 1 }]}>{label}</Text>
      <Text style={[bold ? styles.valueBold : styles.value, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  device: { fontSize: 22, fontWeight: '700' },
  small: { fontSize: 13, lineHeight: 19 },
  big: { fontSize: 26, fontWeight: '700' },
  chip: { fontSize: 14, fontWeight: '700' },
  badge: { fontSize: 15, fontWeight: '700' },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
  value: { fontSize: 14, fontWeight: '600' },
  valueBold: { fontSize: 16, fontWeight: '700' },
  warn: { borderRadius: 16, borderWidth: 1, padding: spacing.md, gap: spacing.sm },
  warnHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  warnTitle: { fontSize: 15, fontWeight: '700' },
});

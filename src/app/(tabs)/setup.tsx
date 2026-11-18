import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button, Card, ConfirmDialog } from '@/components/ui';
import { spacing, useColors } from '@/constants/theme';
import { usePersistentState } from '@/hooks/use-persistent-state';
import {
  ALGOS,
  ZRAM_SIZES_GIB,
  algoById,
  computeBudget,
  persistCommands,
  setupCommands,
  teardownCommands,
  type AlgoId,
  type ZramSize,
} from '@/lib/zram';

type Mode = 'setup' | 'teardown' | 'persist';

const MODES: {
  id: Mode;
  label: string;
  icon: 'play-outline' | 'stop-outline' | 'refresh-outline';
}[] = [
  { id: 'setup', label: 'Włącz', icon: 'play-outline' },
  { id: 'teardown', label: 'Wyłącz', icon: 'stop-outline' },
  { id: 'persist', label: 'Autostart', icon: 'refresh-outline' },
];

export default function SetupScreen() {
  const colors = useColors();
  const [size, setSize] = usePersistentState<ZramSize>('zram.size', 3);
  const [algoId, setAlgoId] = usePersistentState<AlgoId>('zram.algo', 'lz4hc');
  const [mode, setMode] = useState<Mode>('setup');
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState<ZramSize | null>(null);

  const algo = algoById(algoId);
  const budget = computeBudget(pending ?? size, algo);

  const commands =
    mode === 'setup'
      ? setupCommands(size, algo)
      : mode === 'teardown'
        ? teardownCommands()
        : persistCommands(size, algo);

  const text = commands.join('\n');

  function pickSize(s: ZramSize) {
    if (s >= 4) {
      setPending(s);
      return;
    }
    setSize(s);
  }

  async function copy() {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Screen>
      <Card>
        <Text style={[styles.label, { color: colors.muted }]}>Rozmiar urządzenia zram</Text>
        <View style={styles.choices}>
          {ZRAM_SIZES_GIB.map((s) => {
            const active = s === size;
            const b = computeBudget(s, algo);
            const danger = b.verdict === 'cegla' || b.verdict === 'granica';
            return (
              <Pressable
                key={s}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => pickSize(s)}
                style={[
                  styles.choice,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}>
                <Text
                  style={[styles.choiceTitle, { color: active ? colors.onPrimary : colors.text }]}>
                  {s} GiB
                </Text>
                <Text
                  style={[
                    styles.choiceSub,
                    { color: active ? colors.onPrimary : danger ? colors.danger : colors.muted },
                  ]}>
                  {b.freeForAppsGib >= 0 ? `${b.freeForAppsGib.toFixed(2)} GiB wolne` : 'brak RAM'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <Text style={[styles.label, { color: colors.muted }]}>Algorytm kompresji</Text>
        {ALGOS.map((a) => {
          const active = a.id === algoId;
          return (
            <Pressable
              key={a.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => setAlgoId(a.id)}
              style={[styles.algoRow, { borderColor: active ? colors.primary : colors.border }]}>
              <Ionicons
                name={active ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={active ? colors.primary : colors.muted}
              />
              <View style={styles.algoBody}>
                <View style={styles.algoHead}>
                  <Text style={[styles.algoName, { color: colors.text }]}>{a.name}</Text>
                  {a.recommended ? (
                    <Text style={[styles.tag, { color: colors.success }]}>zalecany</Text>
                  ) : null}
                </View>
                <Text style={[styles.small, { color: colors.muted }]}>
                  {a.ratio}:1 · CPU ×{a.cpu} · {a.latencyUs} µs/stronę
                </Text>
              </View>
            </Pressable>
          );
        })}
      </Card>

      <Card>
        <Text style={[styles.label, { color: colors.muted }]}>Komendy</Text>
        <View style={styles.modes}>
          {MODES.map((m) => {
            const active = m.id === mode;
            return (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                onPress={() => setMode(m.id)}
                style={[
                  styles.modeBtn,
                  {
                    backgroundColor: active ? colors.primary : 'transparent',
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}>
                <Ionicons
                  name={m.icon}
                  size={16}
                  color={active ? colors.onPrimary : colors.muted}
                />
                <Text
                  style={[styles.modeLabel, { color: active ? colors.onPrimary : colors.muted }]}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View
          style={[styles.code, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.codeText, { color: colors.text }]} selectable>
            {text}
          </Text>
        </View>

        <Button
          title={copied ? 'Skopiowano' : 'Kopiuj komendy'}
          icon={copied ? 'checkmark' : 'copy-outline'}
          variant="secondary"
          onPress={copy}
        />
      </Card>

      <Card>
        <Text style={[styles.label, { color: colors.muted }]}>Tuning jądra</Text>
        <Text style={[styles.small, { color: colors.muted }]}>
          swappiness 100 — jądro chętnie przenosi zimne strony do zram, bo to tańsze niż
          ubijanie aplikacji. page-cluster 0 — odczyt jednej strony naraz; przy zram (brak
          seek) czytanie większych klastrów marnuje CPU.
        </Text>
      </Card>

      <Card>
        <Text style={[styles.label, { color: colors.muted }]}>Priorytety swap</Text>
        <Text style={[styles.small, { color: colors.muted }]}>
          zram: 100 · RAM Plus / karta: 10. Jądro zawsze sięga najpierw do wyższego
          priorytetu, więc zram wypełnia się przed UFS. Bez tego telefon swapuje na flash,
          mimo wolnego zram.
        </Text>
        <Text style={[styles.mono, { color: colors.warning }]}>
          swapon -p 100 /dev/block/zram0{'\n'}
          swapon -p 10 /dev/block/mmcblk1p2
        </Text>
      </Card>

      <ConfirmDialog
        visible={pending !== null}
        title={`zram ${pending ?? size} GiB na 4 GB RAM?`}
        message={`Zostaje ${budget.freeForAppsGib.toFixed(2)} GiB dla aplikacji — werdykt: ${budget.verdictLabel}. ${budget.verdictDetail}`}
        confirmTitle="Ustaw mimo to"
        cancelTitle="Anuluj"
        destructive
        onConfirm={() => {
          if (pending !== null) setSize(pending);
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  small: { fontSize: 13, lineHeight: 19 },
  mono: { fontSize: 12, lineHeight: 18, fontFamily: 'monospace' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: {
    flexGrow: 1,
    minWidth: 76,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  choiceTitle: { fontSize: 16, fontWeight: '700' },
  choiceSub: { fontSize: 11 },
  algoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.sm,
  },
  algoBody: { flex: 1, gap: 2 },
  algoHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  algoName: { fontSize: 15, fontWeight: '700' },
  tag: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  modes: { flexDirection: 'row', gap: spacing.xs },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: spacing.sm,
  },
  modeLabel: { fontSize: 13, fontWeight: '600' },
  code: { borderRadius: 12, borderWidth: 1, padding: spacing.sm },
  codeText: { fontSize: 11, lineHeight: 17, fontFamily: 'monospace' },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Card } from '@/components/ui';
import { spacing, useColors } from '@/constants/theme';
import { DEVICE } from '@/lib/zram';

const NO_ROOT = [
  {
    step: '1',
    title: 'Ustawienia → Pielęgnacja urządzenia → Pamięć',
    body: 'Samsung nazywa to RAM Plus. Suwak: 0 / 2 / 4 / 6 / 8 GB. Wybierz 2 GB — na 4 GB RAM więcej zaszkodzi.',
  },
  {
    step: '2',
    title: 'Restart telefonu',
    body: 'RAM Plus w One UI 7 działa od razu, ale wartość w /proc/swaps pojawi się po restarcie.',
  },
  {
    step: '3',
    title: 'Sprawdź, czy to zram',
    body: 'cat /proc/swaps pokaże plik na /data lub /dev/block/zram0. W RAM Plus Samsung używa pliku na UFS, nie zram — brak kompresji.',
  },
  {
    step: '4',
    title: 'ADB: co da się bez roota',
    body: 'adb shell cat /proc/meminfo, /proc/swaps, dumpsys meminfo, top. Zmiana zram wymaga roota — bez niego nie ma zapisu do /sys/block/zram0.',
  },
];

const LIMITS = [
  'Nie zmienisz algorytmu kompresji ani rozmiaru zram — to uprawnienia roota (CAP_SYS_ADMIN).',
  'Nie ustawisz priorytetu swap: Samsung trzyma RAM Plus na priorytecie domyślnym.',
  'Nie włączysz swap na karcie microSD — dodatkowo /sdcard to FUSE, a swapon na FUSE zwraca EINVAL.',
  'Nie wyłączysz LMK ani nie zmienisz swappiness (tylko do odczytu).',
];

export default function MoreScreen() {
  const colors = useColors();
  return (
    <Screen>
      <Card>
        <Text style={[styles.label, { color: colors.muted }]}>Wariant bez roota</Text>
        <Text style={[styles.small, { color: colors.muted }]}>
          Bez roota dostajesz tylko to, co dał Samsung. To wciąż działa — RAM Plus realnie
          zmniejsza liczbę ubijanych aplikacji.
        </Text>
      </Card>

      {NO_ROOT.map((s) => (
        <Card key={s.step}>
          <View style={styles.head}>
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.badgeText, { color: colors.onPrimary }]}>{s.step}</Text>
            </View>
            <Text style={[styles.stepTitle, { color: colors.text }]}>{s.title}</Text>
          </View>
          <Text style={[styles.small, { color: colors.muted }]}>{s.body}</Text>
        </Card>
      ))}

      <Card>
        <View style={styles.head}>
          <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
          <Text style={[styles.stepTitle, { color: colors.text }]}>Czego nie zrobisz bez roota</Text>
        </View>
        {LIMITS.map((l) => (
          <Text key={l} style={[styles.small, { color: colors.muted }]}>
            • {l}
          </Text>
        ))}
      </Card>

      <Card>
        <Text style={[styles.label, { color: colors.muted }]}>Wariant z rootem</Text>
        <Text style={[styles.small, { color: colors.muted }]}>
          Pełna kontrola: rozmiar, algorytm, swappiness, priorytety. Zakładka Konfiguracja
          generuje komendy. Kolejność ma znaczenie — algorytm ustawia się PRZED disksize;
          po ustawieniu rozmiaru jądro ignoruje zmianę algorytmu.
        </Text>
        <Text style={[styles.mono, { color: colors.primary }]} selectable>
          modprobe zram num_devices=1{'\n'}
          echo lz4hc &gt; /sys/block/zram0/comp_algorithm{'\n'}
          echo 3221225472 &gt; /sys/block/zram0/disksize{'\n'}
          mkswap /dev/block/zram0{'\n'}
          swapon -p 100 /dev/block/zram0
        </Text>
      </Card>

      <Card>
        <Text style={[styles.label, { color: colors.muted }]}>Powiązane pliki projektu</Text>
        <Text style={[styles.small, { color: colors.muted }]}>
          Ta aplikacja jest nakładką na wcześniejsze rozwiązanie zram dla A17: skrypty
          10_zram_setup.sh, 40_verify.sh, 60_noroot.sh oraz INSTRUKCJA.md i BUDZET.md
          z paczki helios-android-zram-a17.
        </Text>
      </Card>

      <Card>
        <Text style={[styles.label, { color: colors.muted }]}>Urządzenie docelowe</Text>
        <Text style={[styles.small, { color: colors.muted }]}>
          {DEVICE.model} · {DEVICE.soc} · {DEVICE.ramGb} GB ({DEVICE.ramGib} GiB) ·{' '}
          {DEVICE.storage} · {DEVICE.android} · {DEVICE.sdSlot}
        </Text>
      </Card>

      <Text style={[styles.version, { color: colors.muted }]}>
        RAM Plus A17 {Constants.expoConfig?.version ?? '1.0.0'} · pojemność logiczna, nie
        fizyczna
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  small: { fontSize: 13, lineHeight: 19 },
  mono: { fontSize: 12, lineHeight: 18, fontFamily: 'monospace' },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  stepTitle: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  version: { fontSize: 12, textAlign: 'center', paddingVertical: spacing.md },
});

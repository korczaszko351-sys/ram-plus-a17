import { Link } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/screen';
import { useColors } from '@/constants/theme';

export default function NotFoundScreen() {
  const colors = useColors();
  return (
    <Screen>
      <Text style={[styles.text, { color: colors.text }]}>Ten ekran nie istnieje.</Text>
      <Link href="/" style={[styles.text, { color: colors.primary }]}>
        Wróć do Budżetu
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 16, marginBottom: 12 },
});

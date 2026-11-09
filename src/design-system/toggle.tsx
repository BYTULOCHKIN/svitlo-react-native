import { StyleSheet, Switch, View } from 'react-native';
import { AppText } from './text';
import { metrics, palette, space } from './tokens';

type Props = { label: string; description?: string; value: boolean; onValueChange: (value: boolean) => void };

export function AppToggle({ label, description, value, onValueChange }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.text} accessible={false}>
        <AppText>{label}</AppText>
        {!!description && <AppText variant="caption" tone="secondary">{description}</AppText>}
      </View>
      <Switch accessibilityLabel={label} accessibilityHint={description} value={value} onValueChange={onValueChange} trackColor={{ false: palette.border, true: palette.green }} thumbColor={value ? palette.onAccent : palette.white} ios_backgroundColor={palette.border} style={styles.control} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: metrics.touchTarget },
  text: { flex: 1, gap: space.xs },
  control: { minHeight: metrics.touchTarget, minWidth: metrics.touchTarget },
});

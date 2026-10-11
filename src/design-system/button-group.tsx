import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { metrics, space } from './tokens';

export function AppButtonGroup({ children }: { children: [ReactNode, ReactNode] }) {
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < metrics.timerStackWidth || fontScale > metrics.timerStackFontScale;
  return (
    <View style={[styles.group, stacked && styles.stacked]}>
      <View style={!stacked && styles.item}>{children[0]}</View>
      <View style={!stacked && styles.item}>{children[1]}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { width: '100%', flexDirection: 'row', alignItems: 'stretch', gap: space.sm },
  stacked: { flexDirection: 'column' },
  item: { flex: 1, minWidth: 0 },
});

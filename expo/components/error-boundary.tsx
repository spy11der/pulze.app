import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error): void {
    console.log('AppErrorBoundary caught error', error.message);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false });
  };

  public render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container} testID="error-boundary">
          <Text style={styles.eyebrow}>Something went off-pulse</Text>
          <Text style={styles.title}>We hit a screen error.</Text>
          <Text style={styles.body}>Try reloading this view and keep exploring the city.</Text>
          <Pressable onPress={this.handleReset} style={styles.button} testID="error-reset-button">
            <Text style={styles.buttonText}>Reload view</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    gap: 10,
  },
  eyebrow: {
    color: Colors.aqua,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  body: {
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  button: {
    marginTop: 10,
    borderRadius: 18,
    backgroundColor: Colors.aqua,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: '800',
  },
});

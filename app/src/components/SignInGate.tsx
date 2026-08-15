import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "../state/auth";
import { useTheme } from "../theme/ThemeContext";
import { GoogleSignInButton } from "./GoogleSignInButton";

/** Blocks all children behind Google sign-in — nothing in the app renders without a session. */
export function SignInGate({ children }: { children: ReactNode }) {
  const { token, isReady } = useAuth();
  const { colors } = useTheme();

  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  if (!token) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={styles.logo}>🔮⚔️</Text>
        <Text style={[styles.title, { color: colors.text }]}>TCG Calendar App</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Magic and Flesh and Blood events near Timișoara, plus trips that drive you to every store in one go.
        </Text>
        <View style={styles.buttonWrap}>
          <GoogleSignInButton />
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 10,
  },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  subtitle: { fontSize: 14, textAlign: "center", lineHeight: 20, maxWidth: 320 },
  buttonWrap: { marginTop: 16, width: "100%", maxWidth: 320 },
});

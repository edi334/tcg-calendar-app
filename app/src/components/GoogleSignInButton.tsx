import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../state/auth";
import { useTheme } from "../theme/ThemeContext";

export function GoogleSignInButton() {
  const { signInWithGoogle, isSigningIn, isGoogleConfigured } = useAuth();
  const { colors } = useTheme();

  if (!isGoogleConfigured) {
    return (
      <View style={[styles.notice, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          Google sign-in isn't configured yet. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (see README) to enable it.
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={signInWithGoogle}
      disabled={isSigningIn}
    >
      {isSigningIn ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : (
        <>
          <Text style={styles.icon}>🔵</Text>
          <Text style={[styles.text, { color: colors.text }]}>Sign in with Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  icon: { fontSize: 16 },
  text: { fontSize: 15, fontWeight: "700" },
  notice: {
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

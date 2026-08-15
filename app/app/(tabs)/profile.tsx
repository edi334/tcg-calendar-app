import { useEffect, useState } from "react";
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMe, useUpdateProfile } from "../../src/api/client";
import { AddressAutocomplete } from "../../src/components/AddressAutocomplete";
import { NotificationPreferencesSection } from "../../src/components/NotificationPreferencesSection";
import { useAuth } from "../../src/state/auth";
import { useTheme } from "../../src/theme/ThemeContext";

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const { data: me } = useMe();
  const updateProfile = useUpdateProfile();

  const [homeAddress, setHomeAddress] = useState("");

  useEffect(() => {
    setHomeAddress(me?.homeAddress ?? "");
  }, [me?.homeAddress]);

  const dirty = homeAddress !== (me?.homeAddress ?? "");

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.profileHeader}>
          {me?.avatarUrl ? (
            <Image source={{ uri: me.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={{ fontSize: 24 }}>👤</Text>
            </View>
          )}
          <View>
            <Text style={[styles.name, { color: colors.text }]}>{me?.name}</Text>
            <Text style={[styles.email, { color: colors.textSecondary }]}>{me?.email}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Home address</Text>
          <Text style={[styles.helper, { color: colors.textSecondary }]}>
            Used as the starting point for "Drive there" on trips.
          </Text>
          <AddressAutocomplete
            value={homeAddress}
            onChange={setHomeAddress}
            placeholder="e.g. Strada Exemplu 1, Timișoara, Romania"
          />
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: dirty ? colors.tint : colors.surfaceAlt }]}
            disabled={!dirty || updateProfile.isPending}
            onPress={() => updateProfile.mutate({ homeAddress })}
          >
            <Text style={[styles.saveButtonText, { color: dirty ? colors.tintOn : colors.textSecondary }]}>
              {updateProfile.isPending ? "Saving…" : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        <NotificationPreferencesSection />

        <TouchableOpacity style={[styles.signOutButton, { borderColor: colors.border }]} onPress={signOut}>
          <Text style={{ color: colors.text, fontWeight: "700" }}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { padding: 16, gap: 20 },
  profileHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  name: { fontSize: 18, fontWeight: "700" },
  email: { fontSize: 13 },
  section: { gap: 6 },
  label: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  helper: { fontSize: 12 },
  saveButton: { paddingVertical: 12, borderRadius: 10, alignItems: "center", marginTop: 4 },
  saveButtonText: { fontWeight: "700", fontSize: 14 },
  signOutButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
});

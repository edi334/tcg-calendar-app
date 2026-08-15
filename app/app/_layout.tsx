import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { PushNotificationRegistrar } from "../src/components/PushNotificationRegistrar";
import { SignInGate } from "../src/components/SignInGate";
import { AuthProvider } from "../src/state/auth";
import { FiltersProvider } from "../src/state/filters";
import { ToastProvider } from "../src/state/toast";
import { ThemeProvider, useTheme } from "../src/theme/ThemeContext";

function ThemedStack() {
  const { scheme, colors } = useTheme();

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="event/[id]" options={{ title: "Event" }} />
        <Stack.Screen name="trip/[id]" options={{ title: "Trip" }} />
        <Stack.Screen name="oauthredirect" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <PushNotificationRegistrar />
            <FiltersProvider>
              <SignInGate>
                <ThemedStack />
              </SignInGate>
            </FiltersProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

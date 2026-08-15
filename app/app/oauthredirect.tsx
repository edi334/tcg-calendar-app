import { Redirect } from "expo-router";

// Landing route for the Google sign-in redirect (see src/state/auth.tsx —
// the native redirect URI is tcgcalendarapp:/oauthredirect). expo-auth-session's
// WebBrowser.maybeCompleteAuthSession() intercepts this URL and resolves the
// sign-in before this ever meaningfully renders; it exists only so
// expo-router has a matching route instead of showing "Unmatched Route".
export default function OAuthRedirectScreen() {
  return <Redirect href="/" />;
}

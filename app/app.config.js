// google-services.json is gitignored (this repo is public), so EAS cloud
// builds can't see it via the static path in app.json. Locally, Expo still
// resolves the "./google-services.json" default from app.json fine. On EAS,
// GOOGLE_SERVICES_JSON is a file-type env var — EAS downloads the uploaded
// file to a temp path at build time and points the env var at it.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? config.android.googleServicesFile,
  },
});

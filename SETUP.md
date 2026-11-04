# GitHub Pages + Firebase Spark

## GitHub Pages

1. Create a public repository called `Academica` in your GitHub account.
2. Push/upload all source files, including `.github/workflows/pages.yml`, `pnpm-lock.yaml`, and the configuration files. Do not upload `node_modules`, `work`, or generated vendor directories.
3. Open repository Settings → Pages → Build and deployment → Source → **GitHub Actions**.
4. The included workflow builds and publishes the static website after a push to `main`.

## Firebase (no billing account)

1. Select or create a Firebase project on **Spark**. Do not upgrade to Blaze for this version.
2. Register a web app, and copy its public web configuration into `public/firebase-config.js`:

```js
window.ACADEMICA_FIREBASE_CONFIG = {
  apiKey: 'your public web API key',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project',
  appId: 'your web app ID'
};
```

These web configuration fields are public identifiers, not service-account credentials. Never commit a service-account key or an account password.

3. Enable Authentication → Sign-in method → Email/Password. Add `halowars.github.io` to Authentication's authorized domains where needed.
4. Create the default Cloud Firestore database. Select an appropriate region; the region cannot be changed later without migration. Use production rules rather than an open test database.
5. For a **new dedicated project**, publish the supplied `firestore.rules` through Firebase Console or `firebase deploy --only firestore:rules --project YOUR_PROJECT_ID` using an authenticated Firebase CLI.
6. For an **existing project**, merge the `academicaUsers` match blocks into its existing rules. Do not replace Linea's or another app's rules. Academica uses a separate collection prefix.
7. Commit the web configuration. GitHub Actions rebuilds the site.
8. Open Save & sync in the outline and sign in or create an account. Verify that the footer reports **Saved to cloud**. If it instead says cloud unavailable, inspect the visible error and Firebase rules/configuration before relying on cross-device sync.

A configuration file alone does not deploy the database or rules. A connected Firebase integration can complete these account steps after project access is available.

## Existing drafts

The old ChatGPT-hosted app and GitHub Pages have different browser storage origins. Download a Project backup from the old workspace, then use Paper library → Open backup in this version. This imports a separate copy with source metadata and private notes. Do not upload manuscript backups to a public source repository.

## Free-plan limits

This app uses Firestore documents below 840 KB of encoded project JSON, leaving room for fields and Firestore overhead. Firebase's free quotas apply. Large images and long extracted PDFs can exceed the limit; the app preserves the local copy and reports the cloud failure. Images are embedded rather than using billed Cloud Storage. PDF originals stay local; only extracted text/source details are in the project backup. Full browser-independent article scraping is not possible on GitHub Pages + Spark without another service; DOI and exact PII metadata resolution work without a scraper.

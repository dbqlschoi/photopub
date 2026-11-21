# Photo Calendar — public version (photopub)

The public, no-account version of Photo Calendar. Anyone can open the link and install it.
**All photos and data stay on each person's own phone** (browser IndexedDB). Nothing is sent to a server,
so it uses none of the owner's Firebase database or storage. Only the app files are served from Firebase Hosting.

Features: multiple people with names and colours, several photos per day, crop/resize, notes,
live-stream marker, month image (📸), stats, Korean/English, Backup/Restore (.zip), install help for Android and iPhone.

## Hosting setup (one time)

1. Firebase project `photopub-c4878`: Build → **Hosting** → Get started (click through). No Authentication, Firestore or Storage needed.
2. Project settings → **Service accounts** → **Generate new private key**.
3. GitHub repo → Settings → Secrets and variables → Actions → New repository secret:
   name `FIREBASE_SERVICE_ACCOUNT`, value = the whole JSON file.

Every push to `main` then builds and deploys to https://photopub-c4878.web.app.
Until the secret exists, the workflow skips the deploy.

Hosting use doesn't grow with the number of users' photos: the app is ~40 KB gzipped and is cached on each phone after the first visit.

## Backups

Because data lives only on the phone, users should use **Backup** (People tab) to save a `.zip`
(data.json + photos) to Google Drive, KakaoTalk, email, etc. **Restore** replaces everything on the phone with a backup.
The app reminds users when it has been over 30 days since the last backup.

## Develop

```bash
npm install
npm run dev
```

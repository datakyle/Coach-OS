# Turning on the team playbook

Takes about 15 minutes, once. Until it is done the site works normally, just
without the team features.

When it is done there is one password. Anyone who signs in with it can see,
share and remove team plays and published practices. Without it, the site
shows no team plays or practices at all.

## 1. Make a Firebase project

1. Go to <https://console.firebase.google.com> and click **Create a project**.
   Name it anything, e.g. `coach-os`. Turn Google Analytics **off**. The
   free Spark plan is plenty.
2. Left sidebar: **Build → Firestore Database → Create database**. Pick
   **Production mode** and the closest region.
3. Left sidebar: **Build → Authentication → Get started**. Under **Sign-in
   method**, pick **Email/Password**, switch the first toggle on (leave
   "Email link" off), and **Save**.

## 2. Lock down sign-ups

Still in Authentication: **Settings** tab → **User actions** → untick
**Enable create (sign-up)** → **Save**.

This stops anyone else making accounts in your project. The rules in step 6 keep
them out anyway, but this way they cannot even try.

## 3. Create the account

Authentication → **Users** tab → **Add user**:

| Email | Password |
|---|---|
| `coach@coach-os.app` | your **Coach OS password** |

The email is a label that never receives mail. Type it exactly as shown,
because `js/firebase-config.js` and `firestore.rules` look for it.

The password must be at least 6 characters. People only ever type the password.

## 4. Register a web app and get the config

1. Project Overview (the house icon) → **Add app** → the **`</>`** web icon.
2. Nickname it `coach-os`. Do **not** tick Firebase Hosting. **Register app**.
3. You get a `firebaseConfig` block. You only need two lines from it:

```js
apiKey: "AIzaSy...",
projectId: "coach-os-12345",
```

Put them into `js/firebase-config.js`, replacing `YOUR_WEB_API_KEY` and
`YOUR_PROJECT_ID`, and commit. (Or send them to Claude and it will do it.)

That API key is not a secret. Google ships it in the page source of every
Firebase web app. The password and the rules are what protect you.

## 5. Allow the live site to sign in

Authentication → **Settings** → **Authorized domains** → **Add domain** →
`datakyle.github.io`.

## 6. Paste the rules

Firestore Database → **Rules** tab → replace everything with the contents of
`firestore.rules` in this repo → **Publish**.

If you ever update the app and `firestore.rules` changed, paste it in again.

## 7. Use it

Open the live site and tap **Sign in** at the bottom of the sidebar. Type the
password. When your phone or browser offers to save it, say yes: next time on
that device, and on your other devices signed in to the same Apple or Google
account, it fills itself in. Each device stays signed in until you tap
**Signed in · sign out**, or you change the password.

- **Play Library** shows **Team plays** above **My plays**. Pick one to watch it
  run. **Share with team** puts one of your plays in the team library;
  **Remove from team** takes a shared one out.
- **Practice Plan → Publish** shows the day as a one-page sheet. **Publish to
  team** puts it under **Published practices** on every signed-in device, and
  anyone can download the PDF.

## Forgot the password, or changing it

Authentication → **Users** → the `coach@coach-os.app` row's **⋮** menu →
**Delete account**, then **Add user** again with the same email and a new
password. Nothing shared is lost: plays and practices live in Firestore, not in
the account. (The console's "Reset password" sends an email, which this account
cannot receive, so do not use it.)

Every device signed in with the old password is signed out within the hour and
asked for the new one.

## What this does and does not protect

Shared plays and practices can only be read or changed by someone signed in
with the password. Firebase also slows down anyone who keeps guessing.

Everyone with the password can change everything, so give it only to people
you trust to edit the playbook. If you later want a view-only password for
players, that can be added back.

Plays in `data/plays.json` in this repo are **not** behind the password. That file
is public on GitHub. Put team plays in the Team library, not there.

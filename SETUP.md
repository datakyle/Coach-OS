# Turning on the team playbook

Takes about 15 minutes, once. Until it is done the site works normally and the
Team panel just shows these steps.

When it is done there are two codes:

| Code | Who gets it | What it does |
|---|---|---|
| **Team code** | Players | See the shared plays, open them on the Clipboard and run them |
| **Coach code** | You and your staff | All of that, plus upload and remove plays |

Without a code, the site shows no team plays at all.

## 1. Make a Firebase project

1. Go to <https://console.firebase.google.com> and click **Create a project**.
   Name it anything, e.g. `coaches-corner`. Turn Google Analytics **off**. The
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

## 3. Create the two accounts

Authentication → **Users** tab → **Add user**, twice:

| Email | Password |
|---|---|
| `team@coaches-corner.app` | your **team code** |
| `coach@coaches-corner.app` | your **coach code** |

The emails are labels that never receive mail. Type them exactly as shown,
because `js/firebase-config.js` and `firestore.rules` look for them.

Codes must be at least 6 characters and the two must be different. Pick
things that are easy to say out loud at practice: `huskies-ball-26` for players,
something nobody would guess for coaches. People only ever type the code.

## 4. Register a web app and get the config

1. Project Overview (the house icon) → **Add app** → the **`</>`** web icon.
2. Nickname it `coaches-corner`. Do **not** tick Firebase Hosting. **Register app**.
3. You get a `firebaseConfig` block. You only need two lines from it:

```js
apiKey: "AIzaSy...",
projectId: "coaches-corner-12345",
```

Put them into `js/firebase-config.js`, replacing `YOUR_WEB_API_KEY` and
`YOUR_PROJECT_ID`, and commit. (Or send them to Claude and it will do it.)

That API key is not a secret. Google ships it in the page source of every
Firebase web app. The codes and the rules are what protect you.

## 5. Allow the live site to sign in

Authentication → **Settings** → **Authorized domains** → **Add domain** →
`datakyle.github.io`.

## 6. Paste the rules

Firestore Database → **Rules** tab → replace everything with the contents of
`firestore.rules` in this repo → **Publish**.

## 7. Use it

Open the live site → **Play Library** tab → **Team** panel → type a code →
**Sign in**. Each device stays signed in until someone taps **Sign out** or you
change the code.

- **Coaches** see an **Upload** button on each of their own plays, and an
  **×** on shared plays to remove them.
- **Players** see the shared list. **View** opens a play on the Clipboard,
  where **Play** runs it. **Pull** saves a copy on their device.

## Changing a code

If a code leaks, or at the start of a new season: Authentication → **Users** →
the account's **⋮** menu → **Delete account**, then **Add user** again with the
same email and the new code. (The console's "Reset password" sends an email,
which these accounts cannot receive, so do not use it.)

Every device signed in with the old code is signed out within the hour and
asked for the new one.

## What this does and does not protect

Shared plays can only be read by someone signed in with one of your two codes,
and only the coach code can change them. Firebase also slows down anyone who
keeps guessing codes.

The team code is shared by the whole roster, so treat it like a locker combo,
not a bank password: once a player knows it, so can anyone they tell. Change it
when that matters.

Plays in `data/plays.json` in this repo are **not** behind the code. That file
is public on GitHub. Put team plays in the Team library, not there.

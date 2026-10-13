# Turning on the shared play library

Takes about 15 minutes, once. Until it is done the site works normally and the
Team panel just shows these steps.

## 1. Make a Firebase project

1. <https://console.firebase.google.com> → **Add project**. Name it anything.
   Turn Google Analytics **off**, you do not need it.
2. In the left sidebar: **Build → Firestore Database → Create database**.
   Pick **Production mode** and whatever region is closest.

## 2. Register a web app

1. Project Overview → the **`</>`** (web) icon.
2. Nickname it `coaches-corner`. Do **not** tick Firebase Hosting.
3. You get a config block. You only need two lines out of it:

```js
projectId: "something-12345"
apiKey: "AIzaSy..."
```

Put those into `js/firebase-config.js` in this repo, replacing the
`YOUR_PROJECT_ID` and `YOUR_WEB_API_KEY` placeholders, and commit.

That API key is not a secret. Google ships it in the page source of every
Firebase web app on the internet. The rules below are what actually protect you.

## 3. Pick a team code and store its hash

The code is the thing you give your assistant coaches. Pick something easy to
say out loud. `go-huskies-26`, whatever.

Get its hash: open the live site, open the browser console, and run

```js
Cloud.setCode("your-team-code");
crypto.subtle.digest("SHA-256", new TextEncoder().encode("coaches-corner:your-team-code"))
  .then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2,"0")).join("")));
```

Copy the long hex string it prints.

In the Firestore console: **Start collection** → collection id `config` →
document id `team` → add one field, name `codeHash`, type `string`, value = the
hex string. Save.

## 4. Paste the rules

Firestore Database → **Rules** tab → replace everything with the contents of
`firestore.rules` in this repo → **Publish**.

## 5. Use it

Play Library tab → Team panel → type the team code once per device. Upload
pushes a play up, Pull brings one down into your library.

## What this does and does not protect

The code stops strangers writing plays into your library. It does **not** hide
them: anyone who finds the site URL can read the shared plays. That is the right
trade for a coaching board, but do not put anything in there you would mind an
opposing coach seeing.

If the code ever leaks, change it: pick a new one, recompute the hash, update the
`config/team` document, and tell your staff.

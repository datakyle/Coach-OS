/* Firebase project config. projectId and apiKey are NOT secrets: Google ships
   them in the page source of every Firebase web app. What keeps your plays
   private is the two codes, which live in Firebase Auth as passwords, and
   firestore.rules.

   coachEmail is the one account you create in the Firebase console
   (Authentication -> Users). Its password is the Coach OS password. Nobody
   types the email; it is also what password managers save the password under.
   If you change it here, change it in firestore.rules too.

   To fill this in, see SETUP.md. Until projectId is real, the Team panel in the
   Play Library tab just shows the setup steps and everything else works as usual. */
window.FIREBASE = {
  projectId: "coach-os-2d196",
  apiKey: "AIzaSyDLECyHLVHZt45mH7HPc0cOfGC9bfhhdLY",
  coachEmail: "coach@coach-os.app"
};

// Sine-set ang role (admin, chairman o student) ng isang user na nasa Firebase Authentication na.
//
// Gamit:
//   npm run set-role -- <email> [admin|chairman|student]
//   hal. npm run set-role -- teacher@uep.edu.ph admin
//
// Para gumawa ng bagong admin account mula sa wala, gamitin ang `npm run create-admin`.

import { assignRole, findUserByEmail, initFirebase, ROLES } from "./lib/firebase.mjs";

const [rawEmail, role = "admin"] = process.argv.slice(2);
if (!rawEmail || !ROLES.includes(role)) {
  console.error("Gamit: npm run set-role -- <email> [admin|chairman|student]");
  process.exit(1);
}
const email = rawEmail.trim().toLowerCase();

const firebase = initFirebase();
const user = await findUserByEmail(firebase.auth, email);
if (!user) {
  console.error(`Walang user na "${email}" sa Firebase Authentication.`);
  console.error("Gumawa muna sa Firebase Console > Authentication > Users > Add user, o gamitin ang `npm run create-admin`.");
  process.exit(1);
}

await assignRole(firebase, user, role);

console.log(`✔ Si ${email} (uid ${user.uid}) ay "${role}" na.`);
console.log("Kung naka-login na siya, mag-sign out at mag-login ulit para gumana ang bagong role.");

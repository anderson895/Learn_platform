// Gumagawa ng generic na admin account sa isang takbo:
//   Firebase Auth user + random na password + role claim + `accounts/{uid}`.
//
// Gamit:
//   npm run create-admin
//   npm run create-admin -- --email admin@learnplatform.local --name "Administrator"
//   npm run create-admin -- --password "SariliKongPassword123!"
//   npm run create-admin -- --reset-password      # bagong random password sa umiiral na admin
//
// Default na email: admin@learnplatform.local
// Kapag umiiral na ang user, hindi binabago ang password maliban kung may --reset-password o --password.

import { randomInt } from "node:crypto";
import { assignRole, findUserByEmail, initFirebase } from "./lib/firebase.mjs";

const DEFAULT_EMAIL = "admin@learnplatform.local";
const DEFAULT_NAME = "Administrator";

function parseArgs(argv) {
  const options = { email: DEFAULT_EMAIL, name: DEFAULT_NAME, password: undefined, resetPassword: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (!value || value.startsWith("--")) {
        console.error(`Kulang ang value ng ${arg}.`);
        process.exit(1);
      }
      return value;
    };
    if (arg === "--email") options.email = next().trim().toLowerCase();
    else if (arg === "--name") options.name = next().trim();
    else if (arg === "--password") options.password = next();
    else if (arg === "--reset-password") options.resetPassword = true;
    else {
      console.error(`Hindi kilalang option: ${arg}`);
      console.error("Gamit: npm run create-admin -- [--email <email>] [--name <pangalan>] [--password <password>] [--reset-password]");
      process.exit(1);
    }
  }
  if (options.password !== undefined && options.password.length < 8) {
    console.error("Dapat hindi bababa sa 8 character ang password.");
    process.exit(1);
  }
  return options;
}

/** 16 na character na may malaki at maliit na titik, numero at simbolo. Walang nakakalitong 0/O at 1/l/I. */
function generatePassword(length = 16) {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "!@#$%*-_+?"];
  const all = sets.join("");
  const chars = sets.map((set) => set[randomInt(set.length)]);
  while (chars.length < length) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

const options = parseArgs(process.argv.slice(2));
const firebase = initFirebase();

let user = await findUserByEmail(firebase.auth, options.email);
let password = null;
let created = false;

if (!user) {
  password = options.password ?? generatePassword();
  user = await firebase.auth.createUser({
    email: options.email,
    password,
    displayName: options.name,
    emailVerified: true,
  });
  created = true;
} else if (options.password || options.resetPassword) {
  password = options.password ?? generatePassword();
  user = await firebase.auth.updateUser(user.uid, { password });
}

await assignRole(firebase, user, "admin", options.name);

console.log("");
console.log(created ? "✔ Nagawa ang admin account" : "✔ Umiiral na ang account; admin na ito ngayon");
console.log(`  Email:    ${options.email}`);
if (password) {
  console.log(`  Password: ${password}`);
  console.log("");
  console.log("  Ngayon lang ipapakita ang password. I-save ito sa ligtas na lugar.");
  console.log("  Huwag itong i-commit, at palitan ito pagkatapos ng unang login.");
} else {
  console.log("  Password: (hindi binago; gamitin ang --reset-password para gumawa ng bago)");
}
console.log(`  UID:      ${user.uid}`);
console.log(`  Project:  ${firebase.projectId}`);

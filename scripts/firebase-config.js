// ═══════════════════════════════════════════════════
//  VENUS GYM — Firebase Configuration
//  Replace ALL values below with your actual
//  Firebase project credentials.
// ═══════════════════════════════════════════════════

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAVz09X6t6h4AnIUyl8CSpHNWgsLwjAqRk",
  authDomain:        "venusgym-5c509.firebaseapp.com",
  databaseURL:       "https://venusgym-5c509-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "venusgym-5c509",
  storageBucket:     "venusgym-5c509.firebasestorage.app",
  messagingSenderId: "694873396897",
  appId:             "1:694873396897:web:ea68b2d124070a09ac42e0"
};

// ── Firestore Collection Names ──────────────────────
const COL = {
  USERS:         "users",
  SUBSCRIBERS:   "subscribers",
  COACHES:       "coaches",
  SPORTS:        "sports",
  SUBSCRIPTIONS: "subscriptions",
  PAYMENTS:      "payments",
  PRODUCTS:      "products",
  SALES:         "sales",
  DIET_PLANS:    "diet_plans",
  WORKOUT_PLANS: "workout_plans",
  ACTIVITIES:    "activities",
  SETTINGS:      "settings",
  NOTIFICATIONS: "notifications"
};

// ── Role Definitions ────────────────────────────────
const ROLES = {
  SUPER_ADMIN: "super_admin",   // Full access + user management
  ADMIN:       "admin",         // Full access, no user creation
  COACH:       "coach",         // Own subscribers + diet/workout
  RECEPTIONIST:"receptionist",  // Subscribers + subscriptions + POS
  SUBSCRIBER:  "subscriber"     // Own profile + plans only
};

// ── Role Permissions Map ────────────────────────────
const PERMISSIONS = {
  super_admin:   ["*"],  // wildcard = all
  admin:         ["dashboard","subscribers","coaches","sports","subscriptions","pos","reports","diet","settings_gym"],
  // NOTE: "backup" is intentionally left out of every role except super_admin — the
  // restore action can overwrite or wipe live data, so access stays with the highest role.
  coach:         ["dashboard","subscribers_view","subscriptions_view","diet","workout"],
  receptionist:  ["dashboard","subscribers","subscriptions","pos"],
  subscriber:    ["my_profile","my_plan"]
};

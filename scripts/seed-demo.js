#!/usr/bin/env node
// بينشئ حساب تجربة مليان بيانات (مصاريف، عادات، أهداف، مهام، يوميات، صحة)
// عشان تشوف التطبيق شغّال من غير ما تكلّم الـ AI.
// الاستخدام: node scripts/seed-demo.js [email] [password]
import crypto from "node:crypto";
import {
  countAdmins,
  createAdmin,
  createEmailUser,
  getUserByEmail,
  localToday,
} from "../src/db.js";
import { config } from "../src/config.js";

const EMAIL = (process.argv[2] || "demo@dawenli.app").toLowerCase();
const PASSWORD = process.argv[3] || "demo1234";

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(pw), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function daysAgo(n) {
  const d = new Date(localToday() + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// كلمة السر لازم تتحط في الداتا بيز بعد إنشاء الحساب (createEmailUser بياخد الهاش)
let user = getUserByEmail(EMAIL);
if (!user) {
  user = createEmailUser({ name: "حساب التجربة", email: EMAIL, passwordHash: hashPassword(PASSWORD) });
}
if (!user) {
  console.error("تعذّر إنشاء الحساب");
  process.exit(1);
}
const userId = user.id;

// الأدمن الافتراضي لازم يكون موجود عشان تقدر تدخل لوحة الأدمن
if (countAdmins() === 0 && config.dashboardPassword) {
  createAdmin({ username: "admin", passwordHash: hashPassword(config.dashboardPassword) });
  console.log("👤 اتعمل أدمن: admin");
}

// ── نستورد الدوال بعد ما نتأكد من الحساب
const db = await import("../src/db.js");

// مصاريف آخر أسبوعين
const expenses = [
  [0, 120, "غدا برّه"],
  [1, 45, "مواصلات"],
  [2, 260, "بقالة الأسبوع"],
  [3, 80, "قهوة"],
  [4, 1500, "فاتورة الكهرباء"],
  [5, 60, "تاكسي"],
  [6, 340, "أكل سوبرماركت"],
  [7, 90, "سينما"],
  [8, 55, "مواصلات"],
  [10, 700, "ملابس"],
  [12, 220, "مطعم"],
];
const income = [
  [1, 12000, "المرتب"],
  [9, 1500, "شغل فريلانس"],
];

for (const [ago, amount, note] of expenses) {
  db.addFinance({ userId, entryDate: daysAgo(ago), direction: "expense", amount, currency: "EGP", note });
}
for (const [ago, amount, note] of income) {
  db.addFinance({ userId, entryDate: daysAgo(ago), direction: "income", amount, currency: "EGP", note });
}

// عادات
const habits = [
  { title: "أشرب ٢ لتر ماية", emoji: "💧" },
  { title: "أتمشى نص ساعة", emoji: "🚶" },
  { title: "مفيش سكر", emoji: "🍬", kind: "quit" },
];
for (const h of habits) {
  const habit = db.addHabit({ userId, ...h });
  if (!habit?.id) continue;
  // ستريك على مدى الأيام الأخيرة
  for (let i = 0; i < 6; i++) db.logHabit(habit.id, daysAgo(i));
}

// أهداف
db.applyGoal({ userId, title: "أوفّر 30 ألف جنيه", target: 30000, addAmount: 8500, unit: "جنيه", period: "month" });
db.applyGoal({ userId, title: "أقرأ 12 كتاب السنة دي", target: 12, addAmount: 4, unit: "كتاب", period: "year" });

// مهام
db.addTask({ userId, title: "ميتنج الفريق", dueDate: daysAgo(0), dueTime: "17:00" });
db.addTask({ userId, title: "أروح الجيم", dueDate: daysAgo(0), dueTime: "19:30" });
db.addTask({ userId, title: "تسليم المشروع", dueDate: daysAgo(-2) });
db.addTask({ userId, title: "أجدد الرخص", dueDate: daysAgo(-5) });

// يوميات وصحة
db.upsertJournalForDay({
  userId,
  entryDate: localToday(),
  mood: "مرتاح",
  summary: "يوم هادي، خلّصت شغل كتير واتمشيت.",
  tags: "شغل,رياضة",
  transcript: "النهاردة صحيت بدري وخلّصت شغل كتير واتمشيت نص ساعة في النادي.",
});
db.addHealth({ userId, entryDate: localToday(), category: "نوم", detail: "نمت 7 ساعات" });
db.addHealth({ userId, entryDate: localToday(), category: "تمرين", detail: "مشي 30 دقيقة" });

console.log(`✅ حساب التجربة جاهز: ${EMAIL} / ${PASSWORD}`);
console.log(`   استخدمه من صفحة /login`);

# Ayla hisob-kitob

Ayla poyabzal ishlab chiqarish uchun hisob ilovasi. iPhone va Android'da brauzer orqali ishlaydi, "Bosh ekranga qo'shish" bilan oddiy ilova kabi ochiladi.

## Bo'limlar

- **Asosiy**: sof foyda, sotuv, tannarx, xarajatlar, qarzlar, oxirgi 6 oy.
- **Ombor**: xom ashyo kirimi va chiqimi, qoldiq, o'rtacha narx, kam qolganlar.
- **Modellar**: 1 juftga ketadigan xom ashyo va ish haqi, tannarx va foyda; "Ishlab chiqarildi" xom ashyoni ombordan ayiradi.
- **Ishchilar**: donabay ish haqi, avans va to'lovlar, kimga qancha qarz.
- **Mijozlar**: mijozlar bazasi (tur, viloyat, telefon, Telegram, izoh), qidiruv, sotuv va to'lovlar, qarzdorlik.

## Fayllar

| Fayl | Nima uchun |
|---|---|
| `index.html` | Sahifa qobig'i: sarlavha, pastki menyu |
| `app.css` | Dizayn (Ayla ranglari: qizil `#b40000`, qora, oq) |
| `app.js` | Butun mantiq: hisob-kitob, bo'limlar, formalar, Firebase bilan ishlash |
| `firebase-config.js` | Firebase loyihasi sozlamalari (ochiq ma'lumot, maxfiy emas) |
| `firestore.rules` | Baza xavfsizlik qoidalari (Firebase konsoliga qo'yiladi) |
| `sw.js`, `manifest.webmanifest`, ikonkalar (`icon-*.png`) | Telefonga o'rnatish va oflayn ishlash |

## Kirish va huquqlar

- Birinchi ro'yxatdan o'tgan odam **egasi (admin)** bo'ladi.
- Yangi xodim "Ro'yxatdan o'tish"ni bosib login va parol tanlaydi; admin **Sozlamalar** bo'limida tasdiqlaydi.
- Admin hamma narsani o'chira oladi; xodim kiritadi va faqat o'zi kiritgan yozuvni o'chira oladi.

## Ma'lumotlar tuzilishi (Firestore to'plamlari)

`mat` xom ashyo · `mv` ombor harakati · `mdl` model · `prd` ishlab chiqarish · `wkr` ishchi · `job` bajarilgan ish · `pay` ishchiga to'lov · `cst` mijoz · `sale` sotuv · `cpay` mijoz to'lovi · `exp` xarajat · `members` foydalanuvchilar · `requests` kutilayotgan so'rovlar · `config/owner` egasi.

## Keyinchalik Claude bilan yangi imkoniyat qo'shish

1. claude.ai → Settings → Connectors bo'limida GitHub'ni ulang.
2. Claude'ga shu repozitoriy nomini ayting va nima kerakligini yozing, masalan: "Mijozlarga SMS eslatma qo'sh" yoki "Razmerlar bo'yicha ombor hisobi kerak".
3. Claude o'zgarishni kiritib, shu yerga yuboradi; sayt bir-ikki daqiqada yangilanadi.

Yangi bo'lim qo'shish uchun `app.js` boshidagi izohga qarang: `VIEWS` ro'yxati, `render()` dagi xarita va kerak bo'lsa `COLS` ga yangi to'plam (uni `firestore.rules` dagi `biz()` ro'yxatiga ham qo'shish kerak).

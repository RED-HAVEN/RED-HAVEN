# إعداد قائمة OWNERS

## الخيار الموصى به لاستضافة GitHub Pages

أضف محتويات مجلد الموقع إلى جذر مستودع GitHub، بما فيها المجلدان المخفيان `.github` و`scripts`. يتضمن الموقع GitHub Action باسم `Refresh Discord owners list` يعمل كل 15 دقيقة ويحدّث `owners.json`، الذي يقرأه الموقع لعرض الأسماء والصور.

1. في المستودع، افتح **Settings → Secrets and variables → Actions → New repository secret**.
2. أنشئ Secret بالاسم `DISCORD_BOT_TOKEN` وأدخل **التوكن الجديد** هناك. لا تضفه إلى ملفات الموقع ولا إلى GitHub Pages settings.
3. تأكد من أن GitHub Actions مسموح لها بتحديث المستودع (**Actions → General → Workflow permissions → Read and write permissions** إذا كان المستودع يطلب تفعيلها).
4. فعّل **Server Members Intent** للبوت وأضفه إلى السيرفر. بعد رفع الملفات شغّل الإجراء يدوياً مرة من **Actions → Refresh Discord owners list → Run workflow**؛ وبعدها يعمل تلقائياً كل 15 دقيقة.
5. اجعل GitHub Pages ينشر من الفرع الذي يحتوي ملفات الموقع. كلما تغيّرت قائمة OWNERS، يحدّث الإجراء `owners.json` ويرفع التغيير، ثم ينشر GitHub Pages النسخة الجديدة.

توكن البوت يبقى داخل GitHub Actions Secret، ويستخدمه الإجراء فقط؛ الأسماء والصور الناتجة في `owners.json` ستكون عامة على الموقع. إذا سبق أن شاركت التوكن، أبطله وأنشئ توكناً جديداً قبل إضافته.

## خيار بديل: Cloudflare Worker

إذا لم ترغب في تشغيل GitHub Action، فالملف `discord-owners-worker.js` واجهة خلفية بديلة؛ خزّن التوكن كـ Secret في Cloudflare Worker ولا تضعه في الموقع.

## إعداد Discord

1. أنشئ تطبيقاً وبوتاً من [Discord Developer Portal](https://discord.com/developers/applications).
2. من إعدادات البوت فعّل **Server Members Intent**. هذا الـ Intent مطلوب لقراءة قائمة أعضاء السيرفر من API Discord. [شرح Discord الرسمي](https://support-dev.discord.com/hc/en-us/articles/6207308062871-What-are-Privileged-Intents)
3. أضف البوت إلى سيرفر Red Haven. لا تضع له صلاحيات إدارة؛ يحتاج أن يكون عضواً في السيرفر مع تفعيل الـ Intent.

### نشر الواجهة الخلفية على Cloudflare

1. أنشئ Cloudflare Worker جديداً وانسخ محتوى `discord-owners-worker.js` إليه.
2. لا تستخدم أي توكن أُرسل في محادثة أو أُضيف إلى ملف. إذا سبق وشاركته، أبطله وأنشئ بديلاً من Developer Portal. خزّن `DISCORD_BOT_TOKEN` كـ **Secret** في Cloudflare، وليس كمتغير مكشوف ولا داخل ملفات الموقع. عبر Wrangler استخدم `npx wrangler secret put DISCORD_BOT_TOKEN`، ثم أدخل التوكن الجديد في المطالبة التفاعلية.
3. أضف المتغيرين `GUILD_ID` و`OWNERS_ROLE_ID`. قيمة `OWNERS_ROLE_ID` جاهزة: `1547031412547260427`؛ ضع معرّف السيرفر في `GUILD_ID`.
4. انشر Worker وانسخ عنوانه العام.
5. افتح `script.js` وضع العنوان في `ownersApiEndpoint` بدلاً من النص الفارغ، ثم ارفع ملفات الموقع إلى GitHub Pages.

الواجهة تعرض الاسم الظاهر (اللقب في السيرفر إن وجد) وصورة Discord. الاستجابة مخزنة مؤقتاً لدقيقتين، ولا يعرض هذا الـ Worker أي بيانات أخرى عن الأعضاء. لا ترسل توكن البوت في المحادثة أو تضعه في ملفات الموقع.

# Supabase kurulumu

Bu proje iki modda açılır. `.env` ayarlanmamışsa eski mock arayüz çalışır. Geçerli Supabase URL ve publishable key ayarlandığında giriş/kayıt ekranı açılır ve aşağıdaki özellikler veritabanına bağlanır.

1. Supabase projesi oluşturun. SQL Editor'da [`supabase/schema.sql`](supabase/schema.sql) dosyasını çalıştırın. Bu işlem dört tabloyu, Auth kayıt tetikleyicisini, Storage kovalarını, izinleri ve RLS politikalarını kurar.
2. `.env.example` dosyasını `.env` olarak kopyalayın. Supabase Dashboard > Settings > API bölümündeki proje kök URL'sini (`https://PROJE_REF.supabase.co`) ve **publishable** key'i girin. URL'nin sonuna `/rest/v1/` veya `/auth/v1/` eklemeyin; SDK gerekli yolları kendisi oluşturur. Service role / secret key'i Expo uygulamasına koymayın.
3. `npx.cmd supabase login` ve `npx.cmd supabase functions deploy profile-api --project-ref PROJE_REF --use-api` komutlarını çalıştırın. `supabase/config.toml` bu projede hazırdır; `--use-api` Docker gerektirmeden dağıtır. Edge Function, barındırılan Supabase ortamında `SUPABASE_SECRET_KEYS` veya eski `SUPABASE_SERVICE_ROLE_KEY` ortam sırrını kullanır.
4. İlk hesabı uygulamadan kaydedin. E-posta doğrulaması açıksa gelen bağlantıyı onaylayın. İlk admini SQL Editor'da `update public.profiles set role = 'admin' where id = 'AUTH_USER_UUID';` ile atayın. Rolü istemciden vermeyin.
5. `npm.cmd start` ile Expo'yu başlatın.

Kayıtta `Invalid path specified in request URL` görülürse `.env` içindeki URL'den `/rest/v1/` bölümünü çıkarın ve Expo'yu `npx.cmd expo start -c` ile yeniden başlatın. Oturum açıldıktan sonra `profile-api` için 404 görülürse 3. adımdaki Edge Function dağıtımı eksiktir.

## Servis kullanım örnekleri

```js
import {
  authService, profileService, storyService, coffeeService, adminService,
} from './src/backend/services';

await authService.signUp('ornek@site.com', 'guclu-sifre', 'KullaniciAdi');
await authService.signIn('ornek@site.com', 'guclu-sifre');

const me = await profileService.getMine(); // secret_code ve token_balance yalnızca kendi hesabına döner
const newCode = await profileService.rotateCode(); // 12 karakter
const found = await profileService.findByCode('X7B9K2M4L9Q1');

const story = await storyService.create({ imageUri: 'file:///.../photo.jpg', caption: 'Merhaba ✨' });
const stories = await storyService.list(); // özel Storage için geçici imzalı görsel URL'leri
await storyService.reply(story.id, 'Harika bir story!');
const replies = await storyService.listReplies(story.id);

const request = await coffeeService.create({
  photoUris: [/* 8 farklı file:// URI */],
  falciId: null,
  expertStyle: 'aylin',
});
const myRequests = await coffeeService.listMine();

// Sunucuda role='admin' olan kullanıcıdan çağrılmalı:
await adminService.updateModeration(found.id, {
  banType: 'chat_only_ban',
  adminTitle: 'Dilenci',
});
```

`coffee_fal_requests."8_photos_array"` özel `coffee-photos` kovasındaki sekiz farklı dosya yolunu saklar. `coffeeService.photoUrl(path)` yetkili kullanıcı için kısa ömürlü imzalı URL üretir. Gerçek bir falcı hesabı atanacaksa önce bu hesabın `profiles.role` alanı güvenilir yönetim yoluyla `falci` yapılmalıdır.

## Bu MVP'de canlı olanlar

Auth oturumu, kendi profilinin okunması/güncellenmesi, 12 karakterlik kod üretimi ve yenileme, kodla profil arama, story ekleme/listeleme, story yanıtı, sekiz fotoğraflı kahve talebi ve admin ceza/ünvan güncellemeleri Supabase'e bağlıdır. Haber kaynağı gönderileri, yorumlar, arkadaşlık listesi, genel sohbetler, AI fal metni ve ödeme akışı hâlâ mock veridir; şemada bunlara ait tablo veya ödeme sağlayıcısı yoktur. Kahve talebi `queued` olarak kaydedilir; ekranda hemen görünen fal metni örnek yorumdur.

`profiles.secret_code` ve `token_balance` sütunlarını mobil istemci doğrudan okuyamaz; `role`, `ban_type` ve `admin_title` görüntülenebilir ama istemciden değiştirilemez. Admin değişiklikleri kullanıcı JWT'sini doğrulayan Edge Function üzerinden yapılır. Tam Ban, kendi profilini görüntüleme dışında veri okuma/yazma işlemlerini RLS ile engeller; mevcut JWT'yi Supabase Auth seviyesinde anında iptal etmez.

Kaynak yönergeler: [Supabase React Native Auth](https://supabase.com/docs/guides/auth/quickstarts/react-native), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Auth kullanıcı tetikleyicisi](https://supabase.com/docs/guides/auth/managing-user-data), [Edge Function secrets](https://supabase.com/docs/guides/functions/secrets), [Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/).

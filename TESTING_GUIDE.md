# Руководство по тестированию бота

## Вариант 1: Локальное тестирование с ngrok (для разработки)

### Шаг 1: Установите ngrok

1. Скачайте ngrok с [ngrok.com](https://ngrok.com/download)
2. Или установите через пакетный менеджер:
   ```bash
   # Windows (Chocolatey)
   choco install ngrok
   
   # или скачайте и распакуйте в папку
   ```

### Шаг 2: Запустите локальный сервер

```bash
cd c:\Work\FindOrigin
npm run dev
```

Сервер запустится на `http://localhost:3000`

### Шаг 3: Создайте туннель с ngrok

В **новом** терминале:

```bash
ngrok http 3000
```

Вы увидите что-то вроде:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

Скопируйте HTTPS URL (например, `https://abc123.ngrok.io`)

### Шаг 4: Настройте webhook

Используйте ваш токен бота и URL от ngrok:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" ^
  -d "url=https://abc123.ngrok.io/api/telegram/webhook"
```

**Для PowerShell:**
```powershell
$token = "YOUR_BOT_TOKEN"
$webhookUrl = "https://abc123.ngrok.io/api/telegram/webhook"
Invoke-WebRequest -Uri "https://api.telegram.org/bot$token/setWebhook" -Method POST -Body @{url=$webhookUrl}
```

### Шаг 5: Проверьте webhook

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

Должен вернуться ваш ngrok URL.

### Шаг 6: Отправьте сообщение боту

1. Откройте Telegram
2. Найдите вашего бота (по username, который вы указали при создании)
3. Нажмите "Start" или отправьте команду `/start`
4. Отправьте тестовое сообщение, например:
   - `/help` - для справки
   - `В 2024 году население России составило 146 миллионов человек` - для теста поиска

### Шаг 7: Проверьте логи

В терминале, где запущен `npm run dev`, вы увидите логи обработки запросов.

---

## Вариант 2: Тестирование после деплоя на Vercel

### Шаг 1: Деплой на Vercel

1. Установите Vercel CLI (если еще не установлен):
   ```bash
   npm i -g vercel
   ```

2. Задеплойте проект:
   ```bash
   cd c:\Work\FindOrigin
   vercel
   ```

3. Следуйте инструкциям в терминале
4. После деплоя вы получите URL вида: `https://your-app.vercel.app`

### Шаг 2: Настройте переменные окружения на Vercel

1. Перейдите на [vercel.com](https://vercel.com)
2. Откройте ваш проект
3. Перейдите в Settings → Environment Variables
4. Добавьте все переменные из `.env.local`:
   - `TELEGRAM_BOT_TOKEN`
   - `SEARCH_API_KEY`
   - `SEARCH_ENGINE`
   - `GOOGLE_SEARCH_ENGINE_ID` (если используете Google)

### Шаг 3: Настройте webhook

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" ^
  -d "url=https://your-app.vercel.app/api/telegram/webhook"
```

### Шаг 4: Отправьте сообщение боту

Откройте Telegram и отправьте сообщение вашему боту.

---

## Вариант 3: Быстрый тест без webhook (только отправка сообщений)

Если вы хотите просто проверить, что бот может отправлять сообщения:

### Создайте тестовый скрипт

Создайте файл `test-bot.ts`:

```typescript
import { sendMessage } from './lib/telegram';

async function test() {
  const chatId = 'YOUR_CHAT_ID'; // Ваш Telegram chat ID
  await sendMessage(chatId, 'Тестовое сообщение от бота!');
}

test().catch(console.error);
```

### Получите ваш Chat ID

1. Найдите бота [@userinfobot](https://t.me/userinfobot) в Telegram
2. Отправьте ему `/start`
3. Он вернет ваш Chat ID

### Запустите тест

```bash
npx ts-node test-bot.ts
```

---

## Проверка работы webhook

### Проверить текущий webhook:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

### Удалить webhook (если нужно):

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook"
```

### Отправить тестовое обновление вручную:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage" ^
  -d "chat_id=YOUR_CHAT_ID" ^
  -d "text=Тест"
```

---

## Примеры тестовых сообщений

После настройки webhook, попробуйте отправить боту:

1. **Команды:**
   - `/start` - приветствие
   - `/help` - справка

2. **Текстовые сообщения:**
   - `В 2024 году население России составило 146 миллионов человек`
   - `По данным Росстата, инфляция в январе 2024 года составила 0,86%`
   - `Президент России Владимир Путин подписал новый закон`

3. **Ссылки на Telegram посты:**
   - `https://t.me/channel_name/12345`

---

## Отладка проблем

### Бот не отвечает

1. **Проверьте webhook:**
   ```bash
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
   ```

2. **Проверьте логи сервера:**
   - В терминале с `npm run dev` должны быть логи запросов
   - Проверьте наличие ошибок

3. **Проверьте переменные окружения:**
   - Убедитесь, что `TELEGRAM_BOT_TOKEN` установлен в `.env.local`
   - Перезапустите сервер после изменения `.env.local`

4. **Проверьте доступность webhook:**
   - Если используете ngrok, убедитесь, что он запущен
   - URL должен быть доступен из интернета

### Ошибки в консоли

- **"TELEGRAM_BOT_TOKEN is not set"** - проверьте `.env.local`
- **"SEARCH_API_KEY not set"** - бот будет работать, но поиск не будет выполняться
- **"Invalid update"** - проверьте формат данных от Telegram

### Проверка работы поиска

Если поиск не работает:
1. Проверьте `SEARCH_API_KEY` в `.env.local`
2. Проверьте `SEARCH_ENGINE` (должен быть: `google`, `serpapi` или `bing`)
3. Если используете Google, проверьте `GOOGLE_SEARCH_ENGINE_ID`
4. Проверьте лимиты API (возможно, превышен бесплатный лимит)

---

## Полезные команды

### Получить информацию о боте:
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe"
```

### Получить обновления (polling, если webhook не настроен):
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates"
```

### Отправить сообщение напрямую:
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage" ^
  -d "chat_id=YOUR_CHAT_ID" ^
  -d "text=Привет!"
```

---

## Рекомендации

- Для **разработки** используйте ngrok (Вариант 1)
- Для **продакшена** используйте Vercel (Вариант 2)
- Всегда проверяйте логи при тестировании
- Используйте тестовый бот для экспериментов, чтобы не засорять основной

/**
 * Webhook endpoint для Telegram бота
 */

import { NextRequest, NextResponse } from 'next/server';
import { TelegramUpdate } from '@/types/telegram';
import { sendMessage } from '@/lib/telegram';
import { getMessageFromTelegramLink, cleanText } from '@/lib/telegram-parser';
import { buildSearchQueryFromText, rankSearchResultsWithAI } from '@/lib/ai';
import { searchSources, filterAndRankResults } from '@/lib/search';

/**
 * Обработка команды /start
 */
async function handleStart(chatId: number): Promise<void> {
  const text = `👋 Привет! Я бот FindOrigin.

Я помогаю найти источники информации из текста или Telegram-постов.

📝 Отправь мне:
• Текст с информацией
• Ссылку на Telegram-пост

Я проанализирую содержимое и найду возможные источники.

Используй /help для получения справки.`;
  
  await sendMessage(chatId, text);
}

/**
 * Обработка команды /help
 */
async function handleHelp(chatId: number): Promise<void> {
  const text = `📖 Справка по использованию бота:

1️⃣ Отправь текст с информацией, которую нужно проверить
2️⃣ Или отправь ссылку на Telegram-пост (формат: https://t.me/channel/123)

Бот:
• Сформирует поисковый запрос с помощью AI
• Поищет источники (Google Search API)
• Отранжирует и вернет 1–3 наиболее релевантных источника

Примеры:
• "В 2024 году население России составило 146 миллионов человек"
• https://t.me/example_channel/12345`;
  
  await sendMessage(chatId, text);
}

/**
 * Обработка текстового сообщения
 */
async function handleTextMessage(chatId: number, text: string): Promise<void> {
  await sendMessage(chatId, '🔍 Формирую поисковый запрос и ищу источники...');
  
  try {
    const cleanedText = cleanText(text);
    
    // Поисковый запрос формирует AI (openai/gpt-4o-mini через OpenRouter)
    const searchQuery = await buildSearchQueryFromText(cleanedText);
    
    // Поиск через Google Search API (или другой SEARCH_ENGINE)
    const searchResults = await searchSources(searchQuery, 10);
    
    // Ранжирование: AI при наличии ключа, иначе по типу источника
    let topResults = searchResults;
    if (process.env.OPENROUTER_API_KEY && searchResults.length > 0) {
      topResults = await rankSearchResultsWithAI(cleanedText, searchResults, 3);
    } else {
      topResults = filterAndRankResults(searchResults, 3);
    }
    
    // Формируем ответ
    if (topResults.length === 0) {
      await sendMessage(
        chatId,
        '❌ К сожалению, не удалось найти источники. Попробуйте другой запрос.'
      );
      return;
    }
    
    let responseText = '📚 Найденные источники:\n\n';
    
    topResults.forEach((result, index) => {
      const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
      const typeEmoji = {
        official: '🏛️',
        news: '📰',
        blog: '✍️',
        research: '🔬',
        other: '🌐',
      }[result.sourceType];
      
      responseText += `${emoji} ${typeEmoji} ${result.title}\n`;
      responseText += `🔗 ${result.url}\n`;
      if (result.snippet) {
        responseText += `📄 ${result.snippet.substring(0, 150)}...\n`;
      }
      responseText += '\n';
    });
    
    responseText += '⚠️ Обратите внимание: найденные источники требуют дополнительной проверки.';
    
    await sendMessage(chatId, responseText);
  } catch (error) {
    console.error('Error processing text message:', error);
    await sendMessage(
      chatId,
      '❌ Произошла ошибка при обработке сообщения. Попробуйте позже.'
    );
  }
}

/**
 * Обработка ссылки на Telegram пост
 */
async function handleTelegramLink(chatId: number, link: string): Promise<void> {
  await sendMessage(chatId, '🔗 Получаю текст из Telegram-поста...');
  
  try {
    const messageText = await getMessageFromTelegramLink(link);
    
    if (!messageText) {
      await sendMessage(
        chatId,
        '❌ Не удалось получить текст из поста. Убедитесь, что:\n' +
        '• Ссылка корректна\n' +
        '• Пост доступен публично\n' +
        '• Бот имеет доступ к каналу'
      );
      return;
    }
    
    // Обрабатываем как обычный текст
    await handleTextMessage(chatId, messageText);
  } catch (error) {
    console.error('Error processing Telegram link:', error);
    await sendMessage(
      chatId,
      '❌ Произошла ошибка при обработке ссылки. Попробуйте позже.'
    );
  }
}

/**
 * POST обработчик для webhook
 */
export async function POST(request: NextRequest) {
  try {
    // Быстро возвращаем 200 OK
    const update: TelegramUpdate = await request.json();
    
    // Валидация
    if (!update || !update.update_id) {
      return NextResponse.json({ ok: false, error: 'Invalid update' }, { status: 400 });
    }
    
    // Обрабатываем асинхронно (не ждем завершения)
    processUpdate(update).catch(error => {
      console.error('Error processing update:', error);
    });
    
    // Сразу возвращаем успешный ответ
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error in webhook:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Асинхронная обработка обновления
 */
async function processUpdate(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  
  if (!message || !message.chat) {
    return;
  }
  
  const chatId = message.chat.id;
  const text = message.text || message.caption || '';
  
  // Обработка команд
  if (text.startsWith('/start')) {
    await handleStart(chatId);
    return;
  }
  
  if (text.startsWith('/help')) {
    await handleHelp(chatId);
    return;
  }
  
  // Проверка на ссылку Telegram
  const telegramLinkPattern = /https?:\/\/(?:t\.me|telegram\.me)\/[\w\/]+/i;
  if (telegramLinkPattern.test(text)) {
    const link = text.match(telegramLinkPattern)?.[0];
    if (link) {
      await handleTelegramLink(chatId, link);
      return;
    }
  }
  
  // Обработка обычного текста
  if (text.trim().length > 0) {
    await handleTextMessage(chatId, text);
  }
}

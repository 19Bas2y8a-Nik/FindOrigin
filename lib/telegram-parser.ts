/**
 * Парсинг ссылок на Telegram посты и извлечение текста
 */

export interface TelegramLinkParts {
  channel: string;
  messageId?: number;
}

/**
 * Парсинг ссылки на Telegram пост
 * Поддерживает форматы:
 * - https://t.me/channel/123
 * - https://t.me/channel/123?thread=456
 * - https://t.me/username/123
 */
export function parseTelegramLink(url: string): TelegramLinkParts | null {
  try {
    const urlObj = new URL(url);
    
    // Проверяем, что это ссылка на t.me
    if (urlObj.hostname !== 't.me' && urlObj.hostname !== 'telegram.me') {
      return null;
    }

    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    if (pathParts.length < 2) {
      return null;
    }

    const channel = pathParts[0];
    const messageIdStr = pathParts[1];
    const messageId = messageIdStr ? parseInt(messageIdStr, 10) : undefined;

    if (!channel || (messageIdStr && isNaN(messageId!))) {
      return null;
    }

    return {
      channel,
      messageId,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Получить сообщение из Telegram по ссылке
 */
export async function getMessageFromTelegramLink(link: string): Promise<string | null> {
  const linkParts = parseTelegramLink(link);
  
  if (!linkParts || !linkParts.messageId) {
    return null;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }

  try {
    // Для получения сообщения из канала нужны права бота в канале
    // Используем forwardMessage или getChat для проверки доступа
    // Пока возвращаем null, так как это требует настройки прав бота
    // В реальном сценарии можно использовать Telegram Client API или библиотеку
    
    // Альтернативный подход: использовать публичный доступ к каналу
    // если канал публичный, можно попробовать получить через веб-интерфейс
    
    return null; // TODO: Реализовать получение сообщения
  } catch (error) {
    console.error('Error getting message from Telegram link:', error);
    return null;
  }
}

/**
 * Очистка текста от форматирования
 */
export function cleanText(text: string): string {
  // Удаляем HTML теги
  let cleaned = text.replace(/<[^>]*>/g, '');
  
  // Удаляем Markdown форматирование
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1'); // Bold
  cleaned = cleaned.replace(/\*(.*?)\*/g, '$1'); // Italic
  cleaned = cleaned.replace(/__(.*?)__/g, '$1'); // Bold
  cleaned = cleaned.replace(/_(.*?)_/g, '$1'); // Italic
  cleaned = cleaned.replace(/`(.*?)`/g, '$1'); // Code
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1'); // Links
  
  // Удаляем множественные пробелы
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

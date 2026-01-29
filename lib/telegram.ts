/**
 * Утилиты для работы с Telegram Bot API
 */

import { TelegramSendMessageParams, TelegramApiResponse } from '@/types/telegram';

const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

/**
 * Получить базовый URL для Telegram API
 */
function getApiUrl(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }
  return `${TELEGRAM_API_URL}${token}`;
}

/**
 * Отправить сообщение в Telegram
 */
export async function sendMessage(
  chatId: number | string,
  text: string,
  options?: Partial<TelegramSendMessageParams>
): Promise<TelegramApiResponse<any>> {
  const apiUrl = getApiUrl();
  const params: TelegramSendMessageParams = {
    chat_id: chatId,
    text,
    ...options,
  };

  try {
    const response = await fetch(`${apiUrl}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data: TelegramApiResponse<any> = await response.json();

    if (!data.ok) {
      console.error('Telegram API error:', data);
      throw new Error(`Telegram API error: ${data.description || 'Unknown error'}`);
    }

    return data;
  } catch (error) {
    console.error('Error sending message to Telegram:', error);
    throw error;
  }
}

/**
 * Получить информацию о сообщении по ссылке
 */
export async function getMessageFromLink(link: string): Promise<any> {
  // Парсинг ссылки будет реализован в этапе 4
  // Пока возвращаем заглушку
  throw new Error('Not implemented yet');
}

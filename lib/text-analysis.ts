/**
 * Анализ текста и извлечение ключевой информации
 */

export interface ExtractedInfo {
  claims: string[];
  dates: string[];
  numbers: string[];
  names: string[];
  links: string[];
  keywords: string[];
}

/**
 * Извлечение ключевых утверждений из текста
 */
export function extractClaims(text: string): string[] {
  const claims: string[] = [];
  
  // Ищем предложения с фактологическими маркерами
  const factMarkers = [
    /(?:утверждает?|говорит?|заявляет?|сообщает?|пишет?|отмечает?|подчеркивает?)[\s,]+(?:что|о том|о|про|,)?.{10,200}/gi,
    /(?:по данным|согласно|по информации|по словам|по мнению)[\s,]+.{10,200}/gi,
    /(?:стало известно|выяснилось|оказалось|обнаружено)[\s,]+.{10,200}/gi,
  ];

  factMarkers.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      claims.push(...matches.map(m => m.trim()));
    }
  });

  // Если не нашли специфичные маркеры, берем предложения с числами или датами
  if (claims.length === 0) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const sentencesWithData = sentences.filter(s => 
      /\d+/.test(s) || /\d{1,2}[./]\d{1,2}[./]\d{2,4}/.test(s)
    );
    claims.push(...sentencesWithData.slice(0, 5).map(s => s.trim()));
  }

  return claims.slice(0, 10); // Ограничиваем количество
}

/**
 * Извлечение дат из текста
 */
export function extractDates(text: string): string[] {
  const dates: string[] = [];
  
  // Форматы дат: DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD
  const datePatterns = [
    /\d{1,2}[./]\d{1,2}[./]\d{2,4}/g,
    /\d{4}-\d{1,2}-\d{1,2}/g,
    /(?:январ[ья]|феврал[ья]|март[а]?|апрел[ья]|ма[йя]|июн[ья]|июл[ья]|август[а]?|сентябр[ья]|октябр[ья]|ноябр[ья]|декабр[ья])\s+\d{1,2},?\s+\d{4}/gi,
  ];

  datePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      dates.push(...matches);
    }
  });

  return [...new Set(dates)]; // Убираем дубликаты
}

/**
 * Извлечение чисел и статистики
 */
export function extractNumbers(text: string): string[] {
  const numbers: string[] = [];
  
  // Ищем числа с контекстом (проценты, суммы, количества)
  const numberPatterns = [
    /\d+[\s,.]?\d*\s*(?:процент|%|рубл|доллар|евро|тыс|млн|млрд|человек|чел|раз)/gi,
    /\d+[\s,.]?\d*\s*(?:тысяч|миллион|миллиард)/gi,
    /\d+[\s,.]?\d*/g, // Все числа
  ];

  numberPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      numbers.push(...matches.map(m => m.trim()));
    }
  });

  // Оставляем только уникальные и значимые числа
  return [...new Set(numbers)].slice(0, 20);
}

/**
 * Извлечение имен собственных (персоны, организации)
 */
export function extractNames(text: string): string[] {
  const names: string[] = [];
  
  // Паттерны для имен (заглавная буква + слово)
  // Это упрощенный подход, в реальности нужен более сложный NLP
  const namePatterns = [
    /[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?/g, // ФИО
    /[А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ]\.\s*[А-ЯЁ]\.)/g, // Фамилия И.О.
  ];

  namePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      names.push(...matches.map(m => m.trim()));
    }
  });

  // Фильтруем слишком короткие и общие слова
  const filtered = names.filter(name => 
    name.length > 5 && 
    !['Россия', 'Москва', 'России', 'Москвы'].includes(name)
  );

  return [...new Set(filtered)].slice(0, 15);
}

/**
 * Извлечение ссылок из текста
 */
export function extractLinks(text: string): string[] {
  const links: string[] = [];
  
  const urlPattern = /https?:\/\/[^\s]+/gi;
  const matches = text.match(urlPattern);
  
  if (matches) {
    links.push(...matches);
  }

  return [...new Set(links)];
}

/**
 * Извлечение ключевых слов
 */
export function extractKeywords(text: string): string[] {
  // Удаляем стоп-слова
  const stopWords = new Set([
    'и', 'в', 'на', 'с', 'по', 'для', 'от', 'из', 'к', 'о', 'а', 'но', 'что',
    'как', 'так', 'это', 'то', 'его', 'её', 'их', 'он', 'она', 'они', 'мы',
    'вы', 'был', 'была', 'было', 'были', 'есть', 'быть', 'этот', 'эта', 'эти',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  // Подсчитываем частоту
  const frequency: Record<string, number> = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // Сортируем по частоте и берем топ-10
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Главная функция извлечения информации из текста
 */
export function extractInfo(text: string): ExtractedInfo {
  return {
    claims: extractClaims(text),
    dates: extractDates(text),
    numbers: extractNumbers(text),
    names: extractNames(text),
    links: extractLinks(text),
    keywords: extractKeywords(text),
  };
}

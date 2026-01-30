/**
 * Интеграция с AI (OpenRouter: openai/gpt-4o-mini) для формирования поискового запроса и ранжирования
 */

import type { SearchResult } from './search';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-4o-mini';

/**
 * Формирование поискового запроса из текста пользователя через AI
 */
export async function buildSearchQueryFromText(text: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn('OPENROUTER_API_KEY not set, using raw text as query');
    return text.trim().slice(0, 200);
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `Ты помощник для формирования поискового запроса. На основе текста пользователя сформируй один короткий поисковый запрос на русском или английском (2-8 ключевых слов) для поиска источников этой информации в интернете. Ответь только поисковым запросом, без кавычек и пояснений.`,
        },
        {
          role: 'user',
          content: text.slice(0, 4000),
        },
      ],
      max_tokens: 80,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${err}`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const query = data.choices?.[0]?.message?.content?.trim();
  if (!query) {
    return text.trim().slice(0, 200);
  }
  return query.slice(0, 200);
}

/**
 * Ранжирование результатов поиска по релевантности к исходному тексту через AI
 */
export async function rankSearchResultsWithAI(
  originalText: string,
  results: SearchResult[],
  maxResults: number = 3
): Promise<SearchResult[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || results.length === 0) {
    return results.slice(0, maxResults);
  }

  const list = results.slice(0, 10).map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet.slice(0, 150)}...`).join('\n\n');

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `Ты помощник для оценки релевантности источников. Дан исходный текст и список найденных источников. Верни номера источников в порядке убывания релевантности к исходному тексту (самый релевантный первым). Ответь только номерами через запятую, например: 2,5,1. Количество номеров: не больше ${maxResults}.`,
        },
        {
          role: 'user',
          content: `Исходный текст:\n${originalText.slice(0, 2000)}\n\nИсточники:\n${list}`,
        },
      ],
      max_tokens: 50,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    return results.slice(0, maxResults);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const orderStr = data.choices?.[0]?.message?.content?.trim();
  if (!orderStr) {
    return results.slice(0, maxResults);
  }

  const indices = orderStr
    .replace(/[^\d,]/g, '')
    .split(',')
    .map((s) => parseInt(s.trim(), 10) - 1)
    .filter((n) => n >= 0 && n < results.length);
  const seen = new Set<number>();
  const ordered: SearchResult[] = [];
  for (const i of indices) {
    if (!seen.has(i)) {
      seen.add(i);
      ordered.push(results[i]);
    }
    if (ordered.length >= maxResults) break;
  }
  while (ordered.length < maxResults && results.length > ordered.length) {
    const next = results.find((_, j) => !indices.includes(j) && !seen.has(j));
    if (!next) break;
    const j = results.indexOf(next);
    seen.add(j);
    ordered.push(next);
  }
  return ordered.length > 0 ? ordered : results.slice(0, maxResults);
}

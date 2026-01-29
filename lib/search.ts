/**
 * Поиск источников информации
 */

import { ExtractedInfo } from './text-analysis';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  sourceType: 'official' | 'news' | 'blog' | 'research' | 'other';
}

/**
 * Определение типа источника по домену
 */
function getSourceType(domain: string): SearchResult['sourceType'] {
  const domainLower = domain.toLowerCase();
  
  // Официальные сайты
  const officialPatterns = [
    'gov.ru', 'gov.', '.gov', 'kremlin.ru', 'government.',
    'official.', 'мин', 'министерство',
  ];
  
  // Новостные сайты
  const newsPatterns = [
    'news.', 'новости', 'rbc.ru', 'ria.ru', 'tass.ru',
    'interfax.ru', 'lenta.ru', 'gazeta.ru', 'vedomosti.ru',
    'kommersant.ru', 'rt.com', 'sputniknews.com',
  ];
  
  // Блоги
  const blogPatterns = [
    'blog.', 'medium.com', 'habr.com', 'livejournal.com',
    'tjournal.ru', 'vc.ru', 'dzen.ru',
  ];
  
  // Исследования
  const researchPatterns = [
    'research.', 'arxiv.org', 'pubmed.', 'scholar.',
    'academic.', 'edu.', 'university.',
  ];

  if (officialPatterns.some(pattern => domainLower.includes(pattern))) {
    return 'official';
  }
  if (newsPatterns.some(pattern => domainLower.includes(pattern))) {
    return 'news';
  }
  if (blogPatterns.some(pattern => domainLower.includes(pattern))) {
    return 'blog';
  }
  if (researchPatterns.some(pattern => domainLower.includes(pattern))) {
    return 'research';
  }
  
  return 'other';
}

/**
 * Построение поискового запроса на основе извлеченной информации
 */
export function buildSearchQuery(info: ExtractedInfo, maxLength: number = 100): string {
  const parts: string[] = [];
  
  // Добавляем ключевые слова
  if (info.keywords.length > 0) {
    parts.push(...info.keywords.slice(0, 5));
  }
  
  // Добавляем имена
  if (info.names.length > 0) {
    parts.push(...info.names.slice(0, 2));
  }
  
  // Добавляем даты
  if (info.dates.length > 0) {
    parts.push(info.dates[0]);
  }
  
  // Добавляем ключевые утверждения (первые слова)
  if (info.claims.length > 0) {
    const firstClaim = info.claims[0].split(/\s+/).slice(0, 5).join(' ');
    parts.push(firstClaim);
  }
  
  // Объединяем и ограничиваем длину
  let query = parts.join(' ');
  if (query.length > maxLength) {
    query = query.substring(0, maxLength).trim();
  }
  
  return query || 'новости';
}

/**
 * Поиск источников через поисковый API
 * Поддерживает: Google Custom Search, SerpAPI, Bing Search
 */
export async function searchSources(
  query: string,
  limit: number = 10
): Promise<SearchResult[]> {
  const apiKey = process.env.SEARCH_API_KEY;
  const searchEngine = process.env.SEARCH_ENGINE || 'google'; // google, serpapi, bing
  
  if (!apiKey) {
    console.warn('SEARCH_API_KEY not set, returning empty results');
    return [];
  }

  try {
    let results: SearchResult[] = [];
    
    if (searchEngine === 'google') {
      results = await searchGoogle(query, apiKey, limit);
    } else if (searchEngine === 'serpapi') {
      results = await searchSerpAPI(query, apiKey, limit);
    } else if (searchEngine === 'bing') {
      results = await searchBing(query, apiKey, limit);
    }
    
    // Обогащаем результаты информацией о типе источника
    return results.map(result => ({
      ...result,
      sourceType: getSourceType(result.domain),
    }));
  } catch (error) {
    console.error('Error searching sources:', error);
    return [];
  }
}

/**
 * Поиск через Google Custom Search API
 */
async function searchGoogle(
  query: string,
  apiKey: string,
  limit: number
): Promise<SearchResult[]> {
  const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;
  if (!cx) {
    throw new Error('GOOGLE_SEARCH_ENGINE_ID is not set');
  }

  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=${Math.min(limit, 10)}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (!data.items) {
    return [];
  }
  
  return data.items.map((item: any) => ({
    title: item.title,
    url: item.link,
    snippet: item.snippet || '',
    domain: new URL(item.link).hostname,
    sourceType: 'other' as const,
  }));
}

/**
 * Поиск через SerpAPI
 */
async function searchSerpAPI(
  query: string,
  apiKey: string,
  limit: number
): Promise<SearchResult[]> {
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${apiKey}&num=${Math.min(limit, 10)}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (!data.organic_results) {
    return [];
  }
  
  return data.organic_results.slice(0, limit).map((item: any) => ({
    title: item.title,
    url: item.link,
    snippet: item.snippet || '',
    domain: new URL(item.link).hostname,
    sourceType: 'other' as const,
  }));
}

/**
 * Поиск через Bing Search API
 */
async function searchBing(
  query: string,
  apiKey: string,
  limit: number
): Promise<SearchResult[]> {
  const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=${Math.min(limit, 50)}`;
  
  const response = await fetch(url, {
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
    },
  });
  
  const data = await response.json();
  
  if (!data.webPages || !data.webPages.value) {
    return [];
  }
  
  return data.webPages.value.slice(0, limit).map((item: any) => ({
    title: item.name,
    url: item.url,
    snippet: item.snippet || '',
    domain: new URL(item.url).hostname,
    sourceType: 'other' as const,
  }));
}

/**
 * Фильтрация и ранжирование результатов поиска
 */
export function filterAndRankResults(
  results: SearchResult[],
  maxResults: number = 5
): SearchResult[] {
  // Приоритизация по типу источника
  const priority: Record<SearchResult['sourceType'], number> = {
    official: 4,
    research: 3,
    news: 2,
    blog: 1,
    other: 0,
  };
  
  // Сортируем по приоритету типа источника
  const sorted = results.sort((a, b) => {
    const priorityDiff = priority[b.sourceType] - priority[a.sourceType];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    // Если приоритет одинаковый, сортируем по длине snippet (более информативные выше)
    return b.snippet.length - a.snippet.length;
  });
  
  return sorted.slice(0, maxResults);
}

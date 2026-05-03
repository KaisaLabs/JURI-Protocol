/**
 * Multi-Source Exploit Intelligence Search
 *
 * Sources:
 *   - Brave Search API  (free: 2,000 queries/month)
 *   - Serper.dev         (free: 2,500 queries/month)
 *   - Rekt.news          (scrapes DeFi exploit leaderboard)
 */
import * as dotenv from "dotenv";
dotenv.config({ path: "../.env" });

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: "brave" | "serper" | "rekt";
  date?: string;
}

export interface ExploitIntel {
  query: string;
  results: SearchResult[];
  summary: string;
}

/**
 * Search Rekt.news for known DeFi exploits.
 * Scrapes the public leaderboard page for exploit names, amounts, dates.
 */
async function searchRekt(query: string): Promise<SearchResult[]> {
  try {
    // Rekt.news leaderboard API (unofficial but public)
    const url = "https://rekt.news/leaderboard/";
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const html = await res.text();

    // Extract exploit entries from the leaderboard HTML
    const results: SearchResult[] = [];
    const entryRegex = /<a\s+href="([^"]+)">([^<]+)<\/a>.*?(\$[\d,.]+[BM])?/gi;
    let match;
    while ((match = entryRegex.exec(html)) !== null) {
      const [, url, name, amount] = match;
      if (query.toLowerCase().split(" ").some(word =>
        name.toLowerCase().includes(word) && word.length > 2
      )) {
        results.push({
          title: `${name}${amount ? ` — ${amount}` : ""}`,
          url: url.startsWith("http") ? url : `https://rekt.news${url}`,
          snippet: `${name}${amount ? ` lost ${amount}` : ""} — via Rekt.news leaderboard`,
          source: "rekt",
        });
      }
      if (results.length >= 5) break;
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * Search via Brave Search API.
 * Requires BRAVE_API_KEY in .env (get from https://brave.com/search/api/)
 */
async function searchBrave(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query + " DeFi exploit hack")}&count=5&search_lang=en`,
      {
        headers: {
          "Accept": "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": apiKey,
        },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.web?.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
      source: "brave" as const,
      date: r.page_age,
    }));
  } catch {
    return [];
  }
}

/**
 * Search via Serper.dev (Google Search API).
 * Requires SERPER_API_KEY in .env (get from https://serper.dev)
 */
async function searchSerper(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: `${query} DeFi exploit hack attack`,
        num: 5,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.organic || []).map((r: any) => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet,
      source: "serper" as const,
      date: r.date,
    }));
  } catch {
    return [];
  }
}

/**
 * Main entry point: search all available sources in parallel.
 * Deduplicates results by URL and returns a structured intelligence report.
 */
export async function gatherExploitIntel(query: string): Promise<ExploitIntel> {
  const [braveResults, serperResults, rektResults] = await Promise.all([
    searchBrave(query),
    searchSerper(query),
    searchRekt(query),
  ]);

  // Deduplicate by URL
  const seen = new Set<string>();
  const allResults: SearchResult[] = [];

  for (const r of [...rektResults, ...braveResults, ...serperResults]) {
    const key = r.url.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      allResults.push(r);
    }
  }

  // Build summary
  const sources = new Set(allResults.map(r => r.source));
  const summary = allResults.length > 0
    ? `Found ${allResults.length} intelligence items from ${[...sources].join(", ")}. ` +
      allResults.slice(0, 3).map(r => `- ${r.title}: ${r.snippet.slice(0, 150)}`).join("\n")
    : "No intelligence found from any source.";

  return { query, results: allResults.slice(0, 10), summary };
}

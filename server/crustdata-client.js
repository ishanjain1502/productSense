const BASE = process.env.CRUSTDATA_API_BASE || "https://api.crustdata.com";

/**
 * @param {string} path
 * @param {Record<string, unknown>} body
 */
export async function crustdataPost(path, body) {
  const key = process.env.CRUSTDATA_API_KEY;
  if (!key) {
    const err = new Error("CRUSTDATA_API_KEY is not set");
    err.status = 503;
    throw err;
  }

  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${key}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const err = new Error(
      (data && (data.message || data.error)) || res.statusText
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }

  const credits = res.headers.get("x-credits-used");
  if (credits) {
    console.info(`[crustdata] ${path} credits=${credits}`);
  }

  return data;
}

/**
 * @param {string[]} names
 */
export function companyIdentify(names) {
  return crustdataPost("/company/identify", {
    names,
    fields: ["crustdata_company_id", "basic_info"],
  });
}

/**
 * @param {number[]} ids
 */
export function companyEnrichByIds(ids) {
  return crustdataPost("/company/enrich", {
    crustdata_company_ids: ids,
    exact_match: true,
    fields: [
      "crustdata_company_id",
      "basic_info",
      "headcount",
      "funding",
      "competitors",
    ],
  });
}

/**
 * @param {unknown} filters
 * @param {number} [limit]
 */
export function jobSearch(filters, limit = 15) {
  return crustdataPost("/job/search", {
    filters,
    limit,
    fields: ["job_details", "company", "content"],
  });
}

/**
 * @param {string} query
 * @param {number} [limit]
 */
export function companySearchNl(query, limit = 10) {
  return crustdataPost("/company/search", {
    search: { query, mode: "semantic" },
    limit,
    fields: ["basic_info", "headcount"],
  });
}

/**
 * @param {string} query
 */
export function webSearchLive(query) {
  return crustdataPost("/web/search/live", { query, limit: 5 });
}

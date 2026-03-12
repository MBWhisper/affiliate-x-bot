/**
 * Web3 Job Fetcher
 * ─────────────────────────────────────────────────────────────────
 * Fetches live Web3 / Blockchain jobs from free public APIs.
 * Sources:
 *   1. RemoteOK  — https://remoteok.io/api?tag=web3
 *   2. Fallback  — curated jobs from products.json (web3-jobs-site)
 */

export interface Web3Job {
  id: string;
  title: string;
  company: string;
  location: string;
  tags: string[];
  url: string;
  salary?: string;
  postedAt?: string;
}

// ─── RemoteOK API ─────────────────────────────────────────────────────────────

interface RemoteOKJob {
  id?: string;
  slug?: string;
  position?: string;
  company?: string;
  location?: string;
  tags?: string[];
  url?: string;
  apply_url?: string;
  salary_min?: number;
  salary_max?: number;
  date?: string;
}

async function fetchFromRemoteOK(): Promise<Web3Job[]> {
  const tags = ["web3", "blockchain", "solidity", "defi", "crypto"];
  const all: Web3Job[] = [];

  for (const tag of tags.slice(0, 2)) {
    // RemoteOK rate-limits — only fetch 2 tags per run
    try {
      const res = await fetch(`https://remoteok.io/api?tag=${tag}`, {
        headers: { "User-Agent": "affiliate-x-bot/2.0 (job-alerts)" }
      });
      if (!res.ok) continue;

      const data = (await res.json()) as RemoteOKJob[];
      // First element is metadata — skip it
      const jobs = data.slice(1, 4); // Top 3 per tag

      for (const j of jobs) {
        if (!j.position || !j.company) continue;
        all.push({
          id: `remoteok-${j.slug ?? j.id ?? Date.now()}`,
          title: j.position,
          company: j.company,
          location: j.location ?? "Remote",
          tags: (j.tags ?? []).slice(0, 4),
          url: j.apply_url ?? j.url ?? `https://remoteok.io/remote-${j.slug}-jobs`,
          salary:
            j.salary_min && j.salary_max
              ? `$${(j.salary_min / 1000).toFixed(0)}k–$${(j.salary_max / 1000).toFixed(0)}k`
              : undefined,
          postedAt: j.date
        });
      }

      await new Promise((r) => setTimeout(r, 800)); // polite delay
    } catch {
      // ignore per-tag errors
    }
  }

  return all;
}

// ─── Main fetch ───────────────────────────────────────────────────────────────

export async function fetchWeb3Jobs(limit = 3): Promise<Web3Job[]> {
  try {
    const jobs = await fetchFromRemoteOK();
    if (jobs.length > 0) return jobs.slice(0, limit);
  } catch {
    // fall through to fallback
  }

  // Fallback: static curated jobs
  return [
    {
      id: "fallback-001",
      title: "Solidity Smart Contract Developer",
      company: "DeFi Protocol (Remote)",
      location: "Remote Worldwide",
      tags: ["Solidity", "Ethereum", "DeFi"],
      url: "https://web3-jobs-hazel.vercel.app/",
      salary: "$80k–$150k"
    },
    {
      id: "fallback-002",
      title: "Web3 Frontend Engineer (React + ethers.js)",
      company: "NFT Marketplace",
      location: "Remote Worldwide",
      tags: ["React", "TypeScript", "Web3.js"],
      url: "https://web3-jobs-hazel.vercel.app/",
      salary: "$70k–$120k"
    },
    {
      id: "fallback-003",
      title: "Blockchain Security Auditor",
      company: "Security DAO",
      location: "Remote Worldwide",
      tags: ["Security", "Solidity", "Auditing"],
      url: "https://web3-jobs-hazel.vercel.app/",
      salary: "$100k–$200k"
    }
  ].slice(0, limit);
}

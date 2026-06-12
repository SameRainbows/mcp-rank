import { neon } from "@neondatabase/serverless";
import { contactMailtoHref } from "@/lib/contact";

export type ClaimSubmissionRole = "maintainer" | "contributor" | "user" | "company_representative";
export type ClaimSubmissionType = "claim" | "correction" | "broken_source" | "maintainer_verification";
export type ClaimSubmissionStatus = "new" | "triaged" | "accepted" | "rejected";

export type ClaimSubmission = {
  id: number;
  slug: string;
  listingName: string;
  contactName: string;
  contactEmail: string;
  role: ClaimSubmissionRole;
  claimType: ClaimSubmissionType;
  evidenceUrls: string[];
  message: string;
  status: ClaimSubmissionStatus;
  createdAt: string;
  updatedAt: string;
};

export type ClaimSubmissionInput = {
  slug?: string;
  listingName?: string;
  contactName?: string;
  contactEmail?: string;
  role?: string;
  claimType?: string;
  evidenceUrls?: string[] | string;
  message?: string;
};

type ClaimSubmissionRow = {
  id: number;
  slug: string;
  listing_name: string;
  contact_name: string;
  contact_email: string;
  role: ClaimSubmissionRole;
  claim_type: ClaimSubmissionType;
  evidence_urls: unknown;
  message: string;
  status: ClaimSubmissionStatus;
  created_at: string;
  updated_at: string;
};

let sqlClient: ReturnType<typeof neon> | null = null;
let claimSchemaReady = false;

function getSql() {
  if (!process.env.DATABASE_URL) return null;
  if (!sqlClient) sqlClient = neon(process.env.DATABASE_URL);
  return sqlClient;
}

function isRecoverableDatabaseError(error: unknown) {
  return error instanceof Error && /exceeded the data transfer quota|HTTP status 402|DATABASE_URL/i.test(error.message);
}

async function ensureClaimSchema(sql: ReturnType<typeof neon>) {
  if (claimSchemaReady) return;
  await sql`
    create table if not exists claim_submissions (
      id bigserial primary key,
      slug text not null default '',
      listing_name text not null default '',
      contact_name text not null default '',
      contact_email text not null default '',
      role text not null default 'maintainer'
        check (role in ('maintainer', 'contributor', 'user', 'company_representative')),
      claim_type text not null default 'claim'
        check (claim_type in ('claim', 'correction', 'broken_source', 'maintainer_verification')),
      evidence_urls jsonb not null default '[]'::jsonb,
      message text not null default '',
      status text not null default 'new'
        check (status in ('new', 'triaged', 'accepted', 'rejected')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists claim_submissions_status_idx on claim_submissions(status)`;
  await sql`create index if not exists claim_submissions_slug_idx on claim_submissions(slug)`;
  claimSchemaReady = true;
}

function normalizeRole(value: unknown): ClaimSubmissionRole {
  if (value === "contributor" || value === "user" || value === "company_representative") return value;
  return "maintainer";
}

function normalizeClaimType(value: unknown): ClaimSubmissionType {
  if (value === "correction" || value === "broken_source" || value === "maintainer_verification") return value;
  return "claim";
}

function normalizeStatus(value: unknown): ClaimSubmissionStatus {
  if (value === "triaged" || value === "accepted" || value === "rejected") return value;
  return "new";
}

function normalizeEvidenceUrls(value: ClaimSubmissionInput["evidenceUrls"]) {
  const rawItems = Array.isArray(value) ? value : String(value ?? "").split(/[\n,]/);
  return rawItems
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function normalizeClaimSubmissionInput(input: ClaimSubmissionInput) {
  return {
    slug: String(input.slug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 120),
    listingName: String(input.listingName ?? "").trim().slice(0, 160),
    contactName: String(input.contactName ?? "").trim().slice(0, 120),
    contactEmail: String(input.contactEmail ?? "").trim().slice(0, 180),
    role: normalizeRole(input.role),
    claimType: normalizeClaimType(input.claimType),
    evidenceUrls: normalizeEvidenceUrls(input.evidenceUrls),
    message: String(input.message ?? "").trim().slice(0, 2400),
  };
}

export function validateClaimSubmission(input: ReturnType<typeof normalizeClaimSubmissionInput>) {
  const errors: string[] = [];
  if (!input.slug && !input.listingName) errors.push("Add the listing slug or listing name.");
  if (!input.contactName) errors.push("Add your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contactEmail)) errors.push("Add a valid contact email.");
  if (!input.message && input.evidenceUrls.length === 0) errors.push("Add at least one evidence URL or a short note.");
  return errors;
}

function rowToClaim(row: ClaimSubmissionRow): ClaimSubmission {
  return {
    id: row.id,
    slug: row.slug,
    listingName: row.listing_name,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    role: normalizeRole(row.role),
    claimType: normalizeClaimType(row.claim_type),
    evidenceUrls: Array.isArray(row.evidence_urls)
      ? row.evidence_urls.filter((item): item is string => typeof item === "string")
      : [],
    message: row.message,
    status: normalizeStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function claimSubmissionMailto(input: ReturnType<typeof normalizeClaimSubmissionInput>) {
  const subject = `MCP Rank ${input.claimType.replace(/_/g, " ")}: ${input.slug || input.listingName || "listing"}`;
  const body = [
    `Listing slug: ${input.slug}`,
    `Listing name: ${input.listingName}`,
    `Name: ${input.contactName}`,
    `Email: ${input.contactEmail}`,
    `Role: ${input.role}`,
    `Request type: ${input.claimType}`,
    "Evidence URLs:",
    ...input.evidenceUrls.map((url) => `- ${url}`),
    "",
    "Message:",
    input.message,
  ].join("\n");

  return contactMailtoHref(subject, body);
}

export async function createClaimSubmission(input: ReturnType<typeof normalizeClaimSubmissionInput>) {
  const sql = getSql();
  if (!sql) return { persisted: false, claim: null, mailto: claimSubmissionMailto(input) };

  try {
    await ensureClaimSchema(sql);
    const rows = (await sql`
      insert into claim_submissions (
        slug, listing_name, contact_name, contact_email, role, claim_type, evidence_urls, message
      ) values (
        ${input.slug}, ${input.listingName}, ${input.contactName}, ${input.contactEmail},
        ${input.role}, ${input.claimType}, ${JSON.stringify(input.evidenceUrls)}::jsonb, ${input.message}
      )
      returning id, slug, listing_name, contact_name, contact_email, role, claim_type,
        evidence_urls, message, status, created_at::text, updated_at::text
    `) as ClaimSubmissionRow[];

    return { persisted: true, claim: rowToClaim(rows[0]), mailto: claimSubmissionMailto(input) };
  } catch (error) {
    if (!isRecoverableDatabaseError(error)) throw error;
    return { persisted: false, claim: null, mailto: claimSubmissionMailto(input) };
  }
}

export async function listClaimSubmissions(status: ClaimSubmissionStatus | "all" = "all") {
  const sql = getSql();
  if (!sql) return { persisted: false, claims: [] as ClaimSubmission[] };

  try {
    await ensureClaimSchema(sql);
    const rows =
      status === "all"
        ? ((await sql`
          select id, slug, listing_name, contact_name, contact_email, role, claim_type,
            evidence_urls, message, status, created_at::text, updated_at::text
          from claim_submissions
          order by created_at desc
        `) as ClaimSubmissionRow[])
        : ((await sql`
          select id, slug, listing_name, contact_name, contact_email, role, claim_type,
            evidence_urls, message, status, created_at::text, updated_at::text
          from claim_submissions
          where status = ${status}
          order by created_at desc
        `) as ClaimSubmissionRow[]);

    return { persisted: true, claims: rows.map(rowToClaim) };
  } catch (error) {
    if (!isRecoverableDatabaseError(error)) throw error;
    return { persisted: false, claims: [] as ClaimSubmission[] };
  }
}

export async function patchClaimSubmissionStatus(id: number, status: ClaimSubmissionStatus) {
  const sql = getSql();
  if (!sql) return null;

  await ensureClaimSchema(sql);
  const rows = (await sql`
    update claim_submissions
    set status = ${status}, updated_at = now()
    where id = ${id}
    returning id, slug, listing_name, contact_name, contact_email, role, claim_type,
      evidence_urls, message, status, created_at::text, updated_at::text
  `) as ClaimSubmissionRow[];

  return rows[0] ? rowToClaim(rows[0]) : null;
}

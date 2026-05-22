"use client";

import { FormEvent, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";

type ClaimSubmissionFormProps = {
  claimSlug?: string;
};

type ClaimResponse = {
  ok?: boolean;
  persisted?: boolean;
  message?: string;
  mailto?: string;
  errors?: string[];
};

export function ClaimSubmissionForm({ claimSlug = "" }: ClaimSubmissionFormProps) {
  const [slug, setSlug] = useState(claimSlug);
  const [listingName, setListingName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [role, setRole] = useState("maintainer");
  const [claimType, setClaimType] = useState(claimSlug ? "claim" : "correction");
  const [evidenceUrls, setEvidenceUrls] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ClaimResponse | null>(null);

  const mailto = useMemo(() => {
    const subject = `MCP Rank ${claimType.replace(/_/g, " ")}: ${slug || listingName || "listing"}`;
    const body = [
      `Listing slug: ${slug}`,
      `Listing name: ${listingName}`,
      `Name: ${contactName}`,
      `Email: ${contactEmail}`,
      `Role: ${role}`,
      `Request type: ${claimType}`,
      "Evidence URLs:",
      evidenceUrls,
      "",
      "Message:",
      message,
    ].join("\n");
    return `mailto:reviews@mcprank.dev?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [claimType, contactEmail, contactName, evidenceUrls, listingName, message, role, slug]);

  async function submitClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);

    const response = await fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        listingName,
        contactName,
        contactEmail,
        role,
        claimType,
        evidenceUrls,
        message,
      }),
    });
    const data = (await response.json()) as ClaimResponse;
    setResult(data);
    setSubmitting(false);
  }

  return (
    <form onSubmit={(event) => void submitClaim(event)} className="rounded-lg border border-[var(--arena-line)] bg-white p-6">
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">
            Listing slug
            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              className="h-11 rounded-md border border-[var(--arena-line)] px-3 font-normal"
              placeholder="notion-mcp"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Listing name
            <input
              value={listingName}
              onChange={(event) => setListingName(event.target.value)}
              className="h-11 rounded-md border border-[var(--arena-line)] px-3 font-normal"
              placeholder="Notion MCP"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">
            Your name
            <input
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              className="h-11 rounded-md border border-[var(--arena-line)] px-3 font-normal"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Contact email
            <input
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              className="h-11 rounded-md border border-[var(--arena-line)] px-3 font-normal"
              type="email"
              required
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">
            Role
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="h-11 rounded-md border border-[var(--arena-line)] bg-white px-3 font-normal"
            >
              <option value="maintainer">Maintainer</option>
              <option value="contributor">Contributor</option>
              <option value="user">User</option>
              <option value="company_representative">Company representative</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Request type
            <select
              value={claimType}
              onChange={(event) => setClaimType(event.target.value)}
              className="h-11 rounded-md border border-[var(--arena-line)] bg-white px-3 font-normal"
            >
              <option value="claim">Claim listing</option>
              <option value="correction">Correct listing</option>
              <option value="broken_source">Report broken source</option>
              <option value="maintainer_verification">Request maintainer verification</option>
            </select>
          </label>
        </div>
        <label className="grid gap-2 text-sm font-semibold">
          Evidence URLs
          <textarea
            value={evidenceUrls}
            onChange={(event) => setEvidenceUrls(event.target.value)}
            className="min-h-24 rounded-md border border-[var(--arena-line)] px-3 py-2 font-normal"
            placeholder="One URL per line: repository, package, docs, maintainer profile, issue, release, or company page."
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Message
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="min-h-32 rounded-md border border-[var(--arena-line)] px-3 py-2 font-normal"
            placeholder="What should MCP Rank claim, correct, or verify?"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-[var(--arena-ink)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit claim or correction"}
        </button>
        <a
          href={result?.mailto ?? mailto}
          className="inline-flex items-center gap-2 rounded-md border border-[var(--arena-line)] bg-white px-4 py-2 text-sm font-semibold transition hover:bg-[var(--arena-blue-soft)]"
        >
          <Mail size={15} aria-hidden="true" />
          Email fallback
        </a>
      </div>

      {result && (
        <div
          className={`mt-5 flex gap-3 rounded-lg border p-4 text-sm leading-6 ${
            result.ok
              ? "border-[#b9ddec] bg-[#edf8fc] text-[var(--arena-ink)]"
              : "border-[#ead1cb] bg-[#fff2ef] text-[var(--arena-red)]"
          }`}
        >
          {result.ok ? <CheckCircle2 className="mt-1 shrink-0" size={17} /> : <AlertCircle className="mt-1 shrink-0" size={17} />}
          <div>
            <p className="font-semibold">
              {result.ok
                ? result.persisted
                  ? "Request received"
                  : "Use the fallback email"
                : "Could not submit request"}
            </p>
            <p>{result.message ?? result.errors?.join(" ")}</p>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-[var(--arena-muted)]">
        Accepted claims do not automatically become Maintainer Verified. MCP Rank reviews maintainer evidence before changing trust labels.
      </p>
    </form>
  );
}

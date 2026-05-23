# MCP Rank Launch Approval Packet

Prepared on 2026-05-24.

Canonical public URL: https://mcprank.vercel.app

Primary report:
https://mcprank.vercel.app/reports/first-50-reviewed-mcp-trust-layer

## Status

- Production verified on `mcprank.vercel.app`.
- Report page verified in browser.
- Homepage shows `18,656+ indexed`, `22 source reviewed`, `20 deep reviewed`, `0 maintainer verified`.
- Claim flow exists at `/submit?claim=<slug>`.
- Claim API returns validation errors and mail fallback without leaking raw database errors.

## Gmail Drafts Created

These drafts were created but not sent. Review in Gmail before sending.

| Target | Recipient | Draft ID | Listing |
| --- | --- | --- | --- |
| Exa MCP | hello@exa.ai | r-6332031913133047747 | https://mcprank.vercel.app/servers/exa |
| ByteRay AI MCP | hi@byteray.ai | r-1585212648042836623 | https://mcprank.vercel.app/servers/byteray-ai |
| Mcpcap | info@mcpcap.ai | r-6908381559024409066 | https://mcprank.vercel.app/servers/mcpcap |
| MCP Analytics | support@embeddedlayers.com | r4086719302174711016 | https://mcprank.vercel.app/servers/analytics |

## Outreach Queue: Needs Manual Recipient Or Channel

These should be sent manually via contact form, GitHub issue/discussion, or social DM because a public email was not confidently available.

| Target | Best public channel found | Reason |
| --- | --- | --- |
| ABMeter | GitHub org: https://github.com/abmeter | Listed repo returned 404; no public email found. |
| AgentDM | Website: https://agentdm.ai and GitHub org: https://github.com/agentdmai | Listed repo returned 404; no public email found. |
| Agentic News | GitHub profile: https://github.com/u00dxk2 | Listed repo returned 404; no public email found. |
| Agentic Shelf | GitHub profile: https://github.com/vboykoCTO | Listed repo returned 404; no public email found. |
| Contextlayer MCP | Public directories reference `autoblocksai/ctxl`; repo unavailable during review | Needs manual verification of the current maintainer channel. |
| Cirra Salesforce Admin MCP | Website/contact: https://cirra.ai/products/salesforce-admin-mcp/ | High-impact Salesforce admin surface; use contact form or demo/contact path. |
| Baselight | Provider endpoint only in indexed metadata | Needs current maintainer/contact verification before outreach. |
| HAPI MCP Server | GitHub org: https://github.com/la-rebelion/hapimcp | Source reachable; good candidate for GitHub issue/discussion asking for maintainer confirmation. |
| PreClick | GitHub repo: https://github.com/cybrlab-ai/preclick-mcp | Source reachable; no public email found. |
| Openarx | GitHub repo: https://github.com/OpenArx-AI/openarx-core | Source reachable; no public email found. |

## Manual Outreach Template

Subject: MCP Rank source note for [SERVER NAME]

Hi,

I’m building MCP Rank, an independent trust/provenance index for MCP servers.

[SERVER NAME] appears in our first trust-layer report. During review, we marked it as [Source Reviewed / Deep Review / needs maintainer evidence] because [specific reason].

Report:
https://mcprank.vercel.app/reports/first-50-reviewed-mcp-trust-layer

Listing:
https://mcprank.vercel.app/servers/[slug]

If you maintain this MCP server, you can claim or correct the listing here:
https://mcprank.vercel.app/submit?claim=[slug]

The goal is to keep MCP Rank useful and fair by showing source evidence, install details, auth behavior, and safety notes clearly before anyone treats a listing as trusted.

Thanks,
Samer
MCP Rank

## Public Launch Sequence

1. Send or manually post the first 4 maintainer drafts.
2. Wait for any immediate correction or bounce.
3. Post the X thread from `docs/distribution-post-drafts.md`.
4. Post the maintainer-facing note after the X thread so maintainers see the correction path.
5. Hold Reddit/Hacker News until at least one maintainer has responded or corrected a listing, unless the goal is feedback rather than traction.

## Ready-To-Post X Thread

MCP discovery is exploding, but trust evidence is still thin.

I updated MCP Rank with its first real trust layer:

- 18,656+ indexed MCP discovery records
- 50 reviewed/high-risk pages
- 20 Deep Reviews
- 22 Source Reviewed listings
- 0 Maintainer Verified listings

That last number is intentional.

MCP Rank does not treat a registry listing, directory listing, source URL, or external badge as maintainer confirmation.

"Maintainer Verified" should mean a maintainer actually confirmed the listing.

The first trust-layer report found a pattern:

- broken repo links
- endpoint-only listings
- thin provenance
- high-impact tools touching hosting, DNS, Salesforce admin, analytics, packet capture, payments, browser sessions, local files, and data sandboxes

The point is not to shame projects.

The point is to make the evidence visible before developers install MCP servers into tools, repos, databases, workspaces, or customer systems.

Labels now mean:

- Indexed: discovered
- Source Reviewed: public source/provenance checked
- Deep Review: stronger MCP Rank assessment
- Maintainer Verified: explicit maintainer confirmation

Report:
https://mcprank.vercel.app/reports/first-50-reviewed-mcp-trust-layer

If your MCP server is listed, you can claim or correct it:
https://mcprank.vercel.app/submit

## Ready-To-Post Reddit/HN Draft

Title: MCP Rank: a trust and provenance index for MCP servers

MCP server directories are useful, but MCP install decisions are starting to look less like directory browsing and more like security/product decisions.

I built MCP Rank to separate public MCP listings by evidence level rather than treating every discovered server as equally trustworthy.

Current state:

- 18,656+ indexed MCP discovery records
- 50 reviewed or high-risk MCP pages
- 20 Deep Reviews
- 22 Source Reviewed listings
- 0 Maintainer Verified listings

The zero is deliberate. MCP Rank does not treat a registry listing, directory listing, public source URL, or external badge as maintainer confirmation.

The first trust-layer report found that MCP provenance is uneven. Some listings had broken repository links. Some were endpoint-only. Some touched high-impact systems such as hosting/DNS, Salesforce admin, analytics uploads, data sandboxes, packet capture, payments, local files, browser sessions, or identity/trust scoring.

The labels are intentionally strict:

- Indexed means discovered from public sources.
- Source Reviewed means public source/provenance links were checked.
- Deep Review means MCP Rank performed a stronger manual evidence and risk assessment.
- Maintainer Verified requires explicit maintainer confirmation.

Report:
https://mcprank.vercel.app/reports/first-50-reviewed-mcp-trust-layer

Project:
https://mcprank.vercel.app

I am especially interested in feedback from MCP maintainers and teams evaluating MCP servers for internal use.

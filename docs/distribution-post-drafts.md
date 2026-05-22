# MCP Rank Distribution Drafts

## X Thread

We reviewed the first 25 MCP server listings on MCP Rank.

The interesting part was not the ranking.

It was the source evidence.

Some public MCP listings had broken repository links. Some were endpoint-only. Some touched high-impact surfaces like Salesforce admin, hosting, binary/security analysis, or data catalogs without enough provenance to call them trusted.

So MCP Rank now separates:

- Indexed: discovered from public sources
- Source Reviewed: public links and source evidence checked
- Deep Review: deeper MCP Rank review
- Maintainer Verified: explicit maintainer evidence

First report:
https://mcprank.vercel.app/reports/first-25-source-reviewed-mcp-servers

If your server is indexed, you can claim or correct the listing:
https://mcprank.vercel.app/submit

## Reddit / Hacker News

Title: MCP Rank: a trust and provenance index for MCP servers

MCP server directories are useful, but install decisions are starting to look more like security decisions than directory browsing.

I built MCP Rank to separate public MCP listings by evidence level:

- Indexed means discovered from public sources.
- Source Reviewed means the public source links and provenance were checked.
- Deep Review means MCP Rank performed a deeper manual review.
- Maintainer Verified requires explicit maintainer confirmation.

The first source-review batch covered 25 MCP listings. The main finding was simple: indexing is easy, but source provenance is uneven. Several listings had broken repository links, endpoint-only evidence, or high-impact capability surfaces that should not be treated as trusted from metadata alone.

Report:
https://mcprank.vercel.app/reports/first-25-source-reviewed-mcp-servers

Project:
https://mcprank.vercel.app

I am especially interested in feedback from MCP maintainers and teams evaluating MCP servers for internal use.

## Maintainer-Facing Post

If your MCP server appears on MCP Rank, you can now claim or correct the listing.

Claim/correction flow:
https://mcprank.vercel.app/submit

MCP Rank does not mark indexed servers as Maintainer Verified by default. The labels are intentionally separate:

- Indexed: discovered from public sources
- Source Reviewed: source/provenance links checked
- Deep Review: deeper MCP Rank review
- Maintainer Verified: explicit maintainer evidence

If a source link is wrong, a repo moved, package metadata is stale, or the listing misses important safety/auth notes, please send evidence and we will review it.

# MCP Rank Data Sources

Index broadly, rank narrowly. Public-source imports create discovery records; they do not create MCP Rank recommendations.

## Primary sources

- Official MCP Registry: `https://registry.modelcontextprotocol.io/v0.1/servers`
- Reference repo: `https://github.com/modelcontextprotocol/servers`
- Smithery registry: `https://registry.smithery.ai/servers` with `SMITHERY_API_KEY`
- Glama structured API: `https://glama.ai/api/mcp/v1/servers` discovered from `https://glama.ai/mcp/reference`
- GitHub search queries:
  - `mcp server`
  - `modelcontextprotocol`
  - `@modelcontextprotocol`

## Import workflow

1. Choose an importer at `/admin`: Official Registry, Glama, Smithery, GitHub search, or manual CSV.
2. Run dry-run preview first and inspect fetched, new, duplicate, merged source-link, and skipped counts.
3. Commit only after preview. New rows must remain `status=unreviewed`, `review_depth=indexed`, `confidence_score=low`, and `trust_score=null`.
4. Duplicate imports may merge source links, raw metadata, external ids, tags, tool counts, and `lastSeenAt`.
5. Duplicate imports must not overwrite MCP Rank review fields: status, review depth, confidence, risk, score, evidence, maintainer verification, or history.
6. Promote manually only after MCP Rank review: Source Reviewed, Install Tested, Deep Review, or Maintainer Verified.

Only `deep_review` and `maintainer_verified` review depths may appear in leaderboards.
Tools with `confidence_score=low` or `unreviewed` should not appear in Top Trusted or
safest lists, even if a draft trust score exists. External scores or verification signals
from Glama, Smithery, registries, or package metadata are stored as attribution only and
must not be copied into MCP Rank scores.

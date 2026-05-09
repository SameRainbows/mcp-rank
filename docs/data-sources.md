# MCP Arena Data Sources

Use CSV import first, then enrich rows.

## Primary sources

- Official MCP Registry: `https://registry.modelcontextprotocol.io/v0/servers`
- Reference repo: `https://github.com/modelcontextprotocol/servers`
- Smithery registry: `https://api.smithery.ai/servers`
- Glama directory: `https://glama.ai/`
- GitHub search queries:
  - `mcp server`
  - `modelcontextprotocol`
  - `@modelcontextprotocol`

## Import workflow

1. Gather candidate rows into `public/templates/mcp-tools-import-template.csv`.
2. Upload the CSV at `/admin`.
3. Keep new rows as `status=unreviewed` and `confidence_score=unreviewed`.
4. Review install docs, auth handling, safety surface, examples, and compatibility.
5. Set `trust_score` only after review.
6. Promote to `confidence_score=medium` or `high` only when evidence is strong enough.

Tools with `confidence_score=low` or `unreviewed` should not appear in “Top 10 safest”
lists, even if the draft trust score is high. Use `listTopSafeMcpTools()` when building
public safety rankings from `mcp_tools`; it only returns reviewed rows with medium or
high confidence.

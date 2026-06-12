export function getContactEmail() {
  return process.env.MCP_RANK_CONTACT_EMAIL ?? process.env.NEXT_PUBLIC_MCP_RANK_CONTACT_EMAIL ?? "";
}

export function contactMailtoHref(subject: string, body: string, recipient = getContactEmail()) {
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  const to = recipient.trim();

  return `mailto:${to ? encodeURIComponent(to) : ""}?subject=${encodedSubject}&body=${encodedBody}`;
}

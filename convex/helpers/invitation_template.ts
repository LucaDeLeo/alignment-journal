export const ACCEPT_LINK_PLACEHOLDER = '{{ACCEPT_LINK}}'

export function buildInvitationBody(title: string, rationale: string): string {
  return `You have been invited to review a paper for the Alignment Journal.

Paper: ${title}

Why you: ${rationale}

Compensation: $500-$1,500 based on review quality and timeliness.
Deadline: 4 weeks from acceptance.

Accept this invitation: ${ACCEPT_LINK_PLACEHOLDER}

If you are unable to review, please decline promptly so we can find an alternative reviewer.`
}

export function resolveAcceptLink(
  body: string,
  reviewAssignmentId: string,
): string {
  return body.replace(
    ACCEPT_LINK_PLACEHOLDER,
    `/review/accept/${reviewAssignmentId}`,
  )
}

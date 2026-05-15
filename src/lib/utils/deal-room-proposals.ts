import type { ProposalLineItem, ProposalStatus } from "@/lib/types/deal-room"

export function getActiveLineItems(
  lineItems: ProposalLineItem[],
  removedNames: string[]
): ProposalLineItem[] {
  return lineItems.filter((item) => !removedNames.includes(item.name))
}

export function computeCounterTotal(
  lineItems: ProposalLineItem[],
  removedNames: string[]
): number {
  return getActiveLineItems(lineItems, removedNames)
    .reduce((sum, item) => sum + item.price, 0)
}

export function canClientCounterOffer(proposal: {
  status: ProposalStatus
  allow_renegotiation: boolean
}): boolean {
  return proposal.status === "sent" && proposal.allow_renegotiation
}

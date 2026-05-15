import type { ProposalLineItem } from "@/lib/types/deal-room"

export function computeCounterTotal(
  lineItems: ProposalLineItem[],
  removedNames: string[]
): number {
  return lineItems
    .filter((item) => !removedNames.includes(item.name))
    .reduce((sum, item) => sum + item.price, 0)
}

export function canClientCounterOffer(proposal: {
  status: string
  allow_renegotiation: boolean
}): boolean {
  return proposal.status === "sent" && proposal.allow_renegotiation
}

export function getActiveLineItems(
  lineItems: ProposalLineItem[],
  removedNames: string[]
): ProposalLineItem[] {
  return lineItems.filter((item) => !removedNames.includes(item.name))
}

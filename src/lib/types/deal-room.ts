import type { ItineraryCreatedBy } from "@/lib/types/database"

export type ProposalStatus = "sent" | "accepted" | "countered"
export type { ItineraryCreatedBy }

export interface ProposalLineItem {
  name: string
  price: number
  is_base: boolean
  // Extended fields stored in JSONB for change requests — absent on regular proposals
  service_id?: string | null
  quantity?: number
  description_snapshot?: string | null
  unit_price_snapshot?: number
  track_completion_snapshot?: boolean
  _discount?: number
}

export interface DealRoomProposal {
  id: string
  booking_id: string
  photographer_id: string
  package_name: string
  line_items: ProposalLineItem[]
  total_price: number
  allow_renegotiation: boolean
  status: ProposalStatus
  sent_at: string
  responded_at: string | null
}

export interface DealRoomCounterOffer {
  id: string
  proposal_id: string
  booking_id: string
  removed_item_names: string[]
  proposed_total: number
  created_at: string
}

export interface DealRoomQuestion {
  id: string
  booking_id: string
  photographer_id: string
  question_text: string
  sort_order: number
  created_at: string
}

export interface DealRoomAnswer {
  id: string
  question_id: string
  booking_id: string
  answer_text: string
  updated_at: string
}

export interface DealRoomQuestionWithAnswer extends DealRoomQuestion {
  answer: DealRoomAnswer | null
}

export interface DealRoomItineraryStop {
  id: string
  name: string
  address: string | null
  start_time: string | null
  notes: string | null
  sort_order: number
  created_by: ItineraryCreatedBy
}

export interface DealRoomData {
  booking: {
    id: string
    client_name_primary: string
    client_name_secondary: string | null
    client_email: string | null
    event_date: string | null
    venue_name: string | null
    client_token: string
    photographer_id: string
  }
  photographerName: string | null
  currency: string
  inquiryAnswers: { question_text: string; answer_value: string; sort_order: number }[]
  proposal: DealRoomProposal | null
  counterOffer: DealRoomCounterOffer | null
  questions: DealRoomQuestionWithAnswer[]
  itineraryStops: DealRoomItineraryStop[]
}

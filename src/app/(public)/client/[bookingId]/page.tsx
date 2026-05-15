import { notFound } from "next/navigation"
import { getDealRoomData } from "@/lib/queries/deal-room"
import { verifyClientToken } from "@/lib/services/deal-room-access"
import { ClientDealRoomView } from "@/components/deal-room/client-deal-room-view"

export default async function ClientDealRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { bookingId } = await params
  const { token } = await searchParams

  if (!token) notFound()

  const data = await getDealRoomData(bookingId)
  if (!data) notFound()

  if (!verifyClientToken(data.booking.client_token, token)) notFound()

  return <ClientDealRoomView data={data} token={token} />
}

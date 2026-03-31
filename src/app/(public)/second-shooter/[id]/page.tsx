import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/services/second-shooter-access";
import { getSecondShooterView } from "@/lib/queries/second-shooter";
import { PublicSecondShooterView } from "@/components/second-shooter/public-second-shooter-view";
import type { Metadata } from "next";

const SESSION_COOKIE = "ss_session";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const view = await getSecondShooterView(id);
  if (!view) return { title: "Not Found" };
  const clientName = view.booking.client_name_primary;
  return { title: `Second Shooter — ${clientName}` };
}

export default async function PublicSecondShooterPage({ params }: Props) {
  const { id } = await params;

  const view = await getSecondShooterView(id);
  if (!view) notFound();

  // Check for a valid session cookie
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(`${SESSION_COOKIE}_${id}`)?.value;
  const isAuthenticated = sessionToken ? verifySessionToken(sessionToken) === id : false;

  return (
    <PublicSecondShooterView
      bookingId={id}
      view={view}
      isAuthenticated={isAuthenticated}
    />
  );
}

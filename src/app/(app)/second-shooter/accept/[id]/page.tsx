import { redirect } from "next/navigation";
import { acceptSecondShooterInvite } from "@/lib/actions/second-shooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle, XCircle } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function AcceptSecondShooterInvitePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { token } = await searchParams;

  if (!token) {
    return <InviteResult success={false} error="Invalid invite link — no token provided." bookingId={id} />;
  }

  const result = await acceptSecondShooterInvite(id, token);

  if (result.success) {
    redirect(`/bookings/${id}`);
  }

  return <InviteResult success={false} error={result.error} bookingId={id} />;
}

function InviteResult({
  success,
  error,
  bookingId,
}: {
  success: boolean;
  error?: string;
  bookingId: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-2">
            {success ? (
              <CheckCircle className="h-10 w-10 text-green-500" />
            ) : (
              <XCircle className="h-10 w-10 text-destructive" />
            )}
          </div>
          <CardTitle>{success ? "Invite accepted!" : "Invite error"}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            {success
              ? "You can now view this booking in your account."
              : (error ?? "Something went wrong.")}
          </p>
          <Button asChild className="w-full">
            <Link href={success ? `/bookings/${bookingId}` : "/bookings"}>
              {success ? "View booking" : "Go to bookings"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

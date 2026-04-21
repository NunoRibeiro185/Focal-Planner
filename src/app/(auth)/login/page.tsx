import { LoginForm } from "./login-form";

// Authenticated users are redirected away from /login by middleware.
export default async function LoginPage() {

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl tracking-wide text-foreground" style={{ fontFamily: "var(--font-heading)" }}>Focal Planner</h1>
          <p className="text-muted-foreground mt-2">
            Photography business management
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}

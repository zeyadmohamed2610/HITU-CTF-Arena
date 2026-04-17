import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { ShieldOff } from 'lucide-react';

export default function BannedPage() {
  const { signOut } = useAuthStore();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center space-y-4">
        <ShieldOff className="h-16 w-16 text-destructive mx-auto" />
        <h1 className="text-3xl font-sans font-bold text-destructive">Account Banned</h1>
        <p className="text-muted-foreground">Your account has been suspended. Contact an administrator.</p>
        <Button variant="outline" onClick={signOut}>Sign Out</Button>
      </div>
    </div>
  );
}

// src/app/auth/update-password/page.tsx
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import UpdatePasswordForm from './UpdatePasswordForm';

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-gray-600">Loading...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <UpdatePasswordForm />
    </Suspense>
  );
}

// src/app/dashboard/landlord/verify/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useVerification } from '@/hooks/useVerification';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Shield,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Upload,
  FileText,
  Loader2,
  ArrowLeft,
  Info,
  Eye,
  X,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { MAX_DOCUMENT_SIZE } from '@/utils/constants';

type DocumentType = 'idDocument' | 'proofOfAddress' | 'businessLicense';

const VERIFICATION_CONFIGS = {
  unverified: {
    icon: AlertCircle,
    color: 'gray',
    title: 'Not Submitted',
    description: 'Complete your verification to start listing properties in Eswatini.',
  },
  pending: {
    icon: Clock,
    color: 'amber',
    title: 'Verification Pending',
    description: 'Your documents are being reviewed. This typically takes 1-2 business days.',
  },
  verified: {
    icon: CheckCircle,
    color: 'green',
    title: 'Verified!',
    description: 'Your account has been verified. You can now list properties in Eswatini.',
  },
  rejected: {
    icon: XCircle,
    color: 'red',
    title: 'Verification Rejected',
    description: 'Your verification was rejected. Please submit new or updated documents below.',
  },
} as const;

export default function VerificationPage() {
  const { user, userType, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { status, submitVerification, isSubmitting, refreshVerification } = useVerification();
  const [documents, setDocuments] = useState<{
    idDocument: File | null;
    proofOfAddress: File | null;
    businessLicense: File | null;
  }>({
    idDocument: null,
    proofOfAddress: null,
    businessLicense: null,
  });
  const [documentPreviews, setDocumentPreviews] = useState<{
    idDocument: string | null;
    proofOfAddress: string | null;
    businessLicense: string | null;
  }>({
    idDocument: null,
    proofOfAddress: null,
    businessLicense: null,
  });
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const config = VERIFICATION_CONFIGS[status as keyof typeof VERIFICATION_CONFIGS] || VERIFICATION_CONFIGS.unverified;

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      if (userType !== 'landlord') {
        router.push('/dashboard');
        return;
      }
      setIsLoading(false);
      refreshVerification();
    }
  }, [user, userType, authLoading, router, refreshVerification]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, type: DocumentType) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > MAX_DOCUMENT_SIZE) {
          toast.error('File size must be under 10MB');
          return;
        }

        // Check if it's an image or PDF
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
          toast.error('Please upload a JPG, PNG, or PDF file');
          return;
        }

        // Revoke previous preview
        if (documentPreviews[type]) {
          URL.revokeObjectURL(documentPreviews[type]!);
        }

        const preview = URL.createObjectURL(file);
        setDocuments(prev => ({ ...prev, [type]: file }));
        setDocumentPreviews(prev => ({ ...prev, [type]: preview }));
      }
    },
    [documentPreviews]
  );

  const removeDocument = useCallback((type: DocumentType) => {
    if (documentPreviews[type]) {
      URL.revokeObjectURL(documentPreviews[type]!);
    }
    setDocuments(prev => ({ ...prev, [type]: null }));
    setDocumentPreviews(prev => ({ ...prev, [type]: null }));
  }, [documentPreviews]);

  const handleSubmit = async () => {
    if (!documents.idDocument) {
      toast.error('Please upload a government ID');
      return;
    }

    const success = await submitVerification({
      idDocument: documents.idDocument,
      proofOfAddress: documents.proofOfAddress || undefined,
      businessLicense: documents.businessLicense || undefined,
    });

    if (success) {
      // Clear form
      Object.keys(documentPreviews).forEach(key => {
        if (documentPreviews[key as DocumentType]) {
          URL.revokeObjectURL(documentPreviews[key as DocumentType]!);
        }
      });
      setDocuments({
        idDocument: null,
        proofOfAddress: null,
        businessLicense: null,
      });
      setDocumentPreviews({
        idDocument: null,
        proofOfAddress: null,
        businessLicense: null,
      });
      setNotes('');
    }
  };

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      Object.values(documentPreviews).forEach(preview => {
        if (preview) URL.revokeObjectURL(preview);
      });
    };
  }, [documentPreviews]);

  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-100">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const Icon = config.icon;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/dashboard/landlord">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          Landlord Verification
        </h1>
        <p className="text-gray-600 mt-1">
          Complete your verification to start listing properties in Eswatini
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Documents</p>
              <p className="font-semibold">
                {status === 'verified' ? '✓ Complete' : 
                 status === 'pending' ? 'Submitted' : 
                 status === 'rejected' ? 'Rejected' : 'Ready'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Review Status</p>
              <p className="font-semibold capitalize">
                {status === 'unverified' && 'Not Submitted'}
                {status === 'pending' && 'In Review'}
                {status === 'verified' && 'Approved ✓'}
                {status === 'rejected' && 'Rejected'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Info className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Timeline</p>
              <p className="font-semibold">
                {status === 'verified' ? 'Complete' : '1-2 business days'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Messages */}
      <Alert className={`mb-6 border-${config.color}-500 bg-${config.color}-50 dark:bg-${config.color}-950/50`}>
        <Icon className={`h-4 w-4 text-${config.color}-600`} />
        <AlertTitle className={`text-${config.color}-800 dark:text-${config.color}-200`}>
          {config.title}
        </AlertTitle>
        <AlertDescription className={`text-${config.color}-700 dark:text-${config.color}-300`}>
          {config.description}
        </AlertDescription>
      </Alert>

      {/* Verification Form */}
      {(status === 'unverified' || status === 'rejected') && (
        <Card>
          <CardHeader>
            <CardTitle>Submit Verification Documents</CardTitle>
            <CardDescription>
              Please upload clear photos or scans of your documents. All files must be under 10MB.
              Accepted formats: JPG, PNG, PDF.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ID Document */}
            <div>
              <Label className="font-semibold">
                Government ID *
                <span className="font-normal text-gray-500 ml-2">
                  (Passport, Driver&apos;s License, or National ID)
                </span>
              </Label>
              <div className="mt-2">
                {documentPreviews.idDocument ? (
                  <div className="relative inline-block">
                    {documentPreviews.idDocument.startsWith('blob:') ? (
                      <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
                        <Image
                          src={documentPreviews.idDocument}
                          alt="ID Document Preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="p-4 border rounded-lg bg-gray-50">
                        <FileText className="h-8 w-8 text-gray-400" />
                        <p className="text-sm mt-1">{documents.idDocument?.name}</p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeDocument('idDocument')}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange(e, 'idDocument')}
                        className="cursor-pointer"
                      />
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Accepted formats: JPG, PNG, PDF (Max 10MB)
                </p>
              </div>
            </div>

            {/* Proof of Address */}
            <div>
              <Label className="font-semibold">
                Proof of Address
                <span className="font-normal text-gray-500 ml-2">
                  (Optional - Utility bill or bank statement from last 3 months)
                </span>
              </Label>
              <div className="mt-2">
                {documentPreviews.proofOfAddress ? (
                  <div className="relative inline-block">
                    {documentPreviews.proofOfAddress.startsWith('blob:') ? (
                      <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
                        <Image
                          src={documentPreviews.proofOfAddress}
                          alt="Proof of Address Preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="p-4 border rounded-lg bg-gray-50">
                        <FileText className="h-8 w-8 text-gray-400" />
                        <p className="text-sm mt-1">{documents.proofOfAddress?.name}</p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeDocument('proofOfAddress')}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange(e, 'proofOfAddress')}
                        className="cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Business License */}
            <div>
              <Label className="font-semibold">
                Business License
                <span className="font-normal text-gray-500 ml-2">
                  (Optional - For property management companies)
                </span>
              </Label>
              <div className="mt-2">
                {documentPreviews.businessLicense ? (
                  <div className="relative inline-block">
                    {documentPreviews.businessLicense.startsWith('blob:') ? (
                      <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
                        <Image
                          src={documentPreviews.businessLicense}
                          alt="Business License Preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="p-4 border rounded-lg bg-gray-50">
                        <FileText className="h-8 w-8 text-gray-400" />
                        <p className="text-sm mt-1">{documents.businessLicense?.name}</p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeDocument('businessLicense')}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange(e, 'businessLicense')}
                        className="cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional information about your property management..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Privacy & Security</AlertTitle>
              <AlertDescription>
                Your documents are securely stored and encrypted. They will only be used for
                verification purposes and will not be shared with any third parties.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleSubmit}
              disabled={!documents.idDocument || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Submit for Review
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            Common questions about the verification process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium">Why do I need to verify?</h4>
            <p className="text-sm text-gray-500">
              Verification helps build trust with renters and ensures a safe
              platform for everyone in Eswatini. Verified landlords get a special badge on
              their listings.
            </p>
          </div>
          <div>
            <h4 className="font-medium">How long does it take?</h4>
            <p className="text-sm text-gray-500">
              Most verifications are completed within 1-2 business days. You&apos;ll
              receive an email notification once your account is verified.
            </p>
          </div>
          <div>
            <h4 className="font-medium">What if my verification is rejected?</h4>
            <p className="text-sm text-gray-500">
              If your verification is rejected, you&apos;ll receive an email explaining
              why. You can submit new documents for review at any time.
            </p>
          </div>
          <Button variant="outline" asChild className="w-full">
            <a href="mailto:support@ekhaya.com">Contact Support</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// src/emails/WelcomeEmail.tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Button,
  Tailwind,
} from '@react-email/components';

interface WelcomeEmailProps {
  name: string;
  userType: string;
}

export function WelcomeEmail({ name, userType }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to SwaziRent! 🏠</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="bg-white p-8 rounded-lg shadow-lg">
            <Heading className="text-2xl font-bold text-center mb-4">
              Welcome to SwaziRent!
            </Heading>
            <Text className="text-gray-700 mb-4">Hi {name},</Text>
            <Text className="text-gray-700 mb-4">
              Thank you for joining SwaziRent, Eswatini&apos;s most trusted
              rental platform. We&apos;re excited to help you{' '}
              {userType === 'landlord'
                ? 'find great tenants'
                : 'find your next home'}
              .
            </Text>
            {userType === 'landlord' ? (
              <>
                <Text className="text-gray-700 mb-4">
                  Start by listing your property. It&apos;s free and takes just
                  a few minutes.
                </Text>
                <Button
                  href="https://swazirent.com/dashboard/landlord/add-property"
                  className="bg-primary text-white px-6 py-3 rounded-lg"
                >
                  List Your Property
                </Button>
              </>
            ) : (
              <>
                <Text className="text-gray-700 mb-4">
                  Start searching for your perfect home today.
                </Text>
                <Button
                  href="https://swazirent.com/search"
                  className="bg-primary text-white px-6 py-3 rounded-lg"
                >
                  Search Properties
                </Button>
              </>
            )}
            <Text className="text-gray-500 text-sm mt-8">
              If you have any questions, just reply to this email. We&apos;re
              here to help!
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

// src/components/layout/Header.tsx
'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Home,
  Search,
  User,
  LogIn,
  LogOut,
  Menu,
  LayoutDashboard,
  PlusCircle,
  Sun,
  Moon,
  X,
  Building2,
  ArrowRight,
  Shield,
  Heart,
  Settings,
  Map as MapIcon,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useVerification } from '@/hooks/useVerification';
import { useTheme } from '@/contexts/ThemeContext';
import {
  canPostListings,
  isSeekerRole,
  getDefaultRedirect,
  getUserTypeLabel,
} from '@/types/user';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useState, useEffect, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userType, signOut, isLoading, isInitialized } = useAuth();
  const {
    isLandlordVerified,
    isLandlordPending,
    isLandlordRejected,
  } = useVerification();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const isPoster = canPostListings(userType);
  const isSeeker = isSeekerRole(userType);
  const showLoading = !isInitialized && isLoading;

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.substring(0, 2).toUpperCase();
  };

  const dashboardLink = getDefaultRedirect(userType);

  const handleListProperty = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      setMobileMenuOpen(false);

      if (!user) {
        router.push('/auth/signup?type=broker');
        toast.info('Create a broker or agent account to list properties');
        return;
      }

      if (userType === 'admin') {
        router.push('/dashboard/admin');
        return;
      }

      if (isPoster) {
        if (isLandlordVerified) {
          router.push('/dashboard/landlord/add-property');
        } else if (isLandlordPending) {
          toast.info('Verification in progress', {
            description: 'You can still save drafts from My Listings.',
          });
          router.push('/dashboard/landlord');
        } else if (isLandlordRejected) {
          toast.error('Verification was rejected. Please resubmit documents.');
          router.push('/dashboard/landlord');
        } else {
          toast.info('Complete verification to publish listings');
          router.push('/dashboard/landlord');
        }
        return;
      }

      if (isSeeker) {
        setShowUpgradeDialog(true);
        return;
      }

      router.push('/auth/signup?type=broker');
    },
    [
      user,
      userType,
      isPoster,
      isSeeker,
      isLandlordVerified,
      isLandlordPending,
      isLandlordRejected,
      router,
    ]
  );

  const listButtonLabel = (() => {
    if (!user) return 'List Property';
    if (isPoster) {
      if (isLandlordPending) return 'Verifying…';
      if (isLandlordRejected) return 'Verification failed';
      if (!isLandlordVerified) return 'Get verified';
      return 'List Property';
    }
    if (isSeeker) return 'List Property';
    return 'List Property';
  })();

  const navLinks = [
    { href: '/search', label: 'Search' },
    { href: '/map', label: 'Map' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Home className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg text-gray-900 dark:text-white">Ekhaya</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  pathname?.startsWith(link.href)
                    ? 'text-primary'
                    : 'text-gray-700 dark:text-gray-300 hover:text-primary'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Button
              variant="secondary"
              size="sm"
              className="ml-2"
              onClick={handleListProperty}
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              {listButtonLabel}
            </Button>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full h-9 w-9"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>

            {showLoading ? (
              <div className="h-9 w-20 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="relative h-9 w-9 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label="User menu"
                  >
                    <Avatar className="h-9 w-9 border-2 border-gray-200 dark:border-gray-700">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback className="text-xs font-medium">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    {isPoster && isLandlordVerified && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
                    )}
                    {isPoster && isLandlordPending && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 border-2 border-white dark:border-gray-900 rounded-full animate-pulse" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-medium truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      {getUserTypeLabel(userType)}
                      {isPoster && isLandlordVerified && (
                        <span className="inline-flex items-center text-[10px] text-green-700 bg-green-100 px-1.5 rounded-full">
                          <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                          Verified
                        </span>
                      )}
                      {isPoster && isLandlordPending && (
                        <span className="inline-flex items-center text-[10px] text-amber-800 bg-amber-100 px-1.5 rounded-full">
                          <Clock className="h-2.5 w-2.5 mr-0.5" />
                          Pending
                        </span>
                      )}
                      {isPoster && isLandlordRejected && (
                        <span className="inline-flex items-center text-[10px] text-red-800 bg-red-100 px-1.5 rounded-full">
                          <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                          Rejected
                        </span>
                      )}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={dashboardLink}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  {isPoster && (
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/landlord/add-property">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add listing
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isSeeker && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/renter">
                          <Heart className="mr-2 h-4 w-4" />
                          Saved properties
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowUpgradeDialog(true)}>
                        <Building2 className="mr-2 h-4 w-4" />
                        List properties
                        <ArrowRight className="ml-auto h-4 w-4" />
                      </DropdownMenuItem>
                    </>
                  )}
                  {isPoster && !isLandlordVerified && (
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/landlord">
                        <Shield className="mr-2 h-4 w-4" />
                        Verification
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/auth/login">Login</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/auth/signup">Sign Up</Link>
                </Button>
              </div>
            )}

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-sm">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="flex items-center justify-between mb-6">
                  <Link href="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                    <Home className="h-5 w-5 text-primary" />
                    <span className="font-bold text-lg">Ekhaya</span>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <nav className="flex flex-col gap-1">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="px-3 py-3 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.href === '/map' && <MapIcon className="inline h-4 w-4 mr-2" />}
                      {link.href === '/search' && <Search className="inline h-4 w-4 mr-2" />}
                      {link.label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleListProperty()}
                    className="px-3 py-3 rounded-lg text-sm font-medium text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <PlusCircle className="inline h-4 w-4 mr-2" />
                    {listButtonLabel}
                  </button>
                  {!user && (
                    <div className="mt-4 space-y-2 border-t pt-4">
                      <Button className="w-full" asChild>
                        <Link href="/auth/signup" onClick={() => setMobileMenuOpen(false)}>
                          Sign Up
                        </Link>
                      </Button>
                      <Button variant="outline" className="w-full" asChild>
                        <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                          <LogIn className="mr-2 h-4 w-4" />
                          Login
                        </Link>
                      </Button>
                    </div>
                  )}
                  {user && (
                    <div className="mt-4 space-y-1 border-t pt-4">
                      <Link
                        href={dashboardLink}
                        className="block px-3 py-2 text-sm"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <button
                        type="button"
                        className="block w-full text-left px-3 py-2 text-sm text-red-600"
                        onClick={() => {
                          signOut();
                          setMobileMenuOpen(false);
                        }}
                      >
                        Log out
                      </button>
                    </div>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <div className="h-16" />

      <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              List properties on Ekhaya
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Seekers can save listings and set alerts. To post listings you need a
                broker or agent account.
              </p>
              <ul className="text-sm list-disc pl-5 space-y-1">
                <li>Post and manage listings</li>
                <li>Phone verification before publish</li>
                <li>Optional account verification badge</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Maybe later</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowUpgradeDialog(false);
                router.push(
                  `/auth/upgrade?email=${encodeURIComponent(user?.email || '')}`
                );
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

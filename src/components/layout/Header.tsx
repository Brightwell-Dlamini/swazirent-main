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
  Clock,
  Sun,
  Moon,
  Sparkles,
  X,
  ChevronRight,
  CheckCircle,
  Building2,
  ArrowRight,
  UserPlus,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useVerification } from '@/hooks/useVerification';
import { useTheme } from '@/contexts/ThemeContext';
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
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userType, signOut, isLoading, isInitialized } = useAuth();
  const { 
    status, 
    isLandlordVerified, 
    isLandlordPending, 
    isLandlordRejected,
    submitVerification,
    isSubmitting,
  } = useVerification();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [verificationDocs, setVerificationDocs] = useState<{
    idDocument: File | null;
    proofOfAddress: File | null;
    businessLicense: File | null;
  }>({
    idDocument: null,
    proofOfAddress: null,
    businessLicense: null,
  });

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // ONLY show loading on initial page load, never on tab switches
  const showLoading = !isInitialized && isLoading;

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.substring(0, 2).toUpperCase();
  };

  const getDashboardLink = () => {
    switch (userType) {
      case 'admin': return '/dashboard/admin';
      case 'landlord': return '/dashboard/landlord';
      default: return '/dashboard/renter';
    }
  };

  const handleUpgradeToLandlord = () => {
    setShowUpgradeDialog(false);
    const email = user?.email || '';
    router.push(`/auth/upgrade?email=${encodeURIComponent(email)}`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'idDocument' | 'proofOfAddress' | 'businessLicense') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be under 10MB');
        return;
      }
      setVerificationDocs(prev => ({ ...prev, [type]: file }));
    }
  };

  const handleSubmitVerification = async () => {
    if (!verificationDocs.idDocument) {
      toast.error('Please upload an ID document');
      return;
    }

    const success = await submitVerification({
      idDocument: verificationDocs.idDocument,
      proofOfAddress: verificationDocs.proofOfAddress || undefined,
      businessLicense: verificationDocs.businessLicense || undefined,
    });

    if (success) {
      setShowVerificationDialog(false);
      setVerificationDocs({
        idDocument: null,
        proofOfAddress: null,
        businessLicense: null,
      });
    }
  };

  const handleListProperty = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push('/auth/signup?type=landlord');
      toast.info('Create a landlord account to list properties', {
        description: 'Join our community of trusted landlords today!',
        duration: 4000,
        icon: <Sparkles className="h-4 w-4 text-primary-500" />,
      });
      setMobileMenuOpen(false);
      return;
    }

    switch (userType) {
      case 'landlord':
        if (isLandlordVerified) {
          router.push('/dashboard/landlord/add-property');
        } else if (isLandlordPending) {
          toast.info('Verification in progress', {
            description: 'Your documents are being reviewed. This typically takes 1-2 business days.',
            duration: 6000,
            action: {
              label: 'Check Status',
              onClick: () => setShowVerificationDialog(true),
            },
          });
        } else if (isLandlordRejected) {
          toast.error('Verification rejected', {
            description: 'Please submit new documents for review.',
            duration: 6000,
            action: {
              label: 'Submit Again',
              onClick: () => setShowVerificationDialog(true),
            },
          });
        } else {
          setShowVerificationDialog(true);
        }
        break;

      case 'admin':
        router.push('/dashboard/admin/properties/new');
        break;

      case 'renter':
        setShowUpgradeDialog(true);
        break;

      default:
        router.push('/auth/signup?type=landlord');
    }

    setMobileMenuOpen(false);
  };

  const getListPropertyButtonContent = () => {
    if (!user) {
      return {
        icon: PlusCircle,
        text: 'List Property',
        color: 'text-primary-600 dark:text-primary-400',
        bgColor: 'bg-primary-50 dark:bg-primary-950/50',
        badge: null,
        tooltip: 'Create a landlord account to list properties',
      };
    }

    if (userType === 'landlord') {
      if (isLandlordPending) {
        return {
          icon: Clock,
          text: 'Verifying...',
          color: 'text-amber-600 dark:text-amber-400',
          bgColor: 'bg-amber-50 dark:bg-amber-950/50',
          badge: null,
          tooltip: 'Your verification is being reviewed',
        };
      }
      if (isLandlordRejected) {
        return {
          icon: AlertCircle,
          text: 'Verification Failed',
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-950/50',
          badge: null,
          tooltip: 'Please submit new verification documents',
        };
      }
      if (isLandlordVerified) {
        return {
          icon: PlusCircle,
          text: 'List Property',
          color: 'text-primary-600 dark:text-primary-400',
          bgColor: 'bg-primary-50 dark:bg-primary-950/50',
          badge: <Sparkles className="h-3 w-3 ml-1 text-amber-500 animate-pulse" />,
          tooltip: 'List a new property',
        };
      }
      return {
        icon: Shield,
        text: 'Get Verified',
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-50 dark:bg-purple-950/50',
        badge: null,
        tooltip: 'Complete verification to list properties',
      };
    }

    if (userType === 'renter') {
      return {
        icon: Building2,
        text: 'Become a Landlord',
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-50 dark:bg-purple-950/50',
        badge: <ArrowRight className="h-3 w-3 ml-1" />,
        tooltip: 'Upgrade to a landlord account',
      };
    }

    return {
      icon: PlusCircle,
      text: 'List Property',
      color: 'text-primary-600 dark:text-primary-400',
      bgColor: 'bg-primary-50 dark:bg-primary-950/50',
      badge: null,
      tooltip: 'List a property',
    };
  };

  const buttonContent = getListPropertyButtonContent();
  const ButtonIcon = buttonContent.icon;

  const navLinks = [
    { href: '/search', label: 'Search', icon: Search },
    { href: '/about', label: 'About', icon: null },
    { href: '/contact', label: 'Contact', icon: null },
  ];

  const isActiveLink = (href: string) => {
    if (href === '/search' && pathname?.startsWith('/search')) return true;
    return pathname === href;
  };

  const headerVariants = {
    initial: { y: -100 },
    animate: {
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 30,
      },
    },
  };

  const mobileMenuItemVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <>
      <motion.header
        variants={headerVariants}
        initial="initial"
        animate="animate"
        className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center space-x-2 group relative"
            aria-label="SwaziRent Home"
          >
            <div className="relative">
              <Home className="h-6 w-6 text-primary-600 dark:text-primary-400 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-5deg]" />
              <motion.div
                className="absolute inset-0 rounded-full bg-primary-400/20 dark:bg-primary-600/20"
                initial={false}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <span className="font-bold text-xl text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              SwaziRent
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = isActiveLink(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    relative px-4 py-2 rounded-lg text-sm font-medium
                    transition-all duration-200 group
                    ${isActive
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
                    }
                  `}
                >
                  <span className="flex items-center space-x-1">
                    {Icon && (
                      <Icon
                        className={`
                          h-4 w-4 transition-transform duration-200 
                          group-hover:scale-110
                          ${isActive ? 'text-primary-600 dark:text-primary-400' : ''}
                        `}
                      />
                    )}
                    <span>{link.label}</span>
                  </span>
                  {isActive && (
                    <motion.span
                      layoutId="activeNavIndicator"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-full"
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                </Link>
              );
            })}

            {/* List Property Button - Desktop */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleListProperty}
              className={`
                relative ml-4 px-4 py-2 rounded-lg flex items-center space-x-2
                font-medium transition-all duration-200 overflow-hidden group
                ${buttonContent.color}
                ${buttonContent.bgColor}
                hover:shadow-md
              `}
              title={buttonContent.tooltip}
            >
              <ButtonIcon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
              <span>{buttonContent.text}</span>
              {buttonContent.badge}
            </motion.button>
          </nav>

          {/* Right Section */}
          <div className="flex items-center space-x-2">
            {/* Theme Toggle */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 relative overflow-hidden group"
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={theme}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {theme === 'light' ? (
                      <Moon className="h-5 w-5" />
                    ) : (
                      <Sun className="h-5 w-5" />
                    )}
                  </motion.div>
                </AnimatePresence>
                <motion.div
                  className="absolute inset-0 bg-primary-600/10 dark:bg-primary-400/10 rounded-full"
                  initial={false}
                  whileHover={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                />
              </Button>
            </motion.div>

            {/* Auth Section - Only show loading on initial page load */}
            {showLoading ? (
              <div className="hidden md:flex items-center space-x-2">
                <div className="h-9 w-20 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="h-9 w-20 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
              </div>
            ) : (
              <>
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="relative h-9 w-9 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                        aria-label="User menu"
                      >
                        <Avatar className="h-9 w-9 border-2 border-gray-200 dark:border-gray-700 transition-colors hover:border-primary-500 dark:hover:border-primary-400">
                          <AvatarImage src={user.user_metadata?.avatar_url} />
                          <AvatarFallback className="bg-linear-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 text-primary-700 dark:text-primary-300 font-medium">
                            {getUserInitials()}
                          </AvatarFallback>
                        </Avatar>
                        {userType === 'landlord' && isLandlordVerified && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full shadow-lg"
                          >
                            <span className="sr-only">Verified Landlord</span>
                          </motion.span>
                        )}
                        {userType === 'landlord' && isLandlordPending && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 border-2 border-white dark:border-gray-900 rounded-full shadow-lg animate-pulse"
                          >
                            <span className="sr-only">Verification Pending</span>
                          </motion.span>
                        )}
                      </motion.button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-64 mt-2 border-gray-200 dark:border-gray-800 shadow-xl dark:shadow-gray-950"
                      align="end"
                      forceMount
                    >
                      <DropdownMenuLabel className="font-normal p-4 bg-linear-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                        <div className="flex flex-col space-y-2">
                          <p className="text-sm font-medium leading-none text-gray-900 dark:text-white truncate">
                            {user.email}
                          </p>
                          <div className="flex items-center space-x-2 flex-wrap gap-1">
                            <p className="text-xs leading-none text-gray-500 dark:text-gray-400 capitalize flex items-center space-x-1">
                              <span>{userType}</span>
                            </p>
                            {userType === 'landlord' && isLandlordVerified && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </span>
                            )}
                            {userType === 'landlord' && isLandlordPending && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </span>
                            )}
                            {userType === 'landlord' && isLandlordRejected && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Rejected
                              </span>
                            )}
                            {userType === 'renter' && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                <User className="h-3 w-3 mr-1" />
                                Renter
                              </span>
                            )}
                          </div>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="dark:border-gray-800" />
                      <DropdownMenuItem asChild>
                        <Link
                          href={getDashboardLink()}
                          className="cursor-pointer text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 focus:text-primary-600 dark:focus:text-primary-400"
                        >
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          <span>Dashboard</span>
                          <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
                        </Link>
                      </DropdownMenuItem>
                      
                      {userType === 'landlord' && !isLandlordVerified && (
                        <DropdownMenuItem
                          onClick={() => setShowVerificationDialog(true)}
                          className="cursor-pointer text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          <span>Complete Verification</span>
                          {isLandlordPending && (
                            <span className="ml-auto text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                              Pending
                            </span>
                          )}
                        </DropdownMenuItem>
                      )}

                      {userType === 'renter' && (
                        <DropdownMenuItem
                          onClick={() => setShowUpgradeDialog(true)}
                          className="cursor-pointer text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 focus:text-purple-700 dark:focus:text-purple-300"
                        >
                          <Building2 className="mr-2 h-4 w-4" />
                          <span>Become a Landlord</span>
                          <ArrowRight className="ml-auto h-4 w-4" />
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link
                          href="/profile"
                          className="cursor-pointer text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 focus:text-primary-600 dark:focus:text-primary-400"
                        >
                          <User className="mr-2 h-4 w-4" />
                          <span>Profile</span>
                          <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="dark:border-gray-800" />
                      <DropdownMenuItem
                        onClick={signOut}
                        className="cursor-pointer text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 focus:text-red-700 dark:focus:text-red-300"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="hidden md:flex items-center space-x-2">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/50"
                      >
                        <Link href="/auth/login">Login</Link>
                      </Button>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        size="sm"
                        asChild
                        className="bg-linear-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white dark:from-primary-500 dark:to-primary-400 dark:hover:from-primary-600 dark:hover:to-primary-500 shadow-md hover:shadow-lg transition-all duration-200"
                      >
                        <Link href="/auth/signup">
                          Sign Up
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </motion.div>
                  </div>
                )}
              </>
            )}

            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 relative"
                    aria-label="Open menu"
                  >
                    <AnimatePresence mode="wait">
                      {mobileMenuOpen ? (
                        <motion.div
                          key="close"
                          initial={{ rotate: -90, opacity: 0 }}
                          animate={{ rotate: 0, opacity: 1 }}
                          exit={{ rotate: 90, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <X className="h-5 w-5" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="menu"
                          initial={{ rotate: 90, opacity: 0 }}
                          animate={{ rotate: 0, opacity: 1 }}
                          exit={{ rotate: -90, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Menu className="h-5 w-5" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </motion.div>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-full sm:w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 p-0"
              >
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>

                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                  <Link
                    href="/"
                    className="flex items-center space-x-2 group"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="relative">
                      <Home className="h-5 w-5 text-primary-600 dark:text-primary-400 transition-transform group-hover:scale-110" />
                    </div>
                    <span className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      SwaziRent
                    </span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                  </Button>
                </div>

                <nav className="flex flex-col p-4">
                  <AnimatePresence>
                    {navLinks.map((link, index) => {
                      const Icon = link.icon;
                      const isActive = isActiveLink(link.href);

                      return (
                        <motion.div
                          key={link.href}
                          variants={mobileMenuItemVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          transition={{ delay: index * 0.05 }}
                        >
                          <Link
                            href={link.href}
                            className={`
                              flex items-center space-x-3 p-4 rounded-xl
                              transition-all duration-200 group
                              ${isActive
                                ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                              }
                            `}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {Icon && (
                              <Icon
                                className={`
                                  h-5 w-5 transition-transform duration-200 
                                  group-hover:scale-110
                                  ${isActive ? 'text-primary-600 dark:text-primary-400' : ''}
                                `}
                              />
                            )}
                            <span className="flex-1 font-medium">{link.label}</span>
                            {isActive && (
                              <motion.div
                                layoutId="activeMobileIndicator"
                                className="w-1.5 h-1.5 rounded-full bg-primary-600 dark:bg-primary-400"
                              />
                            )}
                          </Link>
                        </motion.div>
                      );
                    })}

                    <motion.div
                      variants={mobileMenuItemVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ delay: navLinks.length * 0.05 }}
                      className="mt-2"
                    >
                      <button
                        onClick={handleListProperty}
                        className={`
                          flex items-center space-x-3 p-4 rounded-xl
                          transition-all duration-200 w-full text-left group
                          ${buttonContent.color}
                          ${buttonContent.bgColor}
                          hover:shadow-md
                        `}
                      >
                        <ButtonIcon className="h-5 w-5 transition-transform group-hover:scale-110" />
                        <span className="flex-1 font-medium">{buttonContent.text}</span>
                        {buttonContent.badge}
                      </button>
                    </motion.div>

                    <motion.div
                      variants={mobileMenuItemVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ delay: (navLinks.length + 1) * 0.05 }}
                      className="mt-2"
                    >
                      <button
                        onClick={() => {
                          toggleTheme();
                          setMobileMenuOpen(false);
                        }}
                        className="flex items-center space-x-3 p-4 rounded-xl w-full text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 group"
                      >
                        {theme === 'light' ? (
                          <>
                            <Moon className="h-5 w-5 transition-transform group-hover:scale-110" />
                            <span className="flex-1 font-medium">Dark Mode</span>
                          </>
                        ) : (
                          <>
                            <Sun className="h-5 w-5 transition-transform group-hover:scale-110" />
                            <span className="flex-1 font-medium">Light Mode</span>
                          </>
                        )}
                        <motion.div
                          className="w-10 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center p-0.5"
                          animate={{
                            justifyContent: theme === 'light' ? 'flex-start' : 'flex-end',
                          }}
                        >
                          <motion.div
                            className="w-4 h-4 rounded-full bg-primary-600 dark:bg-primary-400"
                            layout
                            transition={{
                              type: 'spring',
                              stiffness: 500,
                              damping: 30,
                            }}
                          />
                        </motion.div>
                      </button>
                    </motion.div>
                  </AnimatePresence>

                  {!user && !showLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ delay: (navLinks.length + 2) * 0.05 }}
                      className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6 space-y-3"
                    >
                      <Button
                        className="w-full bg-linear-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white dark:from-primary-500 dark:to-primary-400 dark:hover:from-primary-600 dark:hover:to-primary-500 shadow-lg hover:shadow-xl transition-all duration-200 h-12"
                        asChild
                      >
                        <Link
                          href="/auth/signup"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Sign Up
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-primary-500 dark:hover:border-primary-400 transition-all duration-200 h-12"
                        asChild
                      >
                        <Link
                          href="/auth/login"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <LogIn className="mr-2 h-4 w-4" />
                          Login
                        </Link>
                      </Button>
                    </motion.div>
                  )}
                </nav>

                {user && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200 dark:border-gray-800 bg-linear-to-t from-white to-transparent dark:from-gray-900 dark:to-transparent"
                  >
                    <div className="space-y-2">
                      {userType === 'renter' && (
                        <button
                          onClick={() => {
                            setShowUpgradeDialog(true);
                            setMobileMenuOpen(false);
                          }}
                          className="flex items-center space-x-3 p-3 rounded-xl w-full text-left text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-all duration-200"
                        >
                          <Building2 className="h-5 w-5" />
                          <span className="flex-1 font-medium">Become a Landlord</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      )}
                      {userType === 'landlord' && !isLandlordVerified && (
                        <button
                          onClick={() => {
                            setShowVerificationDialog(true);
                            setMobileMenuOpen(false);
                          }}
                          className="flex items-center space-x-3 p-3 rounded-xl w-full text-left text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-all duration-200"
                        >
                          <Shield className="h-5 w-5" />
                          <span className="flex-1 font-medium">
                            {isLandlordPending ? 'Verification Pending' : 'Complete Verification'}
                          </span>
                          {isLandlordPending && (
                            <Clock className="h-4 w-4 animate-pulse" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          signOut();
                          setMobileMenuOpen(false);
                        }}
                        className="flex items-center space-x-3 p-3 rounded-xl w-full text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all duration-200"
                      >
                        <LogOut className="h-5 w-5" />
                        <span className="flex-1 font-medium">Log out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </motion.header>

      {/* Upgrade Dialog */}
      <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              <span>Become a Landlord</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                As a renter, you can search for properties and manage your rentals.
                To list properties on SwaziRent, you need to upgrade to a landlord account.
              </p>
              <div className="bg-purple-50 dark:bg-purple-950/50 p-4 rounded-lg space-y-2">
                <p className="font-semibold text-purple-900 dark:text-purple-100 flex items-center">
                  <Sparkles className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
                  Landlord Benefits:
                </p>
                <ul className="text-sm space-y-1 text-purple-800 dark:text-purple-200">
                  <li>• List and manage multiple properties</li>
                  <li>• Receive rental inquiries from tenants</li>
                  <li>• Track property performance</li>
                  <li>• Verified badge for trust</li>
                </ul>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                You'll keep your current account and we'll help you transition smoothly.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="mt-0">Maybe Later</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpgradeToLandlord}
              className="bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-500 dark:hover:bg-purple-600"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Upgrade Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Verification Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-primary" />
              <span>Verify Your Landlord Account</span>
            </DialogTitle>
            <DialogDescription>
              {isLandlordPending 
                ? 'Your verification is being reviewed. You\'ll receive an email once approved.'
                : isLandlordRejected
                ? 'Your previous verification was rejected. Please submit new documents.'
                : 'Submit the required documents to verify your landlord account.'}
            </DialogDescription>
          </DialogHeader>

          {isLandlordPending ? (
            <div className="py-8 text-center">
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-amber-600 animate-pulse" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Verification in Progress</h3>
              <p className="text-gray-500 text-sm">
                Your documents are being reviewed by our team. This typically takes 1-2 business days.
                You'll receive an email notification once your account is verified.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  refreshVerification();
                  toast.success('Status checked');
                }}
              >
                Check Status
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Required Documents</Label>
                <div className="space-y-3">
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Government ID</p>
                        <p className="text-xs text-gray-500">Passport, Driver's License, or National ID</p>
                      </div>
                      <div className="relative">
                        <Input
                          type="file"
                          accept="image/*,.pdf"
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          onChange={(e) => handleFileChange(e, 'idDocument')}
                        />
                        <Button variant="outline" size="sm" type="button">
                          {verificationDocs.idDocument ? 'Change' : 'Upload'}
                        </Button>
                      </div>
                    </div>
                    {verificationDocs.idDocument && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ {verificationDocs.idDocument.name}
                      </p>
                    )}
                  </div>

                  <div className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Proof of Address</p>
                        <p className="text-xs text-gray-500">Utility bill or bank statement (last 3 months)</p>
                      </div>
                      <div className="relative">
                        <Input
                          type="file"
                          accept="image/*,.pdf"
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          onChange={(e) => handleFileChange(e, 'proofOfAddress')}
                        />
                        <Button variant="outline" size="sm" type="button">
                          {verificationDocs.proofOfAddress ? 'Change' : 'Upload'}
                        </Button>
                      </div>
                    </div>
                    {verificationDocs.proofOfAddress && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ {verificationDocs.proofOfAddress.name}
                      </p>
                    )}
                  </div>

                  <div className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Business License</p>
                        <p className="text-xs text-gray-500">Optional - For property management companies</p>
                      </div>
                      <div className="relative">
                        <Input
                          type="file"
                          accept="image/*,.pdf"
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          onChange={(e) => handleFileChange(e, 'businessLicense')}
                        />
                        <Button variant="outline" size="sm" type="button">
                          {verificationDocs.businessLicense ? 'Change' : 'Upload'}
                        </Button>
                      </div>
                    </div>
                    {verificationDocs.businessLicense && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ {verificationDocs.businessLicense.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {isLandlordRejected && (
                <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Your previous verification was rejected. Please submit new or updated documents.
                  </p>
                </div>
              )}

              <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  🔒 Your documents are securely stored and only used for verification purposes.
                  We'll notify you via email once your account is verified.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVerificationDialog(false)}>
              {isLandlordPending ? 'Close' : 'Cancel'}
            </Button>
            {!isLandlordPending && (
              <Button
                onClick={handleSubmitVerification}
                disabled={!verificationDocs.idDocument || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit for Review'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Spacer for fixed header */}
      <div className="h-16" />
    </>
  );
}

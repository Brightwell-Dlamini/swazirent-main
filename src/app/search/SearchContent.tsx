// src/app/search/SearchContent.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, memo, useTransition } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetTitle, SheetClose } from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Search, X, Bookmark, Clock, Loader2, Filter, Home, Map, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { Property, AssetCategory, ASSET_CATEGORY_LABELS, inferAssetCategory } from '@/types/property';
import { mapPropertyRow } from '@/lib/mapProperty';
import { ESWATINI_CITIES, RESIDENTIAL_AMENITIES } from '@/utils/constants';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';

interface Filters {
  city: string;
  keyword: string;
  minPrice: number;
  maxPrice: number;
  bedrooms: string;
  assetCategory: AssetCategory | 'any';
  amenities: string[];
  fitted: boolean;
  listingIntent: 'any' | 'sale' | 'long_rent';
}

interface SavedSearch {
  name: string;
  filters: Filters;
  createdAt: number;
}

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'popular';
type ViewMode = 'grid' | 'list';

const ITEMS_PER_PAGE = 12;
const MAX_PRICE = 500000; // covers sale prices too

const sanitizeInput = (input: string) => input.replace(/[<>]/g, '').trim().slice(0, 100);

const CATEGORY_CHIPS: { value: AssetCategory | 'any'; label: string; icon: typeof Home }[] = [
  { value: 'any', label: 'All', icon: Search },
  { value: 'residential', label: 'Residential', icon: Home },
  { value: 'land', label: 'Land', icon: Map },
  { value: 'commercial', label: 'Commercial', icon: Building2 },
];

const FilterContent = memo(function FilterContent({
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}: {
  filters: Filters;
  onFilterChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}) {
  const priceRange = useMemo(() => [filters.minPrice, filters.maxPrice], [filters.minPrice, filters.maxPrice]);
  const showBeds = filters.assetCategory === 'any' || filters.assetCategory === 'residential';

  return (
    <div className="space-y-6 pb-6">
      <div>
        <Label className="text-base font-semibold">Price range (E)</Label>
        <div className="mt-2 px-2">
          <Slider
            value={priceRange}
            min={0}
            max={MAX_PRICE}
            step={500}
            onValueChange={([min, max]) => {
              onFilterChange('minPrice', min);
              onFilterChange('maxPrice', max);
            }}
          />
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>E{filters.minPrice.toLocaleString()}</span>
            <span>E{filters.maxPrice.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-base font-semibold">For sale / rent</Label>
        <Select value={filters.listingIntent} onValueChange={(v) => onFilterChange('listingIntent', v as Filters['listingIntent'])}>
          <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="sale">For sale</SelectItem>
            <SelectItem value="long_rent">Long-term rent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-base font-semibold">City / town</Label>
        <Select value={filters.city} onValueChange={(v) => onFilterChange('city', v)}>
          <SelectTrigger className="mt-2"><SelectValue placeholder="Any city" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any city</SelectItem>
            {ESWATINI_CITIES.map((city) => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showBeds && (
        <div>
          <Label className="text-base font-semibold">Bedrooms</Label>
          <Select value={filters.bedrooms} onValueChange={(v) => onFilterChange('bedrooms', v)}>
            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="1">1+</SelectItem>
              <SelectItem value="2">2+</SelectItem>
              <SelectItem value="3">3+</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {showBeds && (
        <div className="flex items-center space-x-2">
          <Checkbox id="furnished" checked={filters.fitted}
            onCheckedChange={(c) => onFilterChange('fitted', c === true)} />
          <Label htmlFor="furnished">Furnished only</Label>
        </div>
      )}

      {showBeds && (
        <div>
          <Label className="text-base font-semibold">Amenities</Label>
          <ScrollArea className="h-40 mt-2">
            <div className="space-y-2 pr-4">
              {RESIDENTIAL_AMENITIES.map((amenity) => (
                <div key={amenity} className="flex items-center space-x-2">
                  <Checkbox
                    id={`a-${amenity}`}
                    checked={filters.amenities.includes(amenity)}
                    onCheckedChange={(checked) => {
                      if (checked) onFilterChange('amenities', [...filters.amenities, amenity]);
                      else onFilterChange('amenities', filters.amenities.filter((a) => a !== amenity));
                    }}
                  />
                  <Label htmlFor={`a-${amenity}`} className="text-sm">{amenity}</Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {hasActiveFilters && (
        <Button variant="outline" onClick={onClearFilters} className="w-full">
          <X className="h-4 w-4 mr-2" /> Clear all filters
        </Button>
      )}
    </div>
  );
});

const SkeletonGrid = memo(function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
});

export default function SearchContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [paginationMode, setPaginationMode] = useState<'pagination' | 'load-more'>('pagination');
  const [isPending, startTransition] = useTransition();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [isSaveSearchDialogOpen, setIsSaveSearchDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState('');

  const [filters, setFilters] = useState<Filters>(() => ({
    city: searchParams.get('city') || 'any',
    keyword: searchParams.get('q') || '',
    minPrice: Number(searchParams.get('minPrice')) || 0,
    maxPrice: Number(searchParams.get('maxPrice')) || MAX_PRICE,
    bedrooms: searchParams.get('bedrooms') || 'any',
    assetCategory: (searchParams.get('category') as AssetCategory) || 'any',
    amenities: searchParams.getAll('amenities') || [],
    fitted: searchParams.get('furnished') === 'true',
    listingIntent: (searchParams.get('intent') as Filters['listingIntent']) || 'any',
  }));

  const [searchInput, setSearchInput] = useState(filters.keyword);
  const [debouncedSearch] = useDebounce(searchInput, 300);

  useEffect(() => {
    if (debouncedSearch !== filters.keyword) {
      setFilters((p) => ({ ...p, keyword: sanitizeInput(debouncedSearch) }));
      setPage(1);
    }
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      const recent = localStorage.getItem('recentSearches');
      if (recent) setRecentSearches(JSON.parse(recent));
      const saved = localStorage.getItem('savedSearches');
      if (saved) setSavedSearches(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('properties')
          .select(`*, landlord:profiles!properties_landlord_id_fkey (full_name, phone, is_verified), photos:property_photos (id, photo_url, caption, display_order, created_at)`)
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (!mounted) return;
        setAllProperties((data || []).map(mapPropertyRow));
      } catch (e) {
        console.error(e);
        toast.error('Failed to load listings');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (loading) return;
    startTransition(() => {
      const params = new URLSearchParams();
      if (filters.city !== 'any') params.set('city', filters.city);
      if (filters.keyword) params.set('q', filters.keyword);
      if (filters.minPrice > 0) params.set('minPrice', String(filters.minPrice));
      if (filters.maxPrice < MAX_PRICE) params.set('maxPrice', String(filters.maxPrice));
      if (filters.bedrooms !== 'any') params.set('bedrooms', filters.bedrooms);
      if (filters.assetCategory !== 'any') params.set('category', filters.assetCategory);
      if (filters.listingIntent !== 'any') params.set('intent', filters.listingIntent);
      if (filters.fitted) params.set('furnished', 'true');
      filters.amenities.forEach((a) => params.append('amenities', a));
      if (sortBy !== 'newest') params.set('sort', sortBy);
      if (page > 1) params.set('page', String(page));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }, [filters, sortBy, page, pathname, router, loading]);

  const filteredAndSorted = useMemo(() => {
    let list = [...allProperties];

    if (filters.assetCategory !== 'any') {
      list = list.filter((p) => inferAssetCategory(p) === filters.assetCategory);
    }
    if (filters.listingIntent !== 'any') {
      list = list.filter((p) => {
        const intent = p.listing_intent
          || (p.listing_type === 'buy' || p.price_period === 'once' ? 'sale' : 'long_rent');
        return intent === filters.listingIntent;
      });
    }
    if (filters.city !== 'any') {
      list = list.filter((p) => p.location_city?.toLowerCase() === filters.city.toLowerCase());
    }
    if (filters.keyword) {
      const k = filters.keyword.toLowerCase();
      list = list.filter(
        (p) =>
          p.title?.toLowerCase().includes(k) ||
          p.description?.toLowerCase().includes(k) ||
          p.location_city?.toLowerCase().includes(k) ||
          p.location_suburb?.toLowerCase().includes(k)
      );
    }
    if (filters.minPrice > 0) list = list.filter((p) => p.price >= filters.minPrice);
    if (filters.maxPrice < MAX_PRICE) list = list.filter((p) => p.price <= filters.maxPrice);
    if (filters.bedrooms !== 'any' && (filters.assetCategory === 'any' || filters.assetCategory === 'residential')) {
      const minB = parseInt(filters.bedrooms, 10);
      list = list.filter((p) => (p.bedrooms || 0) >= minB);
    }
    if (filters.amenities.length) {
      list = list.filter((p) => filters.amenities.every((a) => p.amenities?.includes(a)));
    }
    if (filters.fitted) list = list.filter((p) => p.is_furnished);

    switch (sortBy) {
      case 'price_asc':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'popular':
        list.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      default:
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [allProperties, filters, sortBy]);

  const paginated = useMemo(() => {
    const end = page * ITEMS_PER_PAGE;
    return filteredAndSorted.slice(0, end);
  }, [filteredAndSorted, page]);

  const totalPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE) || 1;
  const hasMore = paginated.length < filteredAndSorted.length;

  const hasActiveFilters =
    filters.city !== 'any' ||
    !!filters.keyword ||
    filters.minPrice > 0 ||
    filters.maxPrice < MAX_PRICE ||
    filters.bedrooms !== 'any' ||
    filters.assetCategory !== 'any' ||
    filters.listingIntent !== 'any' ||
    filters.amenities.length > 0 ||
    filters.fitted;

  const handleFilterChange = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      city: 'any',
      keyword: '',
      minPrice: 0,
      maxPrice: MAX_PRICE,
      bedrooms: 'any',
      assetCategory: 'any',
      amenities: [],
      fitted: false,
      listingIntent: 'any',
    });
    setSearchInput('');
    setPage(1);
    setIsFilterOpen(false);
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-4">Find property in Eswatini</h1>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORY_CHIPS.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={filters.assetCategory === value ? 'default' : 'outline'}
            onClick={() => handleFilterChange('assetCategory', value)}
            className="gap-1.5"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            className="pl-10 h-12"
            placeholder="Search by keyword, city, suburb…"
            value={searchInput}
            onChange={(e) => setSearchInput(sanitizeInput(e.target.value))}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
          />
          {isSearchFocused && recentSearches.length > 0 && !searchInput && (
            <div className="absolute z-10 mt-1 w-full bg-background border rounded-md shadow-lg p-2">
              <p className="text-xs text-muted-foreground mb-1">Recent</p>
              {recentSearches.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="flex items-center w-full px-2 py-1 text-sm hover:bg-muted rounded"
                  onClick={() => {
                    setSearchInput(s);
                    handleFilterChange('keyword', s);
                  }}
                >
                  <Clock className="h-3 w-3 mr-2" />{s}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button variant="outline" className="lg:hidden" onClick={() => setIsFilterOpen(true)}>
          <Filter className="h-4 w-4 mr-2" />Filters
        </Button>
        <Button variant="outline" className="hidden sm:flex" disabled={!hasActiveFilters}
          onClick={() => setIsSaveSearchDialogOpen(true)}>
          <Bookmark className="h-4 w-4 mr-2" />Save
        </Button>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.assetCategory !== 'any' && (
            <Badge variant="secondary" className="gap-1">
              {ASSET_CATEGORY_LABELS[filters.assetCategory]}
              <button type="button" onClick={() => handleFilterChange('assetCategory', 'any')}>×</button>
            </Badge>
          )}
          {filters.listingIntent !== 'any' && (
            <Badge variant="secondary" className="gap-1">
              {filters.listingIntent === 'sale' ? 'For sale' : 'Rent'}
              <button type="button" onClick={() => handleFilterChange('listingIntent', 'any')}>×</button>
            </Badge>
          )}
          {filters.city !== 'any' && (
            <Badge variant="secondary" className="gap-1">
              {filters.city}
              <button type="button" onClick={() => handleFilterChange('city', 'any')}>×</button>
            </Badge>
          )}
          {filters.keyword && (
            <Badge variant="secondary" className="gap-1">
              “{filters.keyword}”
              <button type="button" onClick={() => { handleFilterChange('keyword', ''); setSearchInput(''); }}>×</button>
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters}>Clear all</Button>
        </div>
      )}

      <div className="flex gap-8">
        <div className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-24">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Filters</h2>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>
              )}
            </div>
            <FilterContent filters={filters} onFilterChange={handleFilterChange}
              onClearFilters={clearFilters} hasActiveFilters={hasActiveFilters} />
          </div>
        </div>

        <div className="flex-1">
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
            <p className="text-muted-foreground">
              {loading ? 'Loading…' : (
                <><span className="font-semibold text-foreground">{filteredAndSorted.length}</span> listing{filteredAndSorted.length !== 1 ? 's' : ''}</>
              )}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex border rounded-lg overflow-hidden">
                <button type="button" onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 text-sm ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>Grid</button>
                <button type="button" onClick={() => setViewMode('list')}
                  className={`px-3 py-1 text-sm ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>List</button>
              </div>
              <Select value={sortBy} onValueChange={(v: SortOption) => { setSortBy(v); setPage(1); }}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price_asc">Price ↑</SelectItem>
                  <SelectItem value="price_desc">Price ↓</SelectItem>
                  <SelectItem value="popular">Popular</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <SkeletonGrid />
          ) : filteredAndSorted.length === 0 ? (
            <div className="text-center py-16">
              <Search className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold text-lg mb-1">No listings found</h3>
              <p className="text-muted-foreground mb-4">Try another category or clear filters</p>
              {hasActiveFilters && <Button variant="outline" onClick={clearFilters}>Clear filters</Button>}
            </div>
          ) : (
            <>
              <div className={`grid gap-6 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                <AnimatePresence mode="popLayout">
                  {paginated.map((p) => (
                    <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      <PropertyCard property={p} viewMode={viewMode} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              {paginationMode === 'pagination' && totalPages > 1 && (
                <div className="mt-8 flex justify-center gap-4 items-center">
                  <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                  <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              )}
              {paginationMode === 'load-more' && hasMore && (
                <div className="mt-8 flex justify-center">
                  <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={isPending}>
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load more'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <SheetContent side="left" className="w-full sm:max-w-md p-0">
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center p-4 border-b">
              <SheetTitle>Filters</SheetTitle>
              <SheetClose asChild><Button variant="ghost" size="icon"><X className="h-4 w-4" /></Button></SheetClose>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <FilterContent filters={filters} onFilterChange={handleFilterChange}
                onClearFilters={clearFilters} hasActiveFilters={hasActiveFilters} />
            </div>
            <div className="p-4 border-t">
              <Button className="w-full" onClick={() => setIsFilterOpen(false)}>Apply</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={isSaveSearchDialogOpen} onOpenChange={setIsSaveSearchDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save search</DialogTitle></DialogHeader>
          <Input placeholder="e.g. Mbabane land under E200k" value={searchName}
            onChange={(e) => setSearchName(sanitizeInput(e.target.value))} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveSearchDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={!searchName.trim()}
              onClick={() => {
                const next = [{ name: searchName.trim(), filters: { ...filters }, createdAt: Date.now() }, ...savedSearches].slice(0, 10);
                setSavedSearches(next);
                localStorage.setItem('savedSearches', JSON.stringify(next));
                setIsSaveSearchDialogOpen(false);
                setSearchName('');
                toast.success('Search saved');
              }}
            >Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

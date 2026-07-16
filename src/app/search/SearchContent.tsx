// src/app/search/SearchContent.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Search, SlidersHorizontal, X, Bookmark, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { Property, PropertyType } from '@/types/property';

// Define types
interface Filters {
  city: string;
  keyword: string;
  minPrice: number;
  maxPrice: number;
  bedrooms: string;
  propertyType: PropertyType[];
  amenities: string[];
  furnished: boolean;
}

interface SavedSearch {
  name: string;
  filters: Filters;
  createdAt: number;
}

type SortOption = 'newest' | 'price_asc' | 'price_desc';
type PaginationMode = 'pagination' | 'load-more';

// Eswatini cities - will be fetched from database
const ESWATINI_CITIES = [
  'Mbabane', 'Manzini', 'Ezulwini', 'Lobamba', 'Nhlangano',
  'Piggs Peak', 'Siteki', 'Big Bend', 'Matsapha', 'Kwaluseni',
  'Hlatikulu', 'Mhlume', 'Simunye'
];

// Eswatini-specific amenities
const ESWATINI_AMENITIES = [
  'Parking', 'Backup Water', 'Security', 'Garden', 'Furnished',
  'Built-in Wardrobes', 'Pet Friendly', 'Electric Fence', '24hr Security',
  'Swimming Pool', 'Staff Quarters', 'Solar Power'
];

const PROPERTY_TYPES: PropertyType[] = ['house', 'apartment', 'townhouse', 'backrooms', 'other'];

const FILTER_PRESETS = [
  { name: 'Under E2000', filters: { maxPrice: 2000 } },
  { name: '2+ Bedrooms', filters: { bedrooms: '2' } },
  { name: 'Furnished', filters: { furnished: true } },
  { name: 'With Parking', filters: { amenities: ['Parking'] } },
];

interface FilterContentProps {
  filters: Filters;
  onFilterChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

const FilterContent = memo(
  ({
    filters,
    onFilterChange,
    onClearFilters,
    hasActiveFilters,
  }: FilterContentProps) => (
    <div className="space-y-6">
      {/* Price Range */}
      <div>
        <Label className="text-base font-semibold">Price Range (E/month)</Label>
        <div className="mt-2 px-2">
          <Slider
            value={[filters.minPrice, filters.maxPrice]}
            min={0}
            max={10000}
            step={500}
            onValueChange={([min, max]) => {
              onFilterChange('minPrice', min);
              onFilterChange('maxPrice', max);
            }}
            aria-label="Price range slider"
          />
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>E{filters.minPrice}</span>
            <span>E{filters.maxPrice}</span>
          </div>
        </div>
      </div>

      {/* City Selection */}
      <div>
        <Label className="text-base font-semibold" htmlFor="city-select">
          City/Town
        </Label>
        <Select
          value={filters.city}
          onValueChange={(value) => onFilterChange('city', value)}
        >
          <SelectTrigger id="city-select" className="mt-2">
            <SelectValue placeholder="Any city" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any city</SelectItem>
            {ESWATINI_CITIES.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bedrooms */}
      <div>
        <Label className="text-base font-semibold" htmlFor="bedrooms-select">
          Bedrooms
        </Label>
        <Select
          value={filters.bedrooms}
          onValueChange={(value) => onFilterChange('bedrooms', value)}
        >
          <SelectTrigger id="bedrooms-select" className="mt-2">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="1">1+</SelectItem>
            <SelectItem value="2">2+</SelectItem>
            <SelectItem value="3">3+</SelectItem>
            <SelectItem value="4">4+</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Property Type */}
      <div>
        <Label className="text-base font-semibold">Property Type</Label>
        <div className="mt-2 space-y-2">
          {PROPERTY_TYPES.map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={`type-${type}`}
                checked={filters.propertyType.includes(type)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onFilterChange('propertyType', [
                      ...filters.propertyType,
                      type,
                    ]);
                  } else {
                    onFilterChange(
                      'propertyType',
                      filters.propertyType.filter((t) => t !== type),
                    );
                  }
                }}
              />
              <Label htmlFor={`type-${type}`} className="capitalize">
                {type}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Amenities */}
      <div>
        <Label className="text-base font-semibold">Amenities</Label>
        <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
          {ESWATINI_AMENITIES.map((amenity) => (
            <div key={amenity} className="flex items-center space-x-2">
              <Checkbox
                id={`amenity-${amenity}`}
                checked={filters.amenities.includes(amenity)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onFilterChange('amenities', [
                      ...filters.amenities,
                      amenity,
                    ]);
                  } else {
                    onFilterChange(
                      'amenities',
                      filters.amenities.filter((a) => a !== amenity),
                    );
                  }
                }}
              />
              <Label htmlFor={`amenity-${amenity}`}>{amenity}</Label>
            </div>
          ))}
        </div>
      </div>

      {/* Furnished */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="furnished"
          checked={filters.furnished}
          onCheckedChange={(checked) =>
            onFilterChange('furnished', checked === true)
          }
        />
        <Label htmlFor="furnished">Furnished Only</Label>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button variant="outline" onClick={onClearFilters} className="w-full">
          <X className="h-4 w-4 mr-2" />
          Clear All Filters
        </Button>
      )}
    </div>
  ),
);

FilterContent.displayName = 'FilterContent';

export default function SearchContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isInitialMount = useRef(true);
  const isUpdatingFromURL = useRef(false);
  const isInternalUpdate = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [paginationMode, setPaginationMode] = useState<PaginationMode>('pagination');
  const [filters, setFilters] = useState<Filters>(() => ({
    city: searchParams.get('city') || '',
    keyword: searchParams.get('q') || '',
    minPrice: Number(searchParams.get('minPrice')) || 0,
    maxPrice: Number(searchParams.get('maxPrice')) || 10000,
    bedrooms: searchParams.get('bedrooms') || 'any',
    propertyType: (searchParams.getAll('propertyType') as PropertyType[]) || [],
    amenities: searchParams.getAll('amenities') || [],
    furnished: searchParams.get('furnished') === 'true',
  }));
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [searchInput, setSearchInput] = useState(filters.keyword);
  const [debouncedSearchTerm] = useDebounce(searchInput, 300);

  // Recent searches
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Saved searches
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [isSaveSearchDialogOpen, setIsSaveSearchDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState('');

  // Load recent searches and saved searches from localStorage on mount
  useEffect(() => {
    const recent = localStorage.getItem('recentSearches');
    if (recent) {
      setRecentSearches(JSON.parse(recent));
    }

    const saved = localStorage.getItem('savedSearches');
    if (saved) {
      setSavedSearches(JSON.parse(saved));
    }
  }, []);

  // Save search when user performs a search
  useEffect(() => {
    if (filters.keyword && filters.keyword.length > 2) {
      setRecentSearches((prev) => {
        const updated = [
          filters.keyword,
          ...prev.filter((s) => s !== filters.keyword),
        ].slice(0, 5);
        localStorage.setItem('recentSearches', JSON.stringify(updated));
        return updated;
      });
    }
  }, [filters.keyword]);

  // Handle popstate event for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      isUpdatingFromURL.current = true;
      // Use setTimeout to ensure the state update happens after the URL change
      setTimeout(() => {
        const params = new URLSearchParams(window.location.search);
        setFilters({
          city: params.get('city') || '',
          keyword: params.get('q') || '',
          minPrice: Number(params.get('minPrice')) || 0,
          maxPrice: Number(params.get('maxPrice')) || 10000,
          bedrooms: params.get('bedrooms') || 'any',
          propertyType: (params.getAll('propertyType') as PropertyType[]) || [],
          amenities: params.getAll('amenities') || [],
          furnished: params.get('furnished') === 'true',
        });
        setSortBy((params.get('sort') as SortOption) || 'newest');
        setPage(Number(params.get('page')) || 1);
        setSearchInput(params.get('q') || '');
        // Set flag after state updates are processed
        setTimeout(() => {
          isUpdatingFromURL.current = false;
        }, 0);
      }, 0);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync initial URL params
  useEffect(() => {
    isUpdatingFromURL.current = true;
    setFilters({
      city: searchParams.get('city') || '',
      keyword: searchParams.get('q') || '',
      minPrice: Number(searchParams.get('minPrice')) || 0,
      maxPrice: Number(searchParams.get('maxPrice')) || 10000,
      bedrooms: searchParams.get('bedrooms') || 'any',
      propertyType: (searchParams.getAll('propertyType') as PropertyType[]) || [],
      amenities: searchParams.getAll('amenities') || [],
      furnished: searchParams.get('furnished') === 'true',
    });
    setSortBy((searchParams.get('sort') as SortOption) || 'newest');
    setPage(Number(searchParams.get('page')) || 1);
    setSearchInput(searchParams.get('q') || '');
    setTimeout(() => {
      isUpdatingFromURL.current = false;
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update keyword filter when debounced search term changes
  useEffect(() => {
    if (!isUpdatingFromURL.current) {
      handleFilterChange('keyword', debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

  const updateSearchParams = useCallback(
    (newFilters: Filters) => {
      if (isUpdatingFromURL.current || isInternalUpdate.current) return;

      const params = new URLSearchParams();

      if (newFilters.city) params.set('city', newFilters.city);
      if (newFilters.keyword) params.set('q', newFilters.keyword);
      if (newFilters.minPrice > 0) params.set('minPrice', newFilters.minPrice.toString());
      if (newFilters.maxPrice < 10000) params.set('maxPrice', newFilters.maxPrice.toString());
      if (newFilters.bedrooms !== 'any') params.set('bedrooms', newFilters.bedrooms);
      if (newFilters.furnished) params.set('furnished', 'true');

      if (sortBy !== 'newest') params.set('sort', sortBy);
      if (page > 1) params.set('page', page.toString());

      newFilters.propertyType.forEach((type) => params.append('propertyType', type));
      newFilters.amenities.forEach((amenity) => params.append('amenities', amenity));

      const newUrl = `${pathname}?${params.toString()}`;
      const currentSearch = window.location.search;

      // Only update if the URL actually changed
      if (currentSearch !== params.toString()) {
        isInternalUpdate.current = true;
        // Use replace instead of push to avoid polluting history
        router.replace(newUrl, { scroll: false });
        setTimeout(() => {
          isInternalUpdate.current = false;
        }, 100);
      }
    },
    [pathname, router, sortBy, page],
  );

  // Update URL when filters, sort, or page change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (isUpdatingFromURL.current || isInternalUpdate.current) return;

    updateSearchParams(filters);
  }, [filters, sortBy, page, updateSearchParams]);

  // Cancel ongoing requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchProperties = useCallback(async (abortSignal?: AbortSignal) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = abortSignal || controller.signal;

    setLoading(true);

    try {
      let query = supabase
        .from('properties')
        .select(`
          *,
          landlord:profiles!properties_landlord_id_fkey (
            full_name,
            phone,
            is_verified
          ),
          photos:property_photos (
            id,
            photo_url,
            caption,
            display_order
          )
        `, { count: 'exact', head: false });

      // Apply filters
      if (filters.city) {
        query = query.eq('location_city', filters.city);
      }

      if (filters.keyword) {
        query = query.or(`title.ilike.%${filters.keyword}%,description.ilike.%${filters.keyword}%`);
      }

      if (filters.minPrice > 0) {
        query = query.gte('price', filters.minPrice);
      }

      if (filters.maxPrice < 10000) {
        query = query.lte('price', filters.maxPrice);
      }

      if (filters.bedrooms !== 'any') {
        const minBedrooms = parseInt(filters.bedrooms);
        query = query.gte('bedrooms', minBedrooms);
      }

      if (filters.propertyType.length > 0) {
        query = query.in('property_type', filters.propertyType);
      }

      if (filters.amenities.length > 0) {
        query = query.contains('amenities', filters.amenities);
      }

      if (filters.furnished) {
        query = query.eq('is_furnished', true);
      }

      // Always only show active properties for public search
      query = query.eq('status', 'active');

      // Apply sorting
      switch (sortBy) {
        case 'price_asc':
          query = query.order('price', { ascending: true });
          break;
        case 'price_desc':
          query = query.order('price', { ascending: false });
          break;
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      if (paginationMode === 'pagination') {
        const start = (page - 1) * 12;
        const end = start + 11;
        query = query.range(start, end);
      } else {
        // Load more: get all up to page * 12
        const end = page * 12 - 1;
        query = query.range(0, end);
      }

      // Add abort signal support via .abort() method
      // Supabase doesn't directly support abort signals, but we can check the signal
      // and throw if aborted before the request completes
      const { data, error, count } = await query;

      // Check if the operation was aborted
      if (signal.aborted) {
        console.log('Request was aborted, ignoring results');
        return;
      }

      if (error) throw error;

      // Transform data to match Property type
      const transformedData: Property[] = (data || []).map((item: any) => ({
        ...item,
        landlord: item.landlord || undefined,
        photos: item.photos || [],
      }));

      // Only update state if not aborted
      if (!signal.aborted) {
        setProperties(transformedData);
        setTotalCount(count || 0);
      }
    } catch (error) {
      // Don't update state on abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      console.error('Error fetching properties:', error);
      if (!signal.aborted) {
        setProperties([]);
        setTotalCount(0);
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
      // Clean up controller
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [filters, page, sortBy, paginationMode]);

  // Fetch properties with request deduplication
  useEffect(() => {
    // Track the current fetch promise to avoid duplicate requests
    let isFetching = false;
    
    const doFetch = async () => {
      if (isFetching) return;
      isFetching = true;
      
      try {
        await fetchProperties();
      } finally {
        isFetching = false;
      }
    };
    
    doFetch();
    
    // Cleanup: cancel request on unmount or when dependencies change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [fetchProperties]);

  const handleFilterChange = useCallback(<K extends keyof Filters>(
    key: K,
    value: Filters[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      city: '',
      keyword: '',
      minPrice: 0,
      maxPrice: 10000,
      bedrooms: 'any',
      propertyType: [],
      amenities: [],
      furnished: false,
    });
    setSearchInput('');
    setPage(1);
    setIsFilterOpen(false);
  }, []);

  const loadMore = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  const saveCurrentSearch = useCallback(() => {
    if (!searchName.trim()) return;

    const newSavedSearch: SavedSearch = {
      name: searchName,
      filters: { ...filters },
      createdAt: Date.now(),
    };

    const updatedSearches = [newSavedSearch, ...savedSearches].slice(0, 10);
    setSavedSearches(updatedSearches);
    localStorage.setItem('savedSearches', JSON.stringify(updatedSearches));
    setIsSaveSearchDialogOpen(false);
    setSearchName('');
  }, [searchName, filters, savedSearches]);

  const loadSavedSearch = useCallback((saved: SavedSearch) => {
    setFilters(saved.filters);
    setSearchInput(saved.filters.keyword);
    setPage(1);
  }, []);

  const deleteSavedSearch = useCallback((index: number) => {
    const updated = savedSearches.filter((_, i) => i !== index);
    setSavedSearches(updated);
    localStorage.setItem('savedSearches', JSON.stringify(updated));
  }, [savedSearches]);

  const applyPreset = useCallback((preset: typeof FILTER_PRESETS[number]) => {
    setFilters((prev) => ({
      ...prev,
      ...preset.filters,
      amenities: preset.filters.amenities ? [...preset.filters.amenities] : prev.amenities,
    }));
    setPage(1);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.city !== '' ||
      filters.keyword !== '' ||
      filters.minPrice > 0 ||
      filters.maxPrice < 10000 ||
      filters.bedrooms !== 'any' ||
      filters.propertyType.length > 0 ||
      filters.amenities.length > 0 ||
      filters.furnished
    );
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.city) count++;
    if (filters.keyword) count++;
    if (filters.minPrice > 0 || filters.maxPrice < 10000) count++;
    if (filters.bedrooms !== 'any') count++;
    count += filters.propertyType.length;
    count += filters.amenities.length;
    if (filters.furnished) count++;
    return count;
  }, [filters]);

  const totalPages = Math.ceil(totalCount / 12);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">
          Find Your Perfect Home in Eswatini
        </h1>

        {/* Filter Presets */}
        <div className="mb-4 flex flex-wrap gap-2">
          {FILTER_PRESETS.map((preset) => (
            <Button
              key={preset.name}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset)}
            >
              {preset.name}
            </Button>
          ))}
        </div>

        {/* Search Bar and Actions */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search by keyword, city, or property name..."
              className="pl-10"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                setTimeout(() => setIsSearchFocused(false), 200);
              }}
              aria-label="Search properties"
            />

            {/* Recent Searches Dropdown */}
            {isSearchFocused &&
              recentSearches.length > 0 &&
              !filters.keyword &&
              searchInput.length === 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg">
                  <div className="p-2">
                    <p className="text-xs text-gray-500 mb-1">Recent searches:</p>
                    {recentSearches.map((search) => (
                      <button
                        key={search}
                        className="flex items-center w-full px-2 py-1 text-sm hover:bg-gray-100 rounded"
                        onClick={() => {
                          setSearchInput(search);
                          handleFilterChange('keyword', search);
                          setIsSearchFocused(false);
                        }}
                      >
                        <Clock className="h-3 w-3 mr-2 text-gray-400" />
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* Save Search Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSaveSearchDialogOpen(true)}
            disabled={!hasActiveFilters}
            className="hidden sm:flex"
            aria-label="Save current search"
          >
            <Bookmark className="h-4 w-4 mr-2" />
            Save Search
          </Button>

          {/* Mobile Filter Button */}
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="lg:hidden"
                aria-label="Open filters"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 h-5 w-5 p-0 flex items-center justify-center"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-75 sm:w-100 overflow-y-auto">
              <SheetTitle className="sr-only">Filter Properties</SheetTitle>
              <div className="py-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Filters</h2>
                  <SheetClose asChild>
                    <Button variant="ghost" size="sm" aria-label="Close filters">
                      <X className="h-4 w-4" />
                    </Button>
                  </SheetClose>
                </div>
                <FilterContent
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onClearFilters={clearFilters}
                  hasActiveFilters={hasActiveFilters}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Saved Searches */}
        {savedSearches.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-2">Saved searches:</p>
            <div className="flex flex-wrap gap-2">
              {savedSearches.map((saved, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-gray-100 group"
                >
                  <button
                    onClick={() => loadSavedSearch(saved)}
                    className="flex items-center"
                  >
                    <Bookmark className="h-3 w-3 mr-1" />
                    {saved.name}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSavedSearch(index);
                    }}
                    className="ml-2 opacity-0 group-hover:opacity-100 hover:text-red-500"
                    aria-label={`Delete saved search: ${saved.name}`}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.city && (
              <Badge variant="secondary" className="px-3 py-1">
                City: {filters.city}
                <button
                  className="ml-2 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 rounded-full"
                  onClick={() => handleFilterChange('city', '')}
                  aria-label={`Remove city filter: ${filters.city}`}
                >
                  ×
                </button>
              </Badge>
            )}
            {filters.keyword && (
              <Badge variant="secondary" className="px-3 py-1">
                Search: {filters.keyword}
                <button
                  className="ml-2 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 rounded-full"
                  onClick={() => {
                    handleFilterChange('keyword', '');
                    setSearchInput('');
                  }}
                  aria-label="Remove search filter"
                >
                  ×
                </button>
              </Badge>
            )}
            {(filters.minPrice > 0 || filters.maxPrice < 10000) && (
              <Badge variant="secondary" className="px-3 py-1">
                E{filters.minPrice} - E{filters.maxPrice}
                <button
                  className="ml-2 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 rounded-full"
                  onClick={() => {
                    handleFilterChange('minPrice', 0);
                    handleFilterChange('maxPrice', 10000);
                  }}
                  aria-label="Remove price range filter"
                >
                  ×
                </button>
              </Badge>
            )}
            {filters.bedrooms !== 'any' && (
              <Badge variant="secondary" className="px-3 py-1">
                {filters.bedrooms}+ beds
                <button
                  className="ml-2 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 rounded-full"
                  onClick={() => handleFilterChange('bedrooms', 'any')}
                  aria-label="Remove bedrooms filter"
                >
                  ×
                </button>
              </Badge>
            )}
            {filters.propertyType.map((type) => (
              <Badge key={type} variant="secondary" className="px-3 py-1 capitalize">
                {type}
                <button
                  className="ml-2 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 rounded-full"
                  onClick={() =>
                    handleFilterChange(
                      'propertyType',
                      filters.propertyType.filter((t) => t !== type),
                    )
                  }
                  aria-label={`Remove ${type} property type filter`}
                >
                  ×
                </button>
              </Badge>
            ))}
            {filters.amenities.map((amenity) => (
              <Badge key={amenity} variant="secondary" className="px-3 py-1">
                {amenity}
                <button
                  className="ml-2 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 rounded-full"
                  onClick={() =>
                    handleFilterChange(
                      'amenities',
                      filters.amenities.filter((a) => a !== amenity),
                    )
                  }
                  aria-label={`Remove ${amenity} amenity filter`}
                >
                  ×
                </button>
              </Badge>
            ))}
            {filters.furnished && (
              <Badge variant="secondary" className="px-3 py-1">
                Furnished
                <button
                  className="ml-2 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 rounded-full"
                  onClick={() => handleFilterChange('furnished', false)}
                  aria-label="Remove furnished filter"
                >
                  ×
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-8">
        {/* Desktop Filters Sidebar */}
        <div className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24">
            <h2 className="text-lg font-semibold mb-4">Filters</h2>
            <FilterContent
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1">
          {/* Results Count & Sort */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <p className="text-gray-600" aria-live="polite" aria-atomic="true">
              {loading
                ? 'Loading...'
                : `${totalCount} property${totalCount !== 1 ? 's' : ''} found in Eswatini`}
            </p>
            <div className="flex items-center gap-4">
              {/* Pagination Mode Selector */}
              <Select
                value={paginationMode}
                onValueChange={(value: PaginationMode) => {
                  setPaginationMode(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-32" aria-label="View mode">
                  <SelectValue placeholder="View mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pagination">Pages</SelectItem>
                  <SelectItem value="load-more">Load More</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort Selector */}
              <Select
                value={sortBy}
                onValueChange={(value: SortOption) => setSortBy(value)}
              >
                <SelectTrigger className="w-45" aria-label="Sort properties">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Property Grid */}
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse" aria-label="Loading property card">
                  <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-12" role="status">
              <h3 className="text-lg font-semibold mb-2">No properties found</h3>
              <p className="text-gray-600">
                Try adjusting your filters or search criteria
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  Clear All Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>

              {/* Pagination / Load More */}
              {totalPages > 1 && (
                <div className="mt-8 flex justify-center items-center gap-4">
                  {paginationMode === 'pagination' ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        aria-label="Previous page"
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-600" aria-live="polite">
                        Page {page} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page >= totalPages}
                        aria-label="Next page"
                      >
                        Next
                      </Button>
                    </>
                  ) : (
                    page < totalPages && (
                      <Button
                        variant="outline"
                        onClick={loadMore}
                        disabled={loading}
                      >
                        {loading ? 'Loading...' : 'Load More Properties'}
                      </Button>
                    )
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Save Search Dialog */}
      <Dialog open={isSaveSearchDialogOpen} onOpenChange={setIsSaveSearchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="search-name">Search Name</Label>
            <Input
              id="search-name"
              placeholder="e.g., Mbabane Apartments under E2000"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveSearchDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCurrentSearch} disabled={!searchName.trim()}>
              Save Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

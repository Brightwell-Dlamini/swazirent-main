// src/app/search/SearchContent.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, memo, useRef, useDeferredValue } from 'react';
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
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Search, SlidersHorizontal, X, Bookmark, Clock, Loader2, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { Property, PropertyType } from '@/types/property';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';

// Types
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

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'popular';
type ViewMode = 'grid' | 'list';

// Eswatini cities
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

// Memoized Filter Content
const FilterContent = memo(({
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}: {
  filters: Filters;
  onFilterChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}) => (
  <div className="space-y-6 pb-6">
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
                  onFilterChange('propertyType', [...filters.propertyType, type]);
                } else {
                  onFilterChange(
                    'propertyType',
                    filters.propertyType.filter((t) => t !== type)
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
      <ScrollArea className="h-48 mt-2">
        <div className="space-y-2 pr-4">
          {ESWATINI_AMENITIES.map((amenity) => (
            <div key={amenity} className="flex items-center space-x-2">
              <Checkbox
                id={`amenity-${amenity}`}
                checked={filters.amenities.includes(amenity)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onFilterChange('amenities', [...filters.amenities, amenity]);
                  } else {
                    onFilterChange(
                      'amenities',
                      filters.amenities.filter((a) => a !== amenity)
                    );
                  }
                }}
              />
              <Label htmlFor={`amenity-${amenity}`}>{amenity}</Label>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>

    {/* Furnished */}
    <div className="flex items-center space-x-2">
      <Checkbox
        id="furnished"
        checked={filters.furnished}
        onCheckedChange={(checked) => onFilterChange('furnished', checked === true)}
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
));

FilterContent.displayName = 'FilterContent';

// Memoized Property Grid Item
const PropertyGridItem = memo(({ property, viewMode }: { property: Property; viewMode: ViewMode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.2 }}
  >
    <PropertyCard property={property} viewMode={viewMode} />
  </motion.div>
));

PropertyGridItem.displayName = 'PropertyGridItem';

// Skeleton Loader
const SkeletonGrid = ({ count = 6 }: { count?: number }) => (
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="space-y-3">
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-6 w-1/3" />
      </div>
    ))}
  </div>
);

export default function SearchContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [paginationMode, setPaginationMode] = useState<'pagination' | 'load-more'>('pagination');
  const [hasMore, setHasMore] = useState(false);
  const itemsPerPage = 12;

  const [filters, setFilters] = useState<Filters>(() => ({
    city: searchParams.get('city') || 'any',
    keyword: searchParams.get('q') || '',
    minPrice: Number(searchParams.get('minPrice')) || 0,
    maxPrice: Number(searchParams.get('maxPrice')) || 10000,
    bedrooms: searchParams.get('bedrooms') || 'any',
    propertyType: (searchParams.getAll('propertyType') as PropertyType[]) || [],
    amenities: searchParams.getAll('amenities') || [],
    furnished: searchParams.get('furnished') === 'true',
  }));

  const [searchInput, setSearchInput] = useState(filters.keyword);
  const [debouncedSearchTerm] = useDebounce(searchInput, 300);
  const deferredFilters = useDeferredValue(filters);

  // Recent searches
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [isSaveSearchDialogOpen, setIsSaveSearchDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  // Load recent and saved searches
  useEffect(() => {
    const recent = localStorage.getItem('recentSearches');
    if (recent) setRecentSearches(JSON.parse(recent));
    const saved = localStorage.getItem('savedSearches');
    if (saved) setSavedSearches(JSON.parse(saved));
  }, []);

  // Update active filter count
  useEffect(() => {
    let count = 0;
    if (filters.city && filters.city !== 'any') count++;
    if (filters.keyword) count++;
    if (filters.minPrice > 0 || filters.maxPrice < 10000) count++;
    if (filters.bedrooms !== 'any') count++;
    count += filters.propertyType.length;
    count += filters.amenities.length;
    if (filters.furnished) count++;
    setActiveFilterCount(count);
  }, [filters]);

  // Fetch all properties on mount
  useEffect(() => {
    const fetchAllProperties = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
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
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const transformedData: Property[] = (data || []).map((item: any) => ({
          ...item,
          landlord: item.landlord || undefined,
          photos: item.photos || [],
        }));

        setAllProperties(transformedData);
        setTotalCount(transformedData.length);
      } catch (error) {
        console.error('Error fetching properties:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllProperties();
  }, []);

  // Apply filters and sorting client-side
  useEffect(() => {
    if (loading) return;

    setIsFiltering(true);
    
    // Use setTimeout to allow UI to update
    const timer = setTimeout(() => {
      let filtered = [...allProperties];

      // Apply filters
      if (deferredFilters.city && deferredFilters.city !== 'any') {
        filtered = filtered.filter(p => 
          p.location_city?.toLowerCase() === deferredFilters.city.toLowerCase()
        );
      }

      if (deferredFilters.keyword) {
        const keyword = deferredFilters.keyword.toLowerCase();
        filtered = filtered.filter(p =>
          p.title?.toLowerCase().includes(keyword) ||
          p.description?.toLowerCase().includes(keyword) ||
          p.location_city?.toLowerCase().includes(keyword) ||
          p.location_suburb?.toLowerCase().includes(keyword)
        );
      }

      if (deferredFilters.minPrice > 0) {
        filtered = filtered.filter(p => p.price >= deferredFilters.minPrice);
      }

      if (deferredFilters.maxPrice < 10000) {
        filtered = filtered.filter(p => p.price <= deferredFilters.maxPrice);
      }

      if (deferredFilters.bedrooms !== 'any') {
        const minBedrooms = parseInt(deferredFilters.bedrooms);
        filtered = filtered.filter(p => (p.bedrooms || 0) >= minBedrooms);
      }

      if (deferredFilters.propertyType.length > 0) {
        filtered = filtered.filter(p => 
          deferredFilters.propertyType.includes(p.property_type as PropertyType)
        );
      }

      if (deferredFilters.amenities.length > 0) {
        filtered = filtered.filter(p =>
          deferredFilters.amenities.every(a => p.amenities?.includes(a))
        );
      }

      if (deferredFilters.furnished) {
        filtered = filtered.filter(p => p.is_furnished === true);
      }

      // Apply sorting
      switch (sortBy) {
        case 'price_asc':
          filtered.sort((a, b) => a.price - b.price);
          break;
        case 'price_desc':
          filtered.sort((a, b) => b.price - a.price);
          break;
        case 'popular':
          filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
          break;
        case 'newest':
        default:
          filtered.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }

      setFilteredProperties(filtered);
      setTotalCount(filtered.length);
      setHasMore(filtered.length > page * itemsPerPage);
      setIsFiltering(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [allProperties, deferredFilters, sortBy, page, loading]);

  // Update URL when filters change
  useEffect(() => {
    if (loading) return;

    const params = new URLSearchParams();
    if (filters.city && filters.city !== 'any') params.set('city', filters.city);
    if (filters.keyword) params.set('q', filters.keyword);
    if (filters.minPrice > 0) params.set('minPrice', filters.minPrice.toString());
    if (filters.maxPrice < 10000) params.set('maxPrice', filters.maxPrice.toString());
    if (filters.bedrooms !== 'any') params.set('bedrooms', filters.bedrooms);
    if (filters.furnished) params.set('furnished', 'true');
    if (sortBy !== 'newest') params.set('sort', sortBy);
    if (page > 1) params.set('page', page.toString());
    filters.propertyType.forEach(type => params.append('propertyType', type));
    filters.amenities.forEach(amenity => params.append('amenities', amenity));

    const newUrl = `${pathname}?${params.toString()}`;
    router.replace(newUrl, { scroll: false });
  }, [filters, sortBy, page, pathname, router, loading]);

  // Save search when user performs a search
  useEffect(() => {
    if (filters.keyword && filters.keyword.length > 2) {
      setRecentSearches(prev => {
        const updated = [filters.keyword, ...prev.filter(s => s !== filters.keyword)].slice(0, 5);
        localStorage.setItem('recentSearches', JSON.stringify(updated));
        return updated;
      });
    }
  }, [filters.keyword]);

  const handleFilterChange = useCallback(<K extends keyof Filters>(
    key: K,
    value: Filters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      city: 'any',
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
    setPage(prev => prev + 1);
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
    toast.success('Search saved!');
  }, [searchName, filters, savedSearches]);

  const loadSavedSearch = useCallback((saved: SavedSearch) => {
    setFilters(saved.filters);
    setSearchInput(saved.filters.keyword);
    setPage(1);
    setIsFilterOpen(false);
  }, []);

  const deleteSavedSearch = useCallback((index: number) => {
    const updated = savedSearches.filter((_, i) => i !== index);
    setSavedSearches(updated);
    localStorage.setItem('savedSearches', JSON.stringify(updated));
  }, [savedSearches]);

  const applyPreset = useCallback((preset: typeof FILTER_PRESETS[number]) => {
    setFilters(prev => ({
      ...prev,
      ...preset.filters,
      amenities: preset.filters.amenities ? [...preset.filters.amenities] : prev.amenities,
    }));
    setPage(1);
    setIsFilterOpen(false);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.city !== 'any' ||
      filters.keyword !== '' ||
      filters.minPrice > 0 ||
      filters.maxPrice < 10000 ||
      filters.bedrooms !== 'any' ||
      filters.propertyType.length > 0 ||
      filters.amenities.length > 0 ||
      filters.furnished
    );
  }, [filters]);

  const paginatedProperties = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredProperties.slice(0, end);
  }, [filteredProperties, page]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const showLoadMore = paginationMode === 'load-more' && hasMore;

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
              className="hover:bg-primary hover:text-white transition-colors"
            >
              {preset.name}
            </Button>
          ))}
        </div>

        {/* Search Bar and Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search by keyword, city, or property name..."
              className="pl-10 h-12"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                setTimeout(() => setIsSearchFocused(false), 200);
              }}
              aria-label="Search properties"
            />

            {/* Recent Searches Dropdown */}
            <AnimatePresence>
              {isSearchFocused && recentSearches.length > 0 && !filters.keyword && searchInput.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-900 border rounded-md shadow-lg"
                >
                  <div className="p-2">
                    <p className="text-xs text-gray-500 mb-1">Recent searches:</p>
                    {recentSearches.map((search) => (
                      <button
                        key={search}
                        className="flex items-center w-full px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-2">
            {/* Save Search Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSaveSearchDialogOpen(true)}
              disabled={!hasActiveFilters}
              className="hidden sm:flex"
            >
              <Bookmark className="h-4 w-4 mr-2" />
              Save Search
            </Button>

            {/* Mobile Filter Button */}
            <Button
              variant="outline"
              className="lg:hidden relative"
              onClick={() => setIsFilterOpen(true)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>
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
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 group"
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
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Active Filters */}
        <AnimatePresence>
          {hasActiveFilters && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 flex flex-wrap gap-2"
            >
              {filters.city && filters.city !== 'any' && (
                <Badge variant="secondary" className="px-3 py-1">
                  City: {filters.city}
                  <button
                    className="ml-2 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 rounded-full"
                    onClick={() => handleFilterChange('city', 'any')}
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
                        filters.propertyType.filter((t) => t !== type)
                      )
                    }
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
                        filters.amenities.filter((a) => a !== amenity)
                      )
                    }
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
                  >
                    ×
                  </button>
                </Badge>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex gap-8">
        {/* Desktop Filters Sidebar */}
        <div className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-24">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Filters</h2>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear all
                </Button>
              )}
            </div>
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
          {/* Results Count & Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <p className="text-gray-600" aria-live="polite">
              {loading ? (
                'Loading...'
              ) : (
                <span className="font-semibold">{totalCount}</span>
              )}{' '}
              property{totalCount !== 1 ? 's' : ''} found
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              {/* View Mode Toggle */}
              <div className="flex border rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 text-sm transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-primary text-white'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 text-sm transition-colors ${
                    viewMode === 'list'
                      ? 'bg-primary text-white'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  List
                </button>
              </div>

              {/* Pagination Mode Selector */}
              <Select
                value={paginationMode}
                onValueChange={(value: 'pagination' | 'load-more') => {
                  setPaginationMode(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-32">
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
                onValueChange={(value: SortOption) => {
                  setSortBy(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-45">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Property Grid */}
          {loading ? (
            <SkeletonGrid count={6} />
          ) : filteredProperties.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 mx-auto text-gray-400 mb-4" />
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
              <div className={`grid ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-6`}>
                <AnimatePresence mode="wait">
                  {paginatedProperties.map((property) => (
                    <PropertyGridItem key={property.id} property={property} viewMode={viewMode} />
                  ))}
                </AnimatePresence>
              </div>

              {/* Pagination / Load More */}
              {totalPages > 1 && (
                <div className="mt-8 flex flex-col items-center gap-4">
                  {paginationMode === 'pagination' ? (
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-600">
                        Page {page} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  ) : (
                    showLoadMore && (
                      <Button
                        variant="outline"
                        onClick={loadMore}
                        disabled={isFiltering}
                        className="min-w-48"
                      >
                        {isFiltering ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          'Load More Properties'
                        )}
                      </Button>
                    )
                  )}
                  <p className="text-sm text-gray-500">
                    Showing {paginatedProperties.length} of {totalCount} properties
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Filter Sheet */}
      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <SheetContent side="left" className="w-full sm:max-w-md p-0">
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center p-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </SheetTitle>
              <SheetClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </SheetClose>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <FilterContent
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={clearFilters}
                hasActiveFilters={hasActiveFilters}
              />
            </div>

            <div className="p-4 border-t bg-gray-50 dark:bg-gray-900">
              <Button
                className="w-full"
                onClick={() => setIsFilterOpen(false)}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

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
              <Bookmark className="mr-2 h-4 w-4" />
              Save Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

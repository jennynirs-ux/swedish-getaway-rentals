'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronLeft, ChevronRight, Home, MapPin, Bed, Camera, DollarSign, Send, Sparkles, Upload, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/services/authService';
import { geocodeAddress } from '@/lib/geocoding';
import { emailSchema } from '@/lib/validationSchemas';

// Types for the wizard form data
export interface WizardFormData {
  // Step 1: Welcome & Basics
  fullName: string;
  email: string;
  phone: string;

  // Step 2: Property Type
  propertyType: 'cabin' | 'villa' | 'lakehouse' | 'apartment' | 'farm' | 'treehouse' | '';

  // Step 3: Location
  address: string;
  city: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;

  // Step 4: Property Details
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  description: string;

  // Step 5: Amenities
  amenities: string[];

  // Step 6: Photos
  photoUrls: string[];

  // Step 7: Pricing
  basePrice: number;
  cleaningFee: number;
  currency: 'SEK' | 'EUR' | 'NOK' | 'DKK';
}

interface WizardStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const STEPS: WizardStep[] = [
  { id: 1, title: 'Welcome', description: 'Basic information', icon: <Sparkles className="w-5 h-5" /> },
  { id: 2, title: 'Property Type', description: 'Choose your property', icon: <Home className="w-5 h-5" /> },
  { id: 3, title: 'Location', description: 'Where is it located?', icon: <MapPin className="w-5 h-5" /> },
  { id: 4, title: 'Details', description: 'Bedrooms, bathrooms', icon: <Bed className="w-5 h-5" /> },
  { id: 5, title: 'Amenities', description: 'What do you offer?', icon: <Check className="w-5 h-5" /> },
  { id: 6, title: 'Photos', description: 'Upload images', icon: <Camera className="w-5 h-5" /> },
  { id: 7, title: 'Pricing', description: 'Set your rates', icon: <DollarSign className="w-5 h-5" /> },
  { id: 8, title: 'Review', description: 'Confirm everything', icon: <Send className="w-5 h-5" /> },
];

const PROPERTY_TYPES = [
  { value: 'cabin', label: 'Cabin', description: 'Cozy mountain or forest retreat' },
  { value: 'villa', label: 'Villa', description: 'Luxury standalone property' },
  { value: 'lakehouse', label: 'Lake House', description: 'Waterfront property' },
  { value: 'apartment', label: 'Apartment', description: 'Urban or suburban apartment' },
  { value: 'farm', label: 'Farm', description: 'Working or heritage farm' },
  { value: 'treehouse', label: 'Tree House', description: 'Unique elevated experience' },
];

const AMENITY_CATEGORIES = {
  'Essentials': ['WiFi', 'Parking', 'Kitchen', 'Heating', 'AC', 'Washer'],
  'Kitchen': ['Dishwasher', 'Oven', 'Stove', 'Refrigerator', 'Microwave', 'Toaster'],
  'Outdoor': ['Garden', 'Patio', 'BBQ Grill', 'Hot Tub', 'Pool', 'Playground'],
  'Entertainment': ['TV', 'Streaming Services', 'Board Games', 'Books', 'Music System', 'Projector'],
  'Safety': ['Smoke Detector', 'Fire Extinguisher', 'First Aid Kit', 'Security Camera', 'Safe', 'Door Locks'],
  'Comfort': ['Bed Linens', 'Towels', 'Hair Dryer', 'Iron', 'Humidifier', 'Air Purifier'],
};

// Step Components
const Step1Welcome: React.FC<{ formData: WizardFormData; onChange: (field: string, value: any) => void }> = ({ formData, onChange }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold mb-2">Welcome to Host Onboarding</h3>
      <p className="text-gray-600">
        Let's get started! We'll gather some basic information about you and your property.
        This should take about 10 minutes.
      </p>
    </div>

    <div className="space-y-4">
      <div>
        <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
        <Input
          id="fullName"
          placeholder="John Doe"
          value={formData.fullName}
          onChange={(e) => onChange('fullName', e.target.value)}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="john@example.com"
          value={formData.email}
          onChange={(e) => onChange('email', e.target.value)}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+46 70 123 4567"
          value={formData.phone}
          onChange={(e) => onChange('phone', e.target.value)}
          className="mt-1"
        />
      </div>
    </div>
  </div>
);

const Step2PropertyType: React.FC<{ formData: WizardFormData; onChange: (field: string, value: any) => void }> = ({ formData, onChange }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold mb-2">What type of property do you want to list?</h3>
      <p className="text-gray-600">Choose the category that best describes your accommodation.</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {PROPERTY_TYPES.map((type) => (
        <div
          key={type.value}
          onClick={() => onChange('propertyType', type.value)}
          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
            formData.propertyType === type.value
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-gray-900">{type.label}</h4>
              <p className="text-sm text-gray-600 mt-1">{type.description}</p>
            </div>
            {formData.propertyType === type.value && (
              <Check className="w-5 h-5 text-blue-500 flex-shrink-0" />
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const Step3Location: React.FC<{ formData: WizardFormData; onChange: (field: string, value: any) => void }> = ({ formData, onChange }) => {
  const [geocodingStatus, setGeocodingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const geocodingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // BUG-005 FIX: Auto-geocode when address fields change
  useEffect(() => {
    // Clear previous timeout
    if (geocodingTimeoutRef.current) {
      clearTimeout(geocodingTimeoutRef.current);
    }

    // Don't geocode if we don't have required fields
    if (!formData.address && !formData.city && !formData.country) {
      setGeocodingStatus('idle');
      return;
    }

    setGeocodingStatus('loading');

    // Debounce geocoding by 500ms
    geocodingTimeoutRef.current = setTimeout(async () => {
      try {
        // Build address string from components
        const addressParts = [
          formData.address,
          formData.city,
          formData.postalCode,
          formData.country
        ].filter(Boolean);

        const fullAddress = addressParts.join(', ');

        if (!fullAddress.trim()) {
          setGeocodingStatus('idle');
          return;
        }

        const result = await geocodeAddress(fullAddress);

        if (result) {
          onChange('latitude', result.latitude);
          onChange('longitude', result.longitude);
          setGeocodingStatus('success');

          toast({
            title: 'Location found',
            description: `Coordinates: ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`,
          });
        } else {
          setGeocodingStatus('error');
          toast({
            title: 'Address not found',
            description: 'Could not determine coordinates for this address. You can adjust them manually later.',
            variant: 'destructive'
          });
        }
      } catch (error) {
        setGeocodingStatus('error');
        console.error('Geocoding error:', error);
      }
    }, 500);

    return () => {
      if (geocodingTimeoutRef.current) {
        clearTimeout(geocodingTimeoutRef.current);
      }
    };
  }, [formData.address, formData.city, formData.postalCode, formData.country, onChange]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Where is your property located?</h3>
        <p className="text-gray-600">This helps guests find you and determines which market you serve.</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="address" className="text-sm font-medium">Street Address</Label>
          <Input
            id="address"
            placeholder="123 Main Street"
            value={formData.address}
            onChange={(e) => onChange('address', e.target.value)}
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city" className="text-sm font-medium">City</Label>
            <Input
              id="city"
              placeholder="Stockholm"
              value={formData.city}
              onChange={(e) => onChange('city', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="postalCode" className="text-sm font-medium">Postal Code</Label>
            <Input
              id="postalCode"
              placeholder="10001"
              value={formData.postalCode}
              onChange={(e) => onChange('postalCode', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="country" className="text-sm font-medium">Country</Label>
          <Select value={formData.country} onValueChange={(value) => onChange('country', value)}>
            <SelectTrigger id="country" className="mt-1">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SE">Sweden</SelectItem>
              <SelectItem value="NO">Norway</SelectItem>
              <SelectItem value="DK">Denmark</SelectItem>
              <SelectItem value="DE">Germany</SelectItem>
              <SelectItem value="FI">Finland</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {geocodingStatus === 'loading' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">Finding coordinates for your location...</p>
          </div>
        )}

        {geocodingStatus === 'success' && formData.latitude && formData.longitude && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-900">
              Location verified: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
            </p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            💡 Tip: You can refine the exact location on the map in the next steps.
          </p>
        </div>
      </div>
    </div>
  );
};

const Step4PropertyDetails: React.FC<{ formData: WizardFormData; onChange: (field: string, value: any) => void }> = ({ formData, onChange }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold mb-2">Tell us about your property</h3>
      <p className="text-gray-600">These details help guests understand what to expect.</p>
    </div>

    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="bedrooms" className="text-sm font-medium">Bedrooms</Label>
          <Input
            id="bedrooms"
            type="number"
            min="1"
            value={formData.bedrooms}
            onChange={(e) => onChange('bedrooms', parseInt(e.target.value) || 0)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="bathrooms" className="text-sm font-medium">Bathrooms</Label>
          <Input
            id="bathrooms"
            type="number"
            min="0.5"
            step="0.5"
            value={formData.bathrooms}
            onChange={(e) => onChange('bathrooms', parseFloat(e.target.value) || 0)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="maxGuests" className="text-sm font-medium">Max Guests</Label>
          <Input
            id="maxGuests"
            type="number"
            min="1"
            value={formData.maxGuests}
            onChange={(e) => onChange('maxGuests', parseInt(e.target.value) || 0)}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description" className="text-sm font-medium">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe your property in detail. What makes it special? What amenities does it offer? What can guests do here?"
          value={formData.description}
          onChange={(e) => onChange('description', e.target.value)}
          rows={5}
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-2">{formData.description.length} / 2000 characters</p>
      </div>
    </div>
  </div>
);

const Step5Amenities: React.FC<{ formData: WizardFormData; onChange: (field: string, value: any) => void }> = ({ formData, onChange }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold mb-2">What amenities do you offer?</h3>
      <p className="text-gray-600">Select all that apply. These help guests find properties that match their needs.</p>
    </div>

    <div className="space-y-6">
      {Object.entries(AMENITY_CATEGORIES).map(([category, amenities]) => (
        <div key={category}>
          <h4 className="font-semibold text-gray-900 mb-3">{category}</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {amenities.map((amenity) => (
              <div key={amenity} className="flex items-center space-x-2">
                <Checkbox
                  id={amenity}
                  checked={formData.amenities.includes(amenity)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onChange('amenities', [...formData.amenities, amenity]);
                    } else {
                      onChange('amenities', formData.amenities.filter(a => a !== amenity));
                    }
                  }}
                />
                <Label htmlFor={amenity} className="text-sm cursor-pointer font-normal">
                  {amenity}
                </Label>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const Step6Photos: React.FC<{ formData: WizardFormData; onChange: (field: string, value: any) => void }> = ({ formData, onChange }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // BUG-006 FIX: File upload handler
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validation: file size (max 5MB) and type
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: 'File too large',
            description: `${file.name} exceeds 5MB limit`,
            variant: 'destructive'
          });
          continue;
        }

        if (!file.type.startsWith('image/')) {
          toast({
            title: 'Invalid file type',
            description: `${file.name} is not an image file`,
            variant: 'destructive'
          });
          continue;
        }

        try {
          const fileKey = `${Date.now()}_${i}_${file.name}`;
          setUploadProgress(prev => ({ ...prev, [fileKey]: 0 }));

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('property-images')
            .upload(`properties/${fileKey}`, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            throw uploadError;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('property-images')
            .getPublicUrl(`properties/${fileKey}`);

          if (urlData?.publicUrl) {
            uploadedUrls.push(urlData.publicUrl);
            setUploadProgress(prev => {
              const updated = { ...prev };
              delete updated[fileKey];
              return updated;
            });
          }
        } catch (error) {
          console.error(`Upload error for ${file.name}:`, error);
          toast({
            title: 'Upload failed',
            description: `Failed to upload ${file.name}`,
            variant: 'destructive'
          });
        }
      }

      if (uploadedUrls.length > 0) {
        onChange('photoUrls', [...formData.photoUrls, ...uploadedUrls]);
        toast({
          title: 'Success',
          description: `${uploadedUrls.length} photo(s) uploaded successfully`,
        });
      }
    } finally {
      setIsUploading(false);
      setUploadProgress({});
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Upload photos of your property</h3>
        <p className="text-gray-600">
          High-quality photos are essential! Start with at least 3-5 photos showing different angles and rooms.
        </p>
      </div>

      <div className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">Drag and drop your photos here, or click to browse</p>
          <Button variant="outline" disabled={isUploading}>
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Choose Photos'}
          </Button>
        </div>

        {Object.keys(uploadProgress).length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 mb-2">Uploading photos...</p>
            <div className="space-y-2">
              {Object.entries(uploadProgress).map(([key, progress]) => (
                <div key={key} className="text-xs text-blue-800">
                  <div className="flex justify-between mb-1">
                    <span>Photo {key.split('_')[1]}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded h-1">
                    <div
                      className="bg-blue-500 h-1 rounded transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {formData.photoUrls.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Uploaded Photos ({formData.photoUrls.length})</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {formData.photoUrls.map((url, idx) => (
                <div key={idx} className="relative group">
                  <img src={url} alt={`Photo ${idx + 1}`} loading="lazy" decoding="async" className="w-full h-32 object-cover rounded-lg" />
                  <button
                    onClick={() => onChange('photoUrls', formData.photoUrls.filter((_, i) => i !== idx))}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-900">
            💡 Tip: Use natural lighting, show multiple rooms, include outdoor spaces, and make sure photos are well-composed. Max 5MB per image.
          </p>
        </div>
      </div>
    </div>
  );
};

const Step7Pricing: React.FC<{ formData: WizardFormData; onChange: (field: string, value: any) => void }> = ({ formData, onChange }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold mb-2">Set your pricing</h3>
      <p className="text-gray-600">You can adjust these rates anytime as market conditions change.</p>
    </div>

    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="basePrice" className="text-sm font-medium">Base Price per Night</Label>
          <div className="flex items-center mt-1">
            <Input
              id="basePrice"
              type="number"
              min="0"
              step="10"
              value={formData.basePrice}
              onChange={(e) => onChange('basePrice', parseFloat(e.target.value) || 0)}
              className="flex-1"
            />
            <span className="ml-2 text-gray-600">{formData.currency}</span>
          </div>
        </div>

        <div>
          <Label htmlFor="cleaningFee" className="text-sm font-medium">Cleaning Fee</Label>
          <div className="flex items-center mt-1">
            <Input
              id="cleaningFee"
              type="number"
              min="0"
              step="10"
              value={formData.cleaningFee}
              onChange={(e) => onChange('cleaningFee', parseFloat(e.target.value) || 0)}
              className="flex-1"
            />
            <span className="ml-2 text-gray-600">{formData.currency}</span>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="currency" className="text-sm font-medium">Currency</Label>
        <Select value={formData.currency} onValueChange={(value: any) => onChange('currency', value)}>
          <SelectTrigger id="currency" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SEK">Swedish Krona (SEK)</SelectItem>
            <SelectItem value="EUR">Euro (EUR)</SelectItem>
            <SelectItem value="NOK">Norwegian Krone (NOK)</SelectItem>
            <SelectItem value="DKK">Danish Krone (DKK)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-900 font-semibold mb-2">Price Summary</p>
        <div className="space-y-1 text-sm text-green-800">
          <div>Base Price: {formData.basePrice} {formData.currency}/night</div>
          <div>Cleaning Fee: {formData.cleaningFee} {formData.currency}</div>
          <div className="pt-2 border-t border-green-300 font-semibold">
            Total for 3-night stay: {(formData.basePrice * 3 + formData.cleaningFee).toFixed(2)} {formData.currency}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Step8Review: React.FC<{ formData: WizardFormData }> = ({ formData }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold mb-2">Review Your Information</h3>
      <p className="text-gray-600">Please review everything before submitting. You can go back and edit any section.</p>
    </div>

    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between py-1 border-b">
            <span className="text-gray-600">Name:</span>
            <span className="font-medium">{formData.fullName}</span>
          </div>
          <div className="flex justify-between py-1 border-b">
            <span className="text-gray-600">Email:</span>
            <span className="font-medium">{formData.email}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Phone:</span>
            <span className="font-medium">{formData.phone}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Property Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between py-1 border-b">
            <span className="text-gray-600">Type:</span>
            <span className="font-medium capitalize">{formData.propertyType}</span>
          </div>
          <div className="flex justify-between py-1 border-b">
            <span className="text-gray-600">Location:</span>
            <span className="font-medium">{formData.address}, {formData.city}, {formData.postalCode}</span>
          </div>
          <div className="flex justify-between py-1 border-b">
            <span className="text-gray-600">Capacity:</span>
            <span className="font-medium">{formData.bedrooms} bed, {formData.bathrooms} bath, {formData.maxGuests} guests</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Amenities:</span>
            <span className="font-medium">{formData.amenities.length} selected</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between py-1 border-b">
            <span className="text-gray-600">Base Price:</span>
            <span className="font-medium">{formData.basePrice} {formData.currency}/night</span>
          </div>
          <div className="flex justify-between py-1 border-b">
            <span className="text-gray-600">Cleaning Fee:</span>
            <span className="font-medium">{formData.cleaningFee} {formData.currency}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Currency:</span>
            <span className="font-medium">{formData.currency}</span>
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          ✓ By submitting, you agree to our Host Terms of Service. Your property will be reviewed before going live.
        </p>
      </div>
    </div>
  </div>
);

// Main Wizard Component
export const HostOnboardingWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<WizardFormData>({
    fullName: '',
    email: '',
    phone: '',
    propertyType: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'SE',
    latitude: null,
    longitude: null,
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 2,
    description: '',
    amenities: [],
    photoUrls: [],
    basePrice: 0,
    cleaningFee: 0,
    currency: 'SEK',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        // BUG-007 FIX: Add proper email validation
        if (!formData.fullName || !formData.email || !formData.phone) {
          return false;
        }

        // Validate email format using emailSchema
        try {
          emailSchema.parse(formData.email);
        } catch (error) {
          setErrorMessage('Please enter a valid email address');
          return false;
        }

        return true;
      case 2:
        return !!formData.propertyType;
      case 3:
        return !!(formData.address && formData.city && formData.postalCode && formData.country);
      case 4:
        return !!(formData.bedrooms > 0 && formData.bathrooms > 0 && formData.maxGuests > 0 && formData.description);
      case 5:
        return formData.amenities.length > 0;
      case 6:
        return formData.photoUrls.length > 0;
      case 7:
        return !!(formData.basePrice > 0 && formData.currency);
      case 8:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields before proceeding.',
        variant: 'destructive'
      });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(8)) {
      toast({
        title: 'Validation Error',
        description: 'Please complete all required fields.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('You must be logged in to submit this form');
      }

      // Create host application in Supabase
      const { data, error } = await supabase
        .from('host_applications')
        .insert([
          {
            user_id: user.id,
            full_name: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            property_type: formData.propertyType,
            address: formData.address,
            city: formData.city,
            postal_code: formData.postalCode,
            country: formData.country,
            latitude: formData.latitude,
            longitude: formData.longitude,
            bedrooms: formData.bedrooms,
            bathrooms: formData.bathrooms,
            max_guests: formData.maxGuests,
            description: formData.description,
            amenities: formData.amenities,
            photo_urls: formData.photoUrls,
            base_price: formData.basePrice,
            cleaning_fee: formData.cleaningFee,
            currency: formData.currency,
            status: 'pending_review',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) {
        throw error;
      }

      setSubmitStatus('success');
      toast({
        title: 'Success!',
        description: 'Your host application has been submitted. We will review it and get back to you soon.',
      });

      // Optionally redirect or reset form
      setTimeout(() => {
        window.location.href = '/host/dashboard';
      }, 2000);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      setErrorMessage(message);
      setSubmitStatus('error');
      toast({
        title: 'Submission Error',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = (currentStep / STEPS.length) * 100;

  if (submitStatus === 'success') {
    return (
      <div className="w-full max-w-2xl mx-auto p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Application Submitted!</h2>
          <p className="text-gray-600">
            Thank you for applying. Your host application has been submitted successfully.
            We'll review your property and contact you within 48 hours.
          </p>
          <Button onClick={() => window.location.href = '/host/dashboard'}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Progress Bar */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Host Onboarding</h1>
            <Badge variant="outline">{currentStep} of {STEPS.length}</Badge>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Step Indicators */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between">
            {STEPS.map((step, idx) => (
              <div
                key={step.id}
                className={`flex flex-col items-center ${
                  idx < STEPS.length - 1 ? 'flex-1' : ''
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    step.id < currentStep
                      ? 'bg-green-500 text-white'
                      : step.id === currentStep
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step.id < currentStep ? '✓' : step.id}
                </div>
                <p className="text-xs text-gray-600 mt-1 text-center">{step.title}</p>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 mt-2 ${
                      step.id < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                    style={{ width: '40px' }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6 min-h-96">
          {currentStep === 1 && <Step1Welcome formData={formData} onChange={handleFieldChange} />}
          {currentStep === 2 && <Step2PropertyType formData={formData} onChange={handleFieldChange} />}
          {currentStep === 3 && <Step3Location formData={formData} onChange={handleFieldChange} />}
          {currentStep === 4 && <Step4PropertyDetails formData={formData} onChange={handleFieldChange} />}
          {currentStep === 5 && <Step5Amenities formData={formData} onChange={handleFieldChange} />}
          {currentStep === 6 && <Step6Photos formData={formData} onChange={handleFieldChange} />}
          {currentStep === 7 && <Step7Pricing formData={formData} onChange={handleFieldChange} />}
          {currentStep === 8 && <Step8Review formData={formData} />}

          {submitStatus === 'error' && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-900">{errorMessage}</p>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="border-t border-gray-200 p-6 flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-2">
            {currentStep === STEPS.length ? (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            ) : (
              <Button onClick={handleNext} size="lg">
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostOnboardingWizard;

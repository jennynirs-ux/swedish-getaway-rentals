// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Edit2, DollarSign } from 'lucide-react';
import PropertyPricingRules from '@/components/PropertyPricingRules';
import { PropertySpecialPricingEnhanced } from './PropertySpecialPricingEnhanced';

interface Property {
  id: string;
  title: string;
  location: string | null;
  price_per_night: number;
  currency: string;
  active: boolean;
  max_guests: number;
}

const PricingManagement: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, location, price_per_night, currency, active, max_guests')
        .eq('active', true)
        .order('title');

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading properties...</div>;
  }

  if (selectedProperty) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setSelectedProperty(null)}>
            ← Back to Properties
          </Button>
          <h2 className="text-2xl font-bold">{selectedProperty.title} - Pricing Management</h2>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Property Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Base Price:</span>
                  <p>{(selectedProperty.price_per_night / 100).toLocaleString()} {selectedProperty.currency}/night</p>
                </div>
                <div>
                  <span className="font-medium">Max Guests:</span>
                  <p>{selectedProperty.max_guests}</p>
                </div>
                <div>
                  <span className="font-medium">Location:</span>
                  <p>{selectedProperty.location || 'Not specified'}</p>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <Badge variant={selectedProperty.active ? 'default' : 'secondary'}>
                    {selectedProperty.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <PropertyPricingRules propertyId={selectedProperty.id} />
          
          <PropertySpecialPricingEnhanced
            propertyId={selectedProperty.id}
            basePrice={selectedProperty.price_per_night}
            currency={selectedProperty.currency}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Pricing & Calendar Management</h2>
        <p className="text-muted-foreground">Manage pricing rules and special pricing for your properties</p>
      </div>

      <div className="grid gap-4">
        {properties.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No active properties found.</p>
            </CardContent>
          </Card>
        ) : (
          properties.map((property) => (
            <Card key={property.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">{property.title}</h3>
                    <p className="text-sm text-muted-foreground">{property.location}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span>
                        <strong>Base Price:</strong> {(property.price_per_night / 100).toLocaleString()} {property.currency}/night
                      </span>
                      <span>
                        <strong>Max Guests:</strong> {property.max_guests}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Badge variant={property.active ? 'default' : 'secondary'}>
                      {property.active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button 
                      onClick={() => setSelectedProperty(property)}
                      className="flex items-center gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      Manage Pricing
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default PricingManagement;
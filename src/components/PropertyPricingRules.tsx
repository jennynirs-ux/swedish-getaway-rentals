import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PricingRule {
  id?: string;
  property_id: string;
  rule_type: 'extra_guest' | 'cleaning_fee' | 'extra_service';
  name: string;
  price: number;
  currency: string;
  is_per_night: boolean;
  is_active: boolean;
}

interface PropertyPricingRulesProps {
  propertyId: string;
}

const PropertyPricingRules: React.FC<PropertyPricingRulesProps> = ({ propertyId }) => {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [newRule, setNewRule] = useState<Partial<PricingRule>>({
    rule_type: 'extra_guest',
    name: '',
    price: 0,
    currency: 'SEK',
    is_per_night: false,
    is_active: true
  });

  useEffect(() => {
    loadRules();
  }, [propertyId]);

  const loadRules = async () => {
    try {
      const { data, error } = await supabase
        .from('properties_pricing_rules')
        .select('*')
        .eq('property_id', propertyId)
        .eq('is_active', true)
        .order('created_at');

      if (error) throw error;
      setRules((data || []) as PricingRule[]);
    } catch (error) {
      console.error('Error loading pricing rules:', error);
    }
  };

  const saveRule = async () => {
    if (!newRule.name || !newRule.price) {
      toast.error('Namn och pris måste anges');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('properties_pricing_rules')
        .insert([{
          property_id: propertyId,
          rule_type: newRule.rule_type!,
          name: newRule.name!,
          price: Math.round(newRule.price! * 100), // Convert to cents
          currency: newRule.currency!,
          is_per_night: newRule.is_per_night!,
          is_active: true
        }]);

      if (error) throw error;

      toast.success('Prisregeln har lagts till');
      setNewRule({
        rule_type: 'extra_guest',
        name: '',
        price: 0,
        currency: 'SEK',
        is_per_night: false,
        is_active: true
      });
      loadRules();
    } catch (error) {
      console.error('Error saving rule:', error);
      toast.error('Kunde inte spara regeln');
    } finally {
      setLoading(false);
    }
  };

  const deleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('properties_pricing_rules')
        .update({ is_active: false })
        .eq('id', ruleId);

      if (error) throw error;

      toast.success('Prisregeln har tagits bort');
      loadRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Kunde inte radera regeln');
    }
  };

  const getRuleTypeLabel = (type: string) => {
    switch (type) {
      case 'extra_guest': return 'Extra gäst';
      case 'cleaning_fee': return 'Städavgift';
      case 'extra_service': return 'Extra tjänst';
      default: return type;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prisregler</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Existing Rules */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Aktiva regler</h3>
          {rules.length === 0 ? (
            <p className="text-muted-foreground">Inga prisregler är skapade än.</p>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">{rule.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {getRuleTypeLabel(rule.rule_type)} • {rule.price / 100} {rule.currency}
                    {rule.is_per_night ? ' per natt' : ' engångsavgift'}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteRule(rule.id!)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Add New Rule */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-lg font-medium">Lägg till ny regel</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rule-type">Typ av regel</Label>
              <Select
                value={newRule.rule_type}
                onValueChange={(value) => setNewRule({ ...newRule, rule_type: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="extra_guest">Extra gäst</SelectItem>
                  <SelectItem value="cleaning_fee">Städavgift</SelectItem>
                  <SelectItem value="extra_service">Extra tjänst</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="rule-name">Namn</Label>
              <Input
                id="rule-name"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                placeholder="t.ex. Frukost, Handdukar"
              />
            </div>

            <div>
              <Label htmlFor="rule-price">Pris ({newRule.currency})</Label>
              <Input
                id="rule-price"
                type="number"
                value={newRule.price}
                onChange={(e) => setNewRule({ ...newRule, price: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={newRule.is_per_night}
                onCheckedChange={(checked) => setNewRule({ ...newRule, is_per_night: checked })}
              />
              <Label>Per natt (annars engångsavgift)</Label>
            </div>
          </div>

          <Button onClick={saveRule} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            Lägg till regel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PropertyPricingRules;

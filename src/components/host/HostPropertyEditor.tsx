import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PropertyPreparationDays } from "@/components/admin/PropertyPreparationDays";
import AvailabilityCalendar from "@/components/admin/AvailabilityCalendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Settings, DollarSign } from "lucide-react";

interface HostPropertyEditorProps {
  propertyId: string;
  propertyTitle: string;
  preparationDays: number;
  onUpdate?: () => void;
}

export const HostPropertyEditor = ({ 
  propertyId, 
  propertyTitle, 
  preparationDays,
  onUpdate 
}: HostPropertyEditorProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{propertyTitle}</h2>
        <p className="text-muted-foreground">Manage your property settings, availability, and pricing</p>
      </div>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar & Pricing
          </TabsTrigger>
          <TabsTrigger value="preparation" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Preparation Days
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Pricing Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          <AvailabilityCalendar defaultPropertyId={propertyId} />
        </TabsContent>

        <TabsContent value="preparation" className="mt-6">
          <PropertyPreparationDays 
            propertyId={propertyId} 
            currentPreparationDays={preparationDays}
            onUpdate={onUpdate}
          />
        </TabsContent>

        <TabsContent value="pricing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Rules</CardTitle>
              <CardDescription>
                Additional pricing features coming soon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You can currently set seasonal prices directly in the Calendar & Pricing tab.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
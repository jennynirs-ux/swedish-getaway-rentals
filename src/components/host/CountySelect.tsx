import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REGIONS_BY_NAME } from "@/content/regions";

/** The listing's county (län, ISO 3166-2:SE code): guests search by region, and publishing needs it */
export function CountySelect({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor="county">County (län)</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="county">
          <SelectValue placeholder="Choose a county" />
        </SelectTrigger>
        <SelectContent>
          {REGIONS_BY_NAME.map((r) => (
            <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** "Åre, Sweden": the area guests see, from the town the host typed */
export const publicAreaFrom = (town: string | undefined, country = "Sweden") => {
  const t = (town ?? "").trim();
  return t ? `${t.charAt(0).toUpperCase()}${t.slice(1)}, ${country}` : "";
};

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * The year picker shared by the financial views. Its years and state come
 * from useFinancialYears (./useFinancialYears.ts).
 */
interface YearSelectProps {
  years: number[];
  value: number;
  onChange: (year: number) => void;
}

export const YearSelect = ({ years, value, onChange }: YearSelectProps) => (
  <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
    <SelectTrigger className="w-28" aria-label="År">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {years.map((y) => (
        <SelectItem key={y} value={String(y)}>
          {y}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

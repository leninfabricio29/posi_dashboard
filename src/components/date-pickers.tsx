"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subDays, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { es as dayPickerEs } from "react-day-picker/locale";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type { DateRange };

export function DatePicker({
  value,
  onChange,
  id,
  className,
}: {
  value: Date;
  onChange: (d: Date) => void;
  id?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button id={id} variant="outline" className={cn("justify-start gap-2 font-normal", className)} />
        }
      >
        <CalendarIcon className="size-4 text-muted-foreground" />
        <span className="first-letter:uppercase">{format(value, "EEE dd MMM yyyy", { locale: es })}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={dayPickerEs}
          selected={value}
          defaultMonth={value}
          onSelect={(d) => {
            if (d) {
              onChange(d);
              setOpen(false);
            }
          }}
          disabled={{ after: new Date() }}
        />
      </PopoverContent>
    </Popover>
  );
}

export interface RangePreset {
  label: string;
  range: () => { from: Date; to: Date };
}

const WEEK = { weekStartsOn: 1 as const };

export const RANGE_PRESETS: RangePreset[] = [
  { label: "Hoy", range: () => ({ from: new Date(), to: new Date() }) },
  { label: "Esta semana", range: () => ({ from: startOfWeek(new Date(), WEEK), to: new Date() }) },
  {
    label: "Semana pasada",
    range: () => {
      const d = subWeeks(new Date(), 1);
      return { from: startOfWeek(d, WEEK), to: endOfWeek(d, WEEK) };
    },
  },
  { label: "Este mes", range: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  {
    label: "Mes pasado",
    range: () => {
      const d = subDays(startOfMonth(new Date()), 1);
      return { from: startOfMonth(d), to: endOfMonth(d) };
    },
  },
  { label: "Últimos 30 días", range: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
];

export function DateRangePicker({
  value,
  onChange,
  className,
  presets = RANGE_PRESETS,
}: {
  value: { from: Date; to: Date };
  onChange: (r: { from: Date; to: Date }) => void;
  className?: string;
  presets?: RangePreset[];
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateRange | undefined>(value);


  const label = `${format(value.from, "dd MMM yyyy", { locale: es })} – ${format(value.to, "dd MMM yyyy", { locale: es })}`;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Popover
        open={open}
        onOpenChange={(o) => {
          if (o) setDraft(value);
          setOpen(o);
        }}
      >
        <PopoverTrigger
          render={<Button variant="outline" className="justify-start gap-2 font-normal" aria-label={`Rango de fechas: ${label}`} />}
        >
          <CalendarIcon className="size-4 text-muted-foreground" />
          {label}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col sm:flex-row">
            <div className="flex flex-row flex-wrap gap-1 border-b p-2 sm:w-40 sm:flex-col sm:border-r sm:border-b-0">
              {presets.map((p) => (
                <Button
                  key={p.label}
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={() => {
                    onChange(p.range());
                    setOpen(false);
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <div>
              <Calendar
                mode="range"
                locale={dayPickerEs}
                numberOfMonths={2}
                defaultMonth={value.from}
                selected={draft}
                onSelect={setDraft}
                disabled={{ after: new Date() }}
              />
              <div className="flex justify-end gap-2 border-t p-2">
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  disabled={!draft?.from}
                  onClick={() => {
                    if (!draft?.from) return;
                    onChange({ from: draft.from, to: draft.to ?? draft.from });
                    setOpen(false);
                  }}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

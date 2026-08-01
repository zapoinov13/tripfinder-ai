import { createFileRoute } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";

import { SiteLayout } from "@/components/site/site-layout";
import { TourCard } from "@/components/tours/tour-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { tours } from "@/data/demo";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Поиск туров Алматы → Дубай — Voyago" },
      {
        name: "description",
        content: "128 туров от проверенных операторов: фильтры по цене, питанию, отелю и рейтингу.",
      },
      { property: "og:title", content: "Поиск туров — Voyago" },
      { property: "og:description", content: "Сравните туры от разных операторов в одном месте." },
    ],
  }),
  component: SearchPage,
});

const filterGroups = [
  { title: "Отель", options: ["Первая линия", "Бассейн", "Детский бассейн", "Трансфер", "Spa"] },
  { title: "Звёзды", options: ["5★", "4★", "3★"] },
  { title: "Питание", options: ["Ultra All Inclusive", "All Inclusive", "Полупансион", "Завтрак"] },
  { title: "Длительность", options: ["5–7 ночей", "8–10 ночей", "11–14 ночей"] },
  { title: "Район", options: ["Jumeirah Beach", "Palm Jumeirah", "JBR", "Deira"] },
  { title: "Рейтинг", options: ["9+ Превосходно", "8+ Очень хорошо", "7+ Хорошо"] },
];

function Filters() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold">Цена</h3>
        <Slider defaultValue={[35]} max={100} className="mt-4" />
        <div className="mt-3 flex justify-between text-xs text-muted-foreground">
          <span>480 000 ₸</span>
          <span>2 400 000 ₸</span>
        </div>
      </div>
      <Separator />
      <div>
        <h3 className="text-sm font-semibold">Даты</h3>
        <div className="mt-3 rounded-2xl border border-border px-3 py-2.5 text-sm">
          10–17 августа
        </div>
      </div>
      {filterGroups.map((group) => (
        <div key={group.title}>
          <Separator className="mb-6" />
          <h3 className="text-sm font-semibold">{group.title}</h3>
          <div className="mt-3 space-y-3">
            {group.options.map((option) => (
              <div key={option} className="flex items-center gap-3">
                <Checkbox id={`${group.title}-${option}`} />
                <Label htmlFor={`${group.title}-${option}`} className="text-sm font-normal">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SearchPage() {
  return (
    <SiteLayout>
      <div className="container-page py-8">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-semibold md:text-3xl">
              Алматы → Дубай
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              10–17 августа · 2 взрослых + 2 детей
            </p>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden">
                <SlidersHorizontal className="size-4" />
                Фильтры
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
              <SheetHeader>
                <SheetTitle className="font-display">Фильтры</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-8">
                <Filters />
                <Button className="mt-6 w-full">Показать 128 туров</Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="surface-card sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto p-6">
              <h2 className="font-display text-lg font-semibold">Фильтры</h2>
              <div className="mt-6">
                <Filters />
              </div>
            </div>
          </aside>

          <div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
              <p className="truncate text-sm font-medium text-muted-foreground">Найдено 128 туров</p>
              <Select defaultValue="recommended">
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recommended">Рекомендуемые</SelectItem>
                  <SelectItem value="price-asc">Сначала дешевле</SelectItem>
                  <SelectItem value="price-desc">Сначала дороже</SelectItem>
                  <SelectItem value="rating">По рейтингу</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mt-5 space-y-5">
              {tours.slice(0, 12).map((tour) => (
                <TourCard key={tour.id} tour={tour} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
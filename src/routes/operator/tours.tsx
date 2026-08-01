import { createFileRoute } from "@tanstack/react-router";

import { DashShell } from "@/components/dash/dash-shell";
import { operatorNav } from "@/components/dash/nav-items";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber, formatPrice, getHotel, tours } from "@/data/demo";

export const Route = createFileRoute("/operator/tours")({
  head: () => ({
    meta: [
      { title: "Мои туры — кабинет туроператора | Voyago" },
      { name: "description", content: "Управляйте турами, ценами, статусами и продвижением." },
      { property: "og:title", content: "Мои туры — Voyago" },
      { property: "og:description", content: "Каталог туров вашей компании." },
    ],
  }),
  component: OperatorTours,
});

const filters = ["Все", "Активные", "Горящие", "Premium", "Продвигаемые"];

function OperatorTours() {
  return (
    <DashShell
      brand="Travel Company"
      items={operatorNav}
      title="Мои туры"
      subtitle="1 284 тура в каталоге"
      actions={<Button size="sm">+ Добавить тур</Button>}
    >
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {filters.map((filter, i) => (
          <button
            key={filter}
            type="button"
            className={
              i === 0
                ? "shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                : "shrink-0 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground"
            }
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="surface-card mt-5 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Фото</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Направление</TableHead>
                <TableHead>Цена</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Просмотры</TableHead>
                <TableHead>Брони</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tours.slice(0, 12).map((tour) => {
                const hotel = getHotel(tour.hotelId);
                return (
                  <TableRow key={tour.id}>
                    <TableCell>
                      <img
                        src={hotel.image}
                        alt={hotel.name}
                        loading="lazy"
                        className="size-12 rounded-xl object-cover"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{hotel.name}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {hotel.flag} {hotel.city}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatPrice(tour.price)}</TableCell>
                    <TableCell className="whitespace-nowrap">{tour.dateStart}</TableCell>
                    <TableCell>{formatNumber(tour.views)}</TableCell>
                    <TableCell>{tour.bookings}</TableCell>
                    <TableCell>
                      <Badge variant={tour.tags.includes("hot") ? "default" : "secondary"}>
                        {tour.tags.includes("hot") ? "Горящий" : "Активен"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Изменить
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashShell>
  );
}
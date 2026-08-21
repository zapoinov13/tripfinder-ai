import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, UserPlus } from "lucide-react";
import { useState } from "react";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/platform/auth";
import { DEMO_PASSWORD } from "@/lib/platform/seed";

export const Route = createFileRoute("/registration")({
  head: () => ({
    meta: [
      { title: "Регистрация · TourGo" },
      {
        name: "description",
        content: "Создайте аккаунт туриста или подайте заявку поставщика путешествий.",
      },
    ],
  }),
  component: RegistrationPage,
});

function RegistrationPage() {
  const { registerTourist, registerOperator } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [tourist, setTourist] = useState({
    name: "",
    city: "Алматы",
    email: "",
    password: DEMO_PASSWORD,
  });
  const [operator, setOperator] = useState({
    company: "",
    legal: "",
    registration: "",
    country: "Казахстан",
    city: "Алматы",
    address: "",
    phone: "",
    email: "",
    website: "",
    contact: "",
    password: DEMO_PASSWORD,
  });

  return (
    <SiteLayout>
      <div className="container-page py-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-3xl font-semibold md:text-4xl">Регистрация</h1>
          <Tabs defaultValue="tourist" className="mt-8">
            <TabsList>
              <TabsTrigger value="tourist">Турист</TabsTrigger>
              <TabsTrigger value="operator">Туристическая компания</TabsTrigger>
            </TabsList>

            <TabsContent value="tourist" className="surface-card mt-6 p-6 md:p-8">
              <form
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await registerTourist(tourist);
                  if (!res.ok) {
                    setError(res.error ?? "Ошибка");
                    return;
                  }
                  navigate({ to: "/profile" });
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Имя</Label>
                  <Input
                    id="name"
                    placeholder="Айгерим"
                    value={tourist.name}
                    onChange={(e) => setTourist({ ...tourist, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tourist-city">Город</Label>
                  <Input
                    id="tourist-city"
                    placeholder="Алматы"
                    value={tourist.city}
                    onChange={(e) => setTourist({ ...tourist, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="tourist-email">Email</Label>
                  <Input
                    id="tourist-email"
                    type="email"
                    placeholder="you@example.com"
                    value={tourist.email}
                    onChange={(e) => setTourist({ ...tourist, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="tourist-password">Пароль</Label>
                  <Input
                    id="tourist-password"
                    type="password"
                    value={tourist.password}
                    onChange={(e) => setTourist({ ...tourist, password: e.target.value })}
                  />
                </div>
                {error ? <p className="sm:col-span-2 text-sm text-destructive">{error}</p> : null}
                <Button className="mt-2 sm:col-span-2" type="submit">
                  <UserPlus className="size-4" />
                  Создать аккаунт
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="operator" className="surface-card mt-6 p-6 md:p-8">
              <form
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await registerOperator({
                    name: operator.contact || operator.company,
                    email: operator.email,
                    password: operator.password,
                    company: {
                      name: operator.company,
                      legalName: operator.legal || operator.company,
                      registrationNumber: operator.registration,
                      country: operator.country,
                      city: operator.city,
                      address: operator.address,
                      phone: operator.phone,
                      email: operator.email,
                      website: operator.website,
                      contactPerson: operator.contact,
                    },
                  });
                  if (!res.ok) {
                    setError(res.error ?? "Ошибка");
                    return;
                  }
                  navigate({ to: "/operator" });
                }}
              >
                {(
                  [
                    ["company", "Company name"],
                    ["legal", "Legal name"],
                    ["registration", "Registration number"],
                    ["country", "Country"],
                    ["city", "City"],
                    ["address", "Address"],
                    ["phone", "Phone"],
                    ["email", "Email"],
                    ["website", "Website"],
                    ["contact", "Contact person"],
                  ] as const
                ).map(([id, label]) => (
                  <div key={id} className="space-y-2">
                    <Label htmlFor={id}>{label}</Label>
                    <Input
                      id={id}
                      type={id === "email" ? "email" : "text"}
                      value={operator[id]}
                      onChange={(e) => setOperator({ ...operator, [id]: e.target.value })}
                    />
                  </div>
                ))}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="op-password">Пароль</Label>
                  <Input
                    id="op-password"
                    type="password"
                    value={operator.password}
                    onChange={(e) => setOperator({ ...operator, password: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2 rounded-2xl bg-secondary p-4 text-sm">
                  Статус после отправки: <span className="font-semibold">PENDING_APPROVAL</span>
                </div>
                {error ? <p className="sm:col-span-2 text-sm text-destructive">{error}</p> : null}
                <Button className="mt-2 sm:col-span-2" type="submit">
                  <Building2 className="size-4" />
                  Отправить заявку
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </SiteLayout>
  );
}

import { toast } from "sonner";

import type { NotificationService, NotificationType } from "@/lib/platform-contracts";

import { appendAudit, pushNotification, trackEvent } from "./catalog";
import { getAdapterForTour, mockPaymentProvider } from "./adapters";
import { getTour } from "./catalog";
import { getState, nowIso, setState, uid } from "./store";
import type { Booking, BookingPassenger, BookingStatus } from "./types";

export class InAppNotificationService implements NotificationService {
  async sendEmail(to: string, subject: string, body: string) {
    console.info("[NotificationService:email]", { to, subject, body });
  }

  async sendPush(userId: string, title: string, body: string) {
    console.info("[NotificationService:push]", { userId, title, body });
  }

  async sendInApp(userId: string, type: NotificationType, payload: unknown) {
    const p = (payload ?? {}) as { title?: string; body?: string };
    pushNotification(
      userId,
      type,
      p.title ?? type,
      p.body ?? "",
      payload as Record<string, unknown>,
    );
  }

  async sendSMS(phone: string, body: string) {
    console.info("[NotificationService:sms]", { phone, body });
  }
}

export const notificationService = new InAppNotificationService();

export async function createBookingFlow(input: {
  userId: string;
  tourId: string;
  passengers: BookingPassenger[];
}) {
  const tour = getTour(input.tourId);
  if (!tour) throw new Error("Тур не найден");

  trackEvent("BOOKING_STARTED", input.userId, { tourId: input.tourId });

  let booking: Booking = {
    id: uid(),
    userId: input.userId,
    operatorId: tour.operatorId,
    organizationId: tour.operatorOrgId,
    tourOfferId: tour.id,
    status: "PRICE_CHECK",
    passengers: input.passengers,
    price: tour.price,
    currency: tour.currency,
    paymentStatus: "pending",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  setState((s) => ({ ...s, bookings: [booking, ...s.bookings] }));

  const adapter = getAdapterForTour(tour.id);
  try {
    const availability = await adapter.getAvailability(tour.externalId);
    if (!availability.available) {
      updateBooking(booking.id, { status: "FAILED" });
      throw new Error("Нет мест на выбранные даты");
    }
    const price = await adapter.getPrices(tour.externalId);
    booking = updateBooking(booking.id, {
      status: "AWAITING_PAYMENT",
      price: price.price,
      currency: price.currency as Booking["currency"],
    })!;

    const payment = await mockPaymentProvider.createPayment({
      amount: booking.price,
      currency: booking.currency,
      type: "booking",
      metadata: { bookingId: booking.id },
    });

    trackEvent("PAYMENT_STARTED", input.userId, { bookingId: booking.id });

    setState((s) => ({
      ...s,
      payments: [
        {
          id: uid(),
          userId: input.userId,
          organizationId: tour.operatorOrgId,
          amount: booking.price,
          currency: booking.currency,
          type: "booking",
          provider: "mock",
          providerPaymentId: payment.providerPaymentId,
          status: "paid",
          metadata: { bookingId: booking.id },
          createdAt: nowIso(),
        },
        ...s.payments,
      ],
    }));

    trackEvent("PAYMENT_COMPLETED", input.userId, { bookingId: booking.id });
    booking = updateBooking(booking.id, {
      status: "CONFIRMING",
      paymentStatus: "paid",
    })!;

    const external = await adapter.createBooking(tour.externalId, {
      passengers: input.passengers,
    });

    booking = updateBooking(booking.id, {
      status: "CONFIRMED",
      externalBookingId: external.externalBookingId,
    })!;

    // notify tourist + operator admins
    pushNotification(
      input.userId,
      "booking",
      "Бронирование подтверждено",
      `Заявка ${booking.id} подтверждена.`,
      { bookingId: booking.id },
    );
    const opUsers = getState().users.filter((u) => u.organizationId === tour.operatorOrgId);
    opUsers.forEach((u) =>
      pushNotification(
        u.id,
        "booking",
        "Новое бронирование",
        `Тур ${tour.id}: ${booking.price} ${booking.currency}`,
        { bookingId: booking.id },
      ),
    );

    appendAudit({
      actorId: input.userId,
      action: "booking_confirmed",
      entityType: "booking",
      entityId: booking.id,
    });
    trackEvent("BOOKING_CREATED", input.userId, { bookingId: booking.id });
    toast.success("Бронирование подтверждено");
    return booking;
  } catch (e) {
    updateBooking(booking.id, { status: "FAILED", paymentStatus: "failed" });
    const message = e instanceof Error ? e.message : "Ошибка бронирования";
    toast.error(message);
    throw e;
  }
}

function updateBooking(id: string, patch: Partial<Booking>) {
  let updated: Booking | undefined;
  setState((s) => ({
    ...s,
    bookings: s.bookings.map((b) => {
      if (b.id !== id) return b;
      updated = { ...b, ...patch, updatedAt: nowIso() };
      return updated;
    }),
  }));
  return updated;
}

export function setBookingStatus(id: string, status: BookingStatus, actorId?: string) {
  updateBooking(id, { status });
  appendAudit({
    ...(actorId ? { actorId } : {}),
    action: "booking_status_change",
    entityType: "booking",
    entityId: id,
    meta: { status },
  });
}

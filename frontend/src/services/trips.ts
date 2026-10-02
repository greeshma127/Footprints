import { isAxiosError } from "axios";

export type Trip = { id: string; name: string; startDate: string; endDate: string };
export const tripLabel = (trip: Trip) => `${trip.name} (${trip.startDate} – ${trip.endDate})`;
export const apiError = (error: unknown, fallback: string) =>
  isAxiosError<{ message?: string }>(error) ? error.response?.data.message || fallback : fallback;


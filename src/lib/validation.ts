import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const tripSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  destination: z.string().trim().max(200).optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
});

export const locationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  notes: z.string().max(2000).optional().or(z.literal("")),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  visitedAt: z.string().optional().or(z.literal("")),
});

export const expenseSchema = z.object({
  category: z.string().trim().min(1, "Category is required").max(100),
  amount: z.coerce.number().positive("Amount must be positive"),
  currency: z.string().trim().min(1).max(10).default("USD"),
  note: z.string().max(500).optional().or(z.literal("")),
  spentAt: z.string().optional().or(z.literal("")),
});

import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const TRIP_MOODS = [
  { key: "amazing", emoji: "😍", label: "Amazing" },
  { key: "relaxing", emoji: "😌", label: "Relaxing" },
  { key: "adventurous", emoji: "🥾", label: "Adventurous" },
  { key: "fun", emoji: "🥳", label: "Fun" },
  { key: "romantic", emoji: "🥰", label: "Romantic" },
  { key: "exhausting", emoji: "😴", label: "Exhausting" },
  { key: "bittersweet", emoji: "🥲", label: "Bittersweet" },
  { key: "unforgettable", emoji: "🌟", label: "Unforgettable" },
] as const;

export const tripSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  destination: z.string().trim().max(200).optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
  mood: z
    .enum(TRIP_MOODS.map((m) => m.key) as [string, ...string[]])
    .optional()
    .or(z.literal("")),
});

export const locationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  notes: z.string().max(2000).optional().or(z.literal("")),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  visitedAt: z.string().optional().or(z.literal("")),
  visited: z.boolean().optional(),
});

export const GENDER_OPTIONS = [
  "female",
  "male",
  "non-binary",
  "prefer-not-to-say",
] as const;

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  birthday: z.string().optional().or(z.literal("")),
  gender: z.enum(GENDER_OPTIONS).optional().or(z.literal("")),
});

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
});

export const assistantChatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(30),
});

export const WIDGET_TYPES = [
  "trips",
  "clock",
  "photos",
  "map",
  "notes",
  "sticky",
  "travel",
  "passport",
] as const;

export const WIDGET_COLORS = [
  "slate",
  "blue",
  "pink",
  "green",
  "yellow",
  "violet",
  "teal",
  "rose",
  "indigo",
  "coral",
] as const;

export const WIDGET_STYLES = ["clean", "ink", "sketch", "frame"] as const;

export const widgetCreateSchema = z.object({
  type: z.enum(WIDGET_TYPES),
  device: z.enum(["desktop", "mobile"]).optional(),
  x: z.number().min(0).max(100).optional(),
  y: z.number().min(0).max(100).optional(),
  color: z.enum(WIDGET_COLORS).optional(),
  content: z.string().max(2000).optional(),
});

export const widgetUpdateSchema = z.object({
  x: z.number().min(0).max(100).optional(),
  y: z.number().min(0).max(100).optional(),
  w: z.number().min(120).max(600).optional(),
  h: z.number().min(100).max(600).optional(),
  rotation: z.number().min(-15).max(15).optional(),
  zIndex: z.number().int().min(1).max(1000).optional(),
  color: z.enum(WIDGET_COLORS).optional(),
  style: z.enum(WIDGET_STYLES).optional(),
  content: z.string().max(2000).optional(),
});

export const LOCATION_CARD_SIZES = ["sm", "md", "lg"] as const;

export const locationCardSchema = z.object({
  cardStyle: z.enum(WIDGET_STYLES).optional(),
  cardSize: z.enum(LOCATION_CARD_SIZES).optional(),
});

export const TRAVEL_TYPES = ["flight", "hotel", "train"] as const;

export const travelItemSchema = z.object({
  type: z.enum(TRAVEL_TYPES),
  title: z.string().trim().min(1, "Title is required").max(200),
  detail: z.string().trim().max(200).optional().or(z.literal("")),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  startAt: z.string().min(1, "Start date/time is required"),
  endAt: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

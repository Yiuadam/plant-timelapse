import TripForm from "@/components/trip-form";

export default function NewTripPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">New trip</h1>
      <TripForm mode="create" />
    </div>
  );
}

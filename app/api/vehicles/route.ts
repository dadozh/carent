import { createVehicle, listVehicles } from "@/lib/vehicle-db";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ vehicles: listVehicles() });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const vehicle = createVehicle(data);
    return Response.json({ vehicle }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create vehicle";
    return Response.json({ error: message }, { status: 400 });
  }
}

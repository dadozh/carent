import { getVehicleById, updateVehicle } from "@/lib/vehicle-db";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const vehicle = getVehicleById(id);

  if (!vehicle) {
    return Response.json({ error: "Vehicle not found" }, { status: 404 });
  }

  return Response.json({ vehicle });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const vehicle = updateVehicle(id, data);

    if (!vehicle) {
      return Response.json({ error: "Vehicle not found" }, { status: 404 });
    }

    return Response.json({ vehicle });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update vehicle";
    return Response.json({ error: message }, { status: 400 });
  }
}

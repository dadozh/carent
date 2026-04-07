import { createCustomer, listCustomers, updateCustomerImages } from "@/lib/rental-db";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ customers: listCustomers() });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const customer = createCustomer(data);
    return Response.json({ customer }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create customer";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const data = await request.json();
    const customer = updateCustomerImages(data.id, data.images ?? []);
    return Response.json({ customer });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update customer";
    const status = message === "Customer not found" ? 404 : 400;
    return Response.json({ error: message }, { status });
  }
}

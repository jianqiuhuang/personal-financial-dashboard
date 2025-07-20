import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request, { params }) {
  const { id } = params;
  const { category } = await request.json();
  try {
    await prisma.transaction.update({
      where: { id },
      data: { category },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: { date: "desc" },
      include: { account: true },
    });
    return NextResponse.json({
      transactions: transactions.map(tx => ({
        id: tx.id,
        date: tx.date,
        name: tx.name,
        amount: tx.amount,
        accountName: tx.account?.nickname || tx.account?.name || "",
        personalFinanceCategory: tx.personalFinanceCategory || "",
        merchant: tx.merchantName || "",
        paymentChannel: tx.paymentChannel || "",
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}

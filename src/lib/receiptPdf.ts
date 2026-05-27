import { jsPDF } from "jspdf";

type LineItem = {
  name: string;
  description: string | null;
  quantity: number;
  amount_total: number;
  amount_subtotal: number;
};

export type ReceiptData = {
  id: string;
  payment_intent?: string | null;
  amount_total: number;
  amount_subtotal: number;
  total_discount: number;
  currency: string;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  payment_status: string | null;
  line_items: LineItem[];
  receipt_url?: string;
  order_date?: string | null;
  pickup_address?: string | null;
  dropoff_address?: string | null;
  delivery_date?: string | null;
  delivery_time?: string | null;
};

const fmt = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
  }).format((cents ?? 0) / 100);

export function buildReceiptPdf(data: ReceiptData): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  const contentRight = pageWidth - margin;
  let y = margin;


  // ---------- Header ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(20, 20, 20);
  doc.text("PICKUP HAUL", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text("AutoBais LLC  ·  Van Nuys, CA 91405", margin, y + 14);
  doc.text("(747) 370-6885  ·  support@autobais.app", margin, y + 26);

  // Receipt label (right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(249, 115, 22); // amber
  doc.text("PAYMENT RECEIPT", contentRight, y, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  const dateStr = data.order_date
    ? data.order_date
    : new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
  doc.text(dateStr, contentRight, y + 14, { align: "right" });
  if (data.payment_status) {
    doc.text(
      `Status: ${data.payment_status.toUpperCase()}`,
      contentRight,
      y + 26,
      { align: "right" },
    );
  }

  y += 50;
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.5);
  doc.line(margin, y, contentRight, y);
  y += 24;

  // ---------- Bill To ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text("BILLED TO", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  let by = y + 14;
  if (data.customer_name) {
    doc.text(data.customer_name, margin, by);
    by += 13;
  }
  if (data.customer_email) {
    doc.text(data.customer_email, margin, by);
    by += 13;
  }
  if (data.customer_phone) {
    doc.text(data.customer_phone, margin, by);
    by += 13;
  }
  if (!data.customer_name && !data.customer_email && !data.customer_phone) {
    doc.setTextColor(150, 150, 150);
    doc.text("Guest checkout", margin, by);
    by += 13;
  }

  // Reference (right) — Order # = Stripe Payment Intent ID
  const orderNumber = data.payment_intent || data.id;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text("ORDER #", contentRight, y, { align: "right" });

  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  const orderLines = doc.splitTextToSize(orderNumber, 240);
  doc.text(orderLines, contentRight, y + 14, { align: "right" });

  let refY = y + 14 + orderLines.length * 12 + 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(130, 130, 130);
  doc.text("Session", contentRight, refY, { align: "right" });
  doc.setFont("courier", "normal");
  doc.setTextColor(90, 90, 90);
  const sessLines = doc.splitTextToSize(data.id, 240);
  doc.text(sessLines, contentRight, refY + 9, { align: "right" });
  refY += 9 + sessLines.length * 9 + 6;

  // Clickable link back to the receipt page
  if (data.receipt_url) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(249, 115, 22);
    const linkLabel = "View receipt online →";
    doc.textWithLink(linkLabel, contentRight, refY, {
      url: data.receipt_url,
      align: "right",
    });
    refY += 12;
  }

  y = Math.max(by, refY) + 10;

  // ---------- Delivery details ----------
  const hasDelivery =
    data.pickup_address || data.dropoff_address || data.delivery_date || data.delivery_time;

  if (hasDelivery) {
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y, contentRight, y);
    y += 16;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text("DELIVERY DETAILS", margin, y);
    y += 14;

    const colWidth = (contentRight - margin) / 2 - 8;

    const drawField = (label: string, value: string, x: number, lineY: number): number => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(130, 130, 130);
      doc.text(label.toUpperCase(), x, lineY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      const lines = doc.splitTextToSize(value || "—", colWidth);
      doc.text(lines, x, lineY + 12);
      return lineY + 12 + lines.length * 12 + 4;
    };

    const leftY1 = drawField("Pickup", data.pickup_address ?? "—", margin, y);
    const rightY1 = drawField(
      "Dropoff",
      data.dropoff_address ?? "—",
      margin + colWidth + 16,
      y,
    );
    y = Math.max(leftY1, rightY1) + 4;

    const formattedDate = data.delivery_date
      ? (() => {
          const d = new Date(data.delivery_date + "T00:00:00");
          return isNaN(d.getTime())
            ? (data.delivery_date as string)
            : d.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              });
        })()
      : "—";
    const leftY2 = drawField("Delivery date", formattedDate, margin, y);
    const rightY2 = drawField(
      "Expected time",
      data.delivery_time ?? "—",
      margin + colWidth + 16,
      y,
    );
    y = Math.max(leftY2, rightY2) + 6;
  }


  // ---------- Line items table ----------
  doc.setDrawColor(230, 230, 230);
  doc.line(margin, y, contentRight, y);
  y += 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text("DESCRIPTION", margin, y);
  doc.text("QTY", contentRight - 140, y, { align: "right" });
  doc.text("AMOUNT", contentRight, y, { align: "right" });
  y += 10;
  doc.line(margin, y, contentRight, y);
  y += 16;

  const mainItem = data.line_items.find(
    (li) => !li.name.toLowerCase().startsWith("add-on:"),
  );
  const addOnItems = data.line_items.filter((li) =>
    li.name.toLowerCase().startsWith("add-on:"),
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);

  const drawRow = (label: string, qty: number, amount: number, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const labelLines = doc.splitTextToSize(label, contentRight - margin - 180);
    doc.text(labelLines, margin, y);
    doc.text(String(qty), contentRight - 140, y, { align: "right" });
    doc.text(fmt(amount, data.currency), contentRight, y, { align: "right" });
    y += labelLines.length * 13 + 6;
  };

  if (mainItem) {
    drawRow(mainItem.name, mainItem.quantity, mainItem.amount_total, true);
  }

  if (addOnItems.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text("ADD-ONS", margin, y);
    y += 12;
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    for (const li of addOnItems) {
      const cleanName = li.name.replace(/^add-on:\s*/i, "");
      drawRow(cleanName, li.quantity, li.amount_total);
    }
  }

  y += 8;
  doc.setDrawColor(230, 230, 230);
  doc.line(margin, y, contentRight, y);
  y += 18;

  // ---------- Totals ----------
  const totalsX = contentRight - 200;

  const drawTotalLine = (label: string, value: string, opts?: { bold?: boolean; accent?: boolean; size?: number }) => {
    const size = opts?.size ?? 10;
    doc.setFontSize(size);
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    if (opts?.accent) doc.setTextColor(249, 115, 22);
    else doc.setTextColor(opts?.bold ? 20 : 80, opts?.bold ? 20 : 80, opts?.bold ? 20 : 80);
    doc.text(label, totalsX, y);
    doc.text(value, contentRight, y, { align: "right" });
    y += size + 6;
  };

  if (data.amount_subtotal && data.amount_subtotal !== data.amount_total) {
    drawTotalLine("Subtotal", fmt(data.amount_subtotal, data.currency));
  }
  if (data.total_discount > 0) {
    drawTotalLine(
      "Promo discount",
      `-${fmt(data.total_discount, data.currency)}`,
      { accent: true },
    );
  }

  y += 4;
  doc.setDrawColor(20, 20, 20);
  doc.setLineWidth(0.8);
  doc.line(totalsX, y, contentRight, y);
  y += 18;

  drawTotalLine("TOTAL PAID", fmt(data.amount_total, data.currency), {
    bold: true,
    size: 14,
  });

  // ---------- Footer ----------
  const footerY = doc.internal.pageSize.getHeight() - 60;
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 16, contentRight, footerY - 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text(
    "Thank you for choosing PICKUP HAUL. We'll reach out shortly to confirm scheduling.",
    margin,
    footerY,
  );
  doc.text(
    "Insured: $1M / $2M general liability  ·  Secure payment processed by Stripe",
    margin,
    footerY + 12,
  );
  doc.text("autobais.app", contentRight, footerY + 12, { align: "right" });

  return doc;
}

export function downloadReceipt(data: ReceiptData) {
  const doc = buildReceiptPdf(data);
  const filename = `pickup-haul-receipt-${data.id.slice(-10)}.pdf`;
  doc.save(filename);
}

export function printReceipt(data: ReceiptData) {
  const doc = buildReceiptPdf(data);
  doc.autoPrint();
  const blobUrl = doc.output("bloburl");
  const win = window.open(blobUrl as unknown as string, "_blank");
  if (!win) {
    // Fallback: just download if popup blocked
    downloadReceipt(data);
  }
}

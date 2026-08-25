type ReportPayment = { date: string; clientName: string; receivedFor: string; amount: number; paymentType: string };

const money = (amount: number) => amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function downloadCloseDayReportPng(input: {
  dateLabel: string;
  payments: ReportPayment[];
  leadsReceived: number;
  totalNew: number;
  totalExisting: number;
  totalRevenue: number;
  mtdReceived: number;
  mtdBooked: number;
  weeklyReceived: number;
  weeklyTarget: number;
}) {
  const paymentRows = input.payments.slice(0, 16);
  const height = 590 + paymentRows.length * 38;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const navy = "#0c1426";
  const panel = "#16233d";
  const gold = "#d8b75f";
  const ink = "#edf0f8";
  const muted = "#aab3c6";
  const green = "#54b580";
  const blue = "#5f9cd7";
  ctx.fillStyle = navy;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = gold;
  ctx.fillRect(0, 0, 12, height);
  ctx.fillStyle = ink;
  ctx.font = "700 44px Georgia";
  ctx.fillText("Graham Immigration Law, PC", 60, 78);
  ctx.fillStyle = gold;
  ctx.font = "600 22px Arial";
  ctx.fillText("DAILY REVENUE REPORT", 60, 116);
  ctx.fillStyle = muted;
  ctx.font = "20px Arial";
  ctx.fillText(input.dateLabel, 60, 150);

  const drawStat = (x: number, y: number, label: string, value: string, accent: string) => {
    ctx.fillStyle = panel;
    ctx.fillRect(x, y, 300, 112);
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, 5, 112);
    ctx.fillStyle = muted;
    ctx.font = "600 16px Arial";
    ctx.fillText(label.toUpperCase(), x + 22, y + 34);
    ctx.fillStyle = ink;
    ctx.font = "700 31px Arial";
    ctx.fillText(value, x + 22, y + 79);
  };
  drawStat(60, 185, "Total received", money(input.totalRevenue), gold);
  drawStat(390, 185, "New client", money(input.totalNew), green);
  drawStat(720, 185, "Existing client", money(input.totalExisting), blue);

  ctx.fillStyle = panel;
  ctx.fillRect(60, 322, 960, 112);
  ctx.fillStyle = gold;
  ctx.font = "600 16px Arial";
  ctx.fillText("MONTH-TO-DATE", 84, 354);
  ctx.fillStyle = ink;
  ctx.font = "700 28px Arial";
  ctx.fillText(`Received ${money(input.mtdReceived)}   •   Booked ${money(input.mtdBooked)}`, 84, 395);
  ctx.fillStyle = muted;
  ctx.font = "18px Arial";
  ctx.fillText(`Weekly received ${money(input.weeklyReceived)} of ${money(input.weeklyTarget)} target   •   ${input.leadsReceived} lead${input.leadsReceived === 1 ? "" : "s"} received today`, 84, 420);

  let y = 480;
  ctx.fillStyle = gold;
  ctx.font = "700 18px Arial";
  ctx.fillText("PAYMENT DETAIL", 60, y);
  y += 30;
  ctx.fillStyle = muted;
  ctx.font = "600 14px Arial";
  ctx.fillText("CLIENT / RECEIVED FOR", 60, y);
  ctx.fillText("TYPE", 750, y);
  ctx.textAlign = "right";
  ctx.fillText("AMOUNT", 1020, y);
  ctx.textAlign = "left";
  y += 14;
  ctx.fillStyle = "#293753";
  ctx.fillRect(60, y, 960, 1);
  y += 28;
  paymentRows.forEach(payment => {
    ctx.fillStyle = ink;
    ctx.font = "600 16px Arial";
    const description = `${payment.clientName} — ${payment.receivedFor || "Payment"}`;
    ctx.fillText(description.length > 72 ? `${description.slice(0, 69)}…` : description, 60, y);
    ctx.fillStyle = muted;
    ctx.font = "14px Arial";
    ctx.fillText(payment.paymentType === "New Client" ? "NEW" : "EXISTING", 750, y);
    ctx.fillStyle = gold;
    ctx.font = "700 16px Arial";
    ctx.textAlign = "right";
    ctx.fillText(money(payment.amount), 1020, y);
    ctx.textAlign = "left";
    y += 38;
  });
  if (input.payments.length > paymentRows.length) {
    ctx.fillStyle = muted;
    ctx.font = "14px Arial";
    ctx.fillText(`+ ${input.payments.length - paymentRows.length} additional payment(s) in CRM`, 60, y);
  }

  const link = document.createElement("a");
  link.download = `close-day-${input.dateLabel.replace(/[^0-9]/g, "")}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

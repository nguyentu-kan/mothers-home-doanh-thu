import nodemailer from "nodemailer";

function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

function formatVnd(amount: number) {
  return amount.toLocaleString("vi-VN") + "đ";
}

export async function sendCashDangerEmail(toEmail: string, amount: number) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("SMTP chưa cấu hình — bỏ qua gửi email cảnh báo tiền mặt.");
    return;
  }
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: toEmail,
    subject: `🔴 Cảnh báo: Tiền mặt tại quầy vượt hạn mức (${formatVnd(amount)})`,
    text: `Tiền mặt tại quầy hiện đang là ${formatVnd(
      amount
    )}, đã vượt hạn mức cho phép. Vui lòng nộp ngân hàng trong ngày.\n\nEmail này được gửi tự động từ app Sổ Thu Chi Mother's Home.`,
    html: `<p>Tiền mặt tại quầy hiện đang là <b>${formatVnd(
      amount
    )}</b>, đã vượt hạn mức cho phép.</p><p><b>Vui lòng nộp ngân hàng trong ngày.</b></p><p style="color:#888;font-size:12px">Email này được gửi tự động từ app Sổ Thu Chi Mother's Home.</p>`,
  });
}

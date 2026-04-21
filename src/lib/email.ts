import nodemailer from "nodemailer";

interface SendMailOptions {
    to: string;
    subject: string;
    html: string;
}

// In a real production app, configure these via environment variables.
// For development, we'll use a mocked Ethereal account, or if credentials are provided, use them.
export const sendEmail = async (options: SendMailOptions) => {
    // We use a console fallback for local development if no actual SMTP is setup
    const user = process.env.SMTP_USER || "test";
    const pass = process.env.SMTP_PASS || "test";

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.ethereal.email",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
        auth: {
            user,
            pass,
        },
    });

    if (user === "test") {
        console.log("===============================");
        console.log("MOCK EMAIL SENT TO:", options.to);
        console.log("SUBJECT:", options.subject);
        console.log("HTML:", options.html);
        console.log("===============================");
        return { messageId: "mock-id-123" };
    }

    const info = await transporter.sendMail({
        from: '"Private 3D Warehouse" <noreply@uipsulawesi.co.id>',
        to: options.to,
        subject: options.subject,
        html: options.html,
    });

    console.log("Message sent: %s", info.messageId);
    return info;
};

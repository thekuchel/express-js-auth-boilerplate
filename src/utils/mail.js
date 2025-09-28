import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendResetEmail = async (to, resetLink) => {
    const mailOptions = {
        from: process.env.FROM_EMAIL,
        to,
        subject: "Password reset request",
        html: `
        <p>Kami menerima permintaan reset password. Klik link ini untuk mengganti password (berlaku 1 jam):</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>Jika bukan Anda, abaikan email ini.</p>
        `,
    };

    const info = await transporter.sendMail(mailOptions);
    // for dev tests, log message id / preview url (ethereal)
    console.log("Reset email sent:", info.messageId);
    return info;
};

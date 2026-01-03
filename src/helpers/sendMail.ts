import nodemailer from 'nodemailer';

export const sendMail = async (
    email: string,
    subject: string,
    html: string
): Promise<void> => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        const mailOptions = {
            from: `TechVN <${process.env.EMAIL_USER}>`,
            to: email,
            subject: subject,
            html: html,
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}
   
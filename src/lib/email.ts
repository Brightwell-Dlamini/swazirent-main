import { Resend } from 'resend'

// Check if API key exists
const RESEND_API_KEY = process.env.RESEND_API_KEY

if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Email functionality will be disabled.')
}

// Initialize Resend only if API key exists
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

export async function sendEmail({
    to,
    subject,
    html,
}: {
    to: string
    subject: string
    html: string
}) {
    // Skip email sending if Resend is not configured
    if (!resend) {
        console.log('Email sending skipped: RESEND_API_KEY not configured')
        return { success: false, skipped: true }
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'SwaziRent <noreply@yourdomain.com>', // Update this with your verified domain
            to: [to],
            subject: subject,
            html: html,
        })

        if (error) {
            console.error('Error sending email:', error)
            return { success: false, error }
        }

        return { success: true, data }
    } catch (error) {
        console.error('Error sending email:', error)
        return { success: false, error }
    }
}
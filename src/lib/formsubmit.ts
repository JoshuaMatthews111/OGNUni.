// FormSubmit.co backup email delivery.
//
// FormSubmit can't send arbitrary emails, but its _autoresponse feature
// delivers a custom message to the address in the "email" field. We use that
// to reach the student when SendGrid is unavailable. Each send also drops a
// copy of the submission into the OGN inbox below (built-in admin notice).
//
// NOTE: the endpoint must be activated once — FormSubmit emails an activation
// link to OGN_INBOX on first use.

const OGN_INBOX = 'joshuamatthews@overcomersglobalnetwork.com'
const ENDPOINT = `https://formsubmit.co/ajax/${OGN_INBOX}`

export interface FormSubmitParams {
  toEmail: string
  toName?: string
  subject: string
  message: string // plain text body delivered to the student
}

export async function sendViaFormSubmit({ toEmail, toName, subject, message }: FormSubmitParams): Promise<boolean> {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // FormSubmit rejects requests without a web origin
        Origin: 'https://www.ognuniversity.com',
        Referer: 'https://www.ognuniversity.com/',
      },
      body: JSON.stringify({
        name: toName || toEmail,
        email: toEmail,
        message: `[OGN University auto-mail] ${subject} — sent to ${toEmail}`,
        _subject: `[OGN University] ${subject}`,
        _template: 'table',
        _captcha: 'false',
        _autoresponse: `OGN UNIVERSITY — EDUCATE • EQUIP • EVOLVE\n\n${message}`,
      }),
    })
    const data = await res.json().catch(() => null)
    return res.ok && data?.success !== 'false' && data?.success !== false
  } catch {
    return false
  }
}

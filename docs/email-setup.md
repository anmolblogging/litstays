# Enquiry emails

The home page enquiry form ("Tell us what you have in mind") posts to `/api/enquiry`, which emails the enquiry with Nodemailer through Gmail. Before sending, the server checks the chosen villa's dates against the bookings calendar again and refuses booked nights. If email is not set up or Gmail refuses, the visitor gets the previous fallback: a prepared message to copy and send on Instagram.

## Setup (one time)

1. Sign in to the Gmail account that should send the emails (e.g. the Lit Stays account) and turn on **2-Step Verification** (Google Account → Security). App passwords need it.
2. Open **Google Account → Security → App passwords** (or go to myaccount.google.com/apppasswords), create one named "Lit Stays website" and copy the 16-character password. It is shown only once.
3. In **Vercel → Project → Settings → Environment Variables** add:

   | Variable | Type | Value |
   | --- | --- | --- |
   | `GMAIL_USER` | Config | the Gmail address |
   | `GMAIL_APP_PASSWORD` | Secret | the 16-character app password |
   | `ENQUIRY_TO_EMAIL` | Config (optional) | another inbox to receive enquiries; defaults to `GMAIL_USER` |

4. Redeploy.

Each email has the villa, dates, number of nights, guests, budget, food preference and message. When the guest gave an email address, **Reply** goes straight to them.

To stop the website sending email, delete the app password in the Google account; the form then falls back to the copy-and-send message.

## Protection

Server-side validation (same rules as the form, plus per-villa guest limits), a hidden field that catches simple bots, 5 enquiries per visitor per 10 minutes, a 16 KB size limit, and no user text in email headers except a sanitised name in the subject.

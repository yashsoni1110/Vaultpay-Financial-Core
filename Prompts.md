# AI Transparency Document (Prompts.md)

Below are the exact scenarios where I used AI, along with the prompts I used to get the logic.

---

### 1. Formatting the PDFKit Buffer for Express `res` Object
**The Problem:** I needed to generate a PDF invoice using `pdfkit`. Initially, I was saving it to the server's disk and then using `res.download()`, but that felt inefficient and bloated the server. I wanted to stream the PDF directly from memory to the browser.
**My Prompt:** 
> *"I am building an Express backend and using the `pdfkit` library to generate an invoice. I don't want to save the PDF to my local file system. How do I pipe the `pdfkit` document directly into the Express `res` object so that the browser treats it as a downloadable file named 'invoice.pdf'?"*

**How I used the response:** The AI provided the specific HTTP headers needed (`Content-Type: application/pdf` and `Content-Disposition: attachment`) and showed me how to use `doc.pipe(res)` instead of piping to `fs.createWriteStream`. I integrated this logic into my `downloadInvoicePdf` controller.

---

### 2. Stripe Webhook Signature Verification (Raw Body Issue)
**The Problem:** I set up my Stripe Webhook endpoint, but `stripe.webhooks.constructEvent()` kept throwing a signature mismatch error. I realized it was because my global `express.json()` middleware was parsing the body into an object before Stripe could read the raw Buffer.
**My Prompt:**
> *"I'm setting up a Stripe Webhook in Express. Stripe says it needs the raw body to verify the signature, but my app uses a global `express.json()` middleware at the top of my app.js. How do I bypass the JSON parser and extract the raw body just for the webhook route so `stripe.webhooks.constructEvent()` doesn't fail?"*

**How I used the response:** The AI showed me how to use `express.raw({ type: 'application/json' })` specifically on the webhook route *before* the global JSON parser hits it. It also provided the standard `try/catch` block for handling the `stripe.errors.SignatureVerificationError`.

---

### 3. Preventing Double-Charges with Stripe Idempotency
**The Problem:** In my React frontend, if a user clicked the "Pay Invoice" button twice really fast before the state could update, it would fire off two requests to create a Stripe Checkout session.
**My Prompt:**
> *"What is the best practice for preventing double-charges in Stripe if a user double-clicks the pay button on the frontend? Can I handle this on the backend?"*

**How I used the response:** The AI explained the concept of Stripe's `Idempotency-Key` header. I implemented this by passing the unique MongoDB `invoice._id` as the idempotency key in the Stripe Checkout creation options. This guarantees that no matter how many times the client hits the endpoint, Stripe will only create one checkout session for that specific invoice.

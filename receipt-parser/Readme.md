# Receipt Parser

> Time spent: ~4 hours (1.5h backend, 1.5h frontend, 1h API setup + README)

---

## Setup

```bash
# 1. Install all dependencies
npm install
npm run install:all

# 2. Create your env file
cp server/.env.example server/.env
# Open server/.env and add your OpenRouter API key

# 3. Start the app
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

**Environment variables** (see `server/.env.example`):

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | Yes | Free key at openrouter.ai/keys |
| `PORT` | No | Backend port, defaults to 3000 |

---

## What did I build?

I built a receipt parsing tool that treats extraction as probabilistic and correction as deterministic.

You upload a photo, the model reads it and returns structured data: merchant, date, line items, total. The app then flags fields it is not confident about, auto-focuses the first suspicious one, and checks whether the line items actually add up to the stated total. Every field is editable inline. When you save, the corrected version goes to SQLite. The backend intentionally separates extraction, sanitation, validation, and warning derivation into distinct stages so failures stay observable and recoverable.

---

## Biggest tradeoffs

**1. I optimized for reducing correction friction instead of maximizing extraction accuracy.**

Receipts are messy. Models are inconsistent. I designed the app around that assumption. The inline edit flow, auto-focus on flagged fields, and reconciliation check took more time than the prompt itself. That was a deliberate choice: a flagged field takes a few seconds to fix. A confusing correction flow costs every user every time.

**2. When the model returns broken output, I show a partial result instead of retrying.**

If the response fails to parse, the app attempts minimal sanitation: stripping markdown fences, removing trailing commas, re-parsing. If that still fails, it returns whatever fields it could recover with a warning banner. Retrying costs time and money. The user is reviewing the output anyway. A partial result with honest warnings is more useful than a blank screen.

**3. I flag suspicious fields using simple rules instead of model-reported confidence.**

Models are not reliable at knowing when they are wrong. So the app runs its own checks after parsing: empty fields, future dates, amounts that do not add up. These are predictable and honest. A flag means something specific. A model confidence score of 0.6 does not.

**4. I store the raw model response and the corrected version separately.**

The database keeps three columns: raw model response, parsed result, and what the user saved. This costs nothing now but lets you later compare them to find what the model gets wrong most often. If you only store the final version, that signal is gone.

---

## Where did I use an LLM?

- **OpenRouter (Baidu Qianfan OCR)** for receipt extraction. I used it to read receipt images and return structured JSON. I picked it because it performed well on receipts during testing and OpenRouter made it easy to swap models quickly.
- **Claude** for prompt iteration. Most of the iteration was around getting consistent JSON output, reducing hallucinated fields, and handling malformed responses cleanly.
- **Claude and Codex** to accelerate implementation work: Hono setup, Vite and TypeScript configuration, React scaffolding,  CSS/UI work, and boilerplate code.

I used LLMs heavily to move faster on setup and repetitive implementation work. The parts I spent the most time thinking through myself were the product and system decisions: separating extraction from validation, storing raw vs corrected outputs, deriving warnings deterministically, handling malformed model output gracefully, and designing the correction flow around human review instead of assuming perfect extraction.

---

## What would I do with another week?

1. **Add a review status to each receipt.** Right now a receipt is either new or saved. A real workflow needs three states: not reviewed, reviewed unchanged, corrected. This matters for any team using the tool operationally.

2. **Use the stored data to improve the prompt.** The app already saves both the raw model response and the user's corrections. Diffing them automatically would show which fields fail most often and on which receipt formats. That lets you fix the prompt with real evidence instead of guessing.

3. **Batch upload.** Most real use cases involve a folder of receipts, not one at a time. The backend already handles multiple rows. The frontend just needs a queue.

---

## One thing I would push back on

The spec puts a lot of weight on extraction quality and model choice. I think that is the wrong thing to optimize for. In practice, receipts will always have edge cases: blurry photos, handwritten tips, unusual formats. I would optimize for correction throughput instead. If a user can reliably verify and fix a receipt in 10 seconds, the system is operationally useful even when extraction is imperfect. The spec says the correction flow is the most important part. I agree, but I would go further: it is not a fallback for when the model fails. It is the product.

---

## Screenshots


![Screenshot1](/Users/nakshatravijaythange/handa uncle /receipt-parser/Screenshot 2026-05-06 at 11.10.03 PM.png)

## Project structure

```
/
├── package.json              # npm run dev starts both server and client
├── server/
│   ├── index.ts              
│   ├── schemas/receipt.ts    
│   ├── services/
│   │   ├── prompt.ts        
│   │   └── parseReceipt.ts   
│   ├── db/database.ts        
│   └── routes/
│       ├── parse.ts         
│       └── receipts.ts       
└── client/src/
    ├── lib/api.ts            
    ├── components/
    │   ├── InlineField.tsx       
    │   ├── LineItemsTable.tsx     
    │   ├── ReconciliationBar.tsx 
    │   ├── ParseWarningBanner.tsx 
    │   ├── ParseSkeleton.tsx      
    │   └── UploadZone.tsx         
    └── pages/
        ├── UploadPage.tsx   
        ├── EditPage.tsx      
        └── ReceiptsPage.tsx 
```
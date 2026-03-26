# WrongAddy — Legal & Compliance Master Document
*Last updated: March 2026 | Australian law*

---

## STATUS LEGEND
- ✅ CLEAR — no action required
- ⚠️ GAP — action required before launch
- ❌ MISSING — does not exist yet
- 🔴 IMMEDIATE — do before writing any code
- 🟡 PRE-LAUNCH — do before first real user
- 🟠 PRE-REVENUE — do before first paying customer

---

## PRIORITY ACTION CHECKLIST

| Status | Priority | Action | Effort | Done? |
|---|---|---|---|---|
| ❌ | 🔴 | Register ABN at abr.business.gov.au | 30 min | [ ] |
| ❌ | 🔴 | Set Supabase region to Sydney (ap-southeast-2) | 10 min | [ ] |
| ❌ | 🔴 | Register "WrongAddy" business name with ASIC (~$44/yr) | 30 min | [ ] |
| ⚠️ | 🔴 | Update email template to qualify as DCEM (see Section 4) | 1 hr | [ ] |
| ❌ | 🟡 | Draft one-page property manager terms of service (see Section 6) | 2 hrs | [ ] |
| ❌ | 🟡 | Add WhatsApp collection notice on first message (see Section 2) | 1 hr | [ ] |
| ❌ | 🟡 | Sign DPAs with Anthropic, Meta, Resend, Lob.com | 2 hrs | [ ] |
| ⚠️ | 🟡 | Update privacy statement with overseas processing disclosure | 1 hr | [ ] |
| ❌ | 🟡 | Add ABN to every outbound email | 30 min | [ ] |
| ❌ | 🟠 | Write one-page data breach response plan (see Section 5) | 2 hrs | [ ] |
| ⚠️ | 🟠 | Add automated decision-making disclosure to privacy policy | 1 hr | [ ] |

---

## SECTION 1 — Mail Law
**Legislation:** Criminal Code Act 1995 (Cth), Division 471 — Postal Offences
**Status:** ✅ CLEAR — with one required action

### What WrongAddy does (all legal)
- Photographs the exterior of delivered mail — legal
- Reads addresses visible on the outside of an envelope — legal (public-facing information)
- Does not open, destroy, redirect, or tamper with the physical item — legal
- Returns mail via normal "return to sender" process — legal

### Key legal point
The law requires **dishonest or fraudulent intent** for criminal liability. WrongAddy never touches the mail. The property manager photographs it. WrongAddy is the technology processor. This structural separation is a strong legal protection.

### Required action
Add this clause to property manager terms of service:

> *"Users must not open, damage, or dispose of any mail item. WrongAddy processes only exterior envelope information photographed by the property manager. The property manager remains responsible for handling the physical mail lawfully, including returning it to the postal system marked 'Return to Sender'."*

---

## SECTION 2 — Privacy Act 1988 + 2024 Amendments
**Legislation:** Privacy Act 1988 (Cth), Australian Privacy Principles (APPs), Privacy and Other Legislation Amendment Act 2024
**Status:** ⚠️ MOSTLY FINE — gaps to address

### Current position
- Small businesses under $3M annual turnover are generally exempt from the Privacy Act
- WrongAddy at MVP stage is almost certainly below this threshold

### Why not to rely on the exemption
1. If property manager agencies you serve are covered by the Privacy Act, you may be treated as a contracted service provider subject to APP obligations regardless of your turnover
2. The new statutory tort for serious invasions of privacy (effective June 2025) applies to **everyone** — not just APP entities — regardless of turnover
3. The 2024 reforms signal direction of travel; building good habits now is free

### What the current data handling statement gets right ✅
- States purpose of collection clearly
- States retention periods (90 days photos, 24 months structured data)
- States who data is shared with
- Provides privacy@wrongaddy.com contact for access/deletion requests

### Gaps to fix

**Gap 1 — Collection notice at point of capture**
Property managers must be notified at the point they first send a photo.

Add this automated WhatsApp reply on first message from a new number:

> *"Welcome to WrongAddy. By sending envelope photos, you agree that address data will be processed and stored per our privacy policy at wrongaddy.com/privacy. Reply STOP at any time to deactivate your account."*

**Gap 2 — Former tenant name is personal information**
The recipient's name on the envelope belongs to a real person who hasn't consented. Add to privacy policy:

> *"We collect recipient names solely to identify who the mail item relates to. This information is deleted along with the envelope photograph after 90 days and is never used for any other purpose."*

**Gap 3 — Automated decision-making disclosure (required by December 2026)**
Claude Vision makes decisions about data extraction and manual review routing. Add before December 2026:

> *"WrongAddy uses automated image analysis to extract address information from envelope photographs. Where confidence in extraction is low, items are flagged for manual review. No automated decisions are made about individuals' rights or entitlements."*

---

## SECTION 3 — Cross-Border Data (APP 8)
**Legislation:** Privacy Act 1988, APP 8, Privacy and Other Legislation Amendment Act 2024
**Status:** ⚠️ SIGNIFICANT GAP — address immediately

### The problem
Every API call in the stack sends Australian personal data overseas. Under 2024 reforms, WrongAddy remains legally responsible for how overseas providers handle this data, even when processed by widely used platforms. Contracts are necessary but no longer sufficient — ongoing accountability is required.

### Data flows map

| Service | Country | Personal Data Transmitted | DPA Available? |
|---|---|---|---|
| Anthropic Claude API | USA | Envelope photo (names + addresses) | Yes — sign it |
| Meta WhatsApp Cloud API | USA | Phone numbers, message content | Yes — sign it |
| Resend | USA | Sender names and email addresses | Yes — sign it |
| Lob.com | USA | Full postal addresses for letters | Yes — sign it |
| Supabase | **Set to Sydney ap-southeast-2** | All structured data | Yes — built in |

### Required actions

**Immediate — set Supabase to Australian region**
In Supabase dashboard: Settings → General → Region → ap-southeast-2 (Sydney)
This keeps the database — the most valuable long-term asset — onshore.

**Before first user — sign DPAs**
- Anthropic: console.anthropic.com → Settings → Data Processing Agreement
- Meta: business.facebook.com → Data Processing Terms
- Resend: resend.com → Settings → Legal
- Lob.com: lob.com → Settings → Data Processing Agreement

**Update privacy statement — add this paragraph:**

> *"To operate our service, envelope image data is processed by the following overseas service providers under data processing agreements: Anthropic Inc. (AI analysis, USA), Meta Platforms Inc. (WhatsApp messaging infrastructure, USA), Resend Inc. (email delivery, USA), Lob Inc. (physical letter delivery, USA). Structured address data is stored in Australia (Sydney). Each provider is contractually bound to handle data in accordance with Australian privacy obligations."*

---

## SECTION 4 — Spam Act 2003
**Legislation:** Spam Act 2003 (Cth), Spam Regulations 2021, enforced by ACMA
**Status:** ⚠️ CRITICAL — email template must be revised before sending

### The key question
Are WrongAddy's notification emails to senders "commercial electronic messages" under the Spam Act?

### The answer
No — they qualify as **Designated Commercial Electronic Messages (DCEMs)** provided they:
- Contain only factual information
- Include no commercial offer, promotion, or call to action
- Clearly identify the sender
- Include valid contact details

DCEMs do not require recipient consent and do not require an unsubscribe link.

### Current template problem
The line "WrongAddy Notification Service [Unsubscribe / contact link]" risks making the message look commercial. The unsubscribe link implies it's a marketing communication. Remove it.

### Approved email template (DCEM-compliant)

```
Subject: Mail Delivery Notice — [Delivery Address]

This is an automated notification sent on behalf of the 
property manager at [Delivery Address], [Suburb] [State] [Postcode].

A piece of mail addressed to [Recipient Name] was recently 
received at this address. [Recipient Name] no longer resides 
at this location. Please update your records accordingly.

This message is a factual notification only and contains no 
commercial offer. If received in error, please disregard.

Sent by: WrongAddy Pty Ltd
ABN: [ABN — required before any email is sent]
Contact: admin@wrongaddy.com
Address: [Registered business address]
```

### ACMA compliance requirements for every outbound email
- [ ] Business name clearly identified
- [ ] ABN included
- [ ] Contact email included
- [ ] Contact details valid for minimum 30 days after send
- [ ] No commercial offer or promotion
- [ ] No misleading subject line

---

## SECTION 5 — Notifiable Data Breaches Scheme
**Legislation:** Privacy Act 1988, Part IIIC — Notifiable Data Breaches
**Status:** ⚠️ PLAN NEEDED before first real user

### Current position
NDB scheme formally applies to APP entities (businesses over $3M turnover). WrongAddy is likely exempt at MVP. However institutional customers (banks, telcos) will ask for this during due diligence.

### One-page breach response plan (template — customise and save internally)

**Step 1 — Detection**
Who is responsible for monitoring: [Name/Role]
How breaches would be detected: Supabase alerts, Railway logs, user reports

**Step 2 — Assessment (within 30 days of suspecting a breach)**
- What data was accessed or disclosed?
- How many individuals affected?
- Is serious harm to affected individuals likely?
- Document assessment in writing

**Step 3 — Containment**
- Revoke compromised API keys immediately
- Reset Supabase service role key
- Disable affected WhatsApp webhook if message content exposed

**Step 4 — Notification (if eligible breach)**
- Notify affected property managers directly via WhatsApp/email within 72 hours
- Notify OAIC at oaic.gov.au/privacy/notifiable-data-breaches if formally covered
- Post public statement on wrongaddy.com/security if individuals cannot be contacted directly

**Step 5 — Remediation**
- Patch the vulnerability
- Review and update security controls
- Document everything

---

## SECTION 6 — Property Manager Terms of Service
**Status:** ❌ DOES NOT EXIST — required before first real user

### Minimum required clauses

Draft these as a plain-language document linked from WhatsApp onboarding message.

**1. Service description**
WrongAddy processes photographs of envelope exteriors submitted via WhatsApp to identify misdelivered mail and notify original senders.

**2. User obligations**
> You must not submit photographs of mail items that have been opened, damaged, or disposed of. You confirm that you are an authorised property manager or agent for the property at the delivery address shown on submitted envelopes. You remain responsible for handling physical mail lawfully under Australian postal law.

**3. Data processing authorisation**
> By using WrongAddy, you authorise WrongAddy Pty Ltd to process envelope images and extracted address data on your behalf in accordance with our Privacy Policy at wrongaddy.com/privacy.

**4. Limitation of liability**
> WrongAddy is not responsible for actions taken by original senders upon receiving notifications. WrongAddy does not guarantee that senders will update their records or cease sending mail to the address.

**5. Data retention**
> Envelope photographs are deleted after 90 days. Structured address data is retained for up to 24 months.

**6. Termination**
> Reply STOP to your WrongAddy WhatsApp number at any time to deactivate your account. Upon request, we will delete all personal data associated with your account within 30 days.

**7. Governing law**
> These terms are governed by the laws of New South Wales, Australia.

---

## SECTION 7 — Business Registration
**Status:** ❌ MISSING — required before any commercial activity

### Required registrations

| Registration | Where | Cost | Required By |
|---|---|---|---|
| ABN | abr.business.gov.au | Free | Before first email sent |
| Business name "WrongAddy" | asic.gov.au | ~$44/yr | Before operating commercially |
| Domain email admin@wrongaddy.com | Cloudflare/Google Workspace | ~$6/mo | Before first notification sent |
| Domain email privacy@wrongaddy.com | Same as above | Included | Before publishing privacy policy |

### Optional but recommended
- **Trademark search:** IP Australia (ipaustralia.gov.au) — search "WrongAddy" before investing significantly in the brand
- **Company registration (Pty Ltd):** ASIC — recommended before signing any agreements with property management agencies or institutional partners. Sole trader structure is fine for initial testing only.

---

## SECTION 8 — What Is Already Done Well

The following elements of the current architecture and data handling statement are genuinely strong and require no changes:

| Element | Why It's Good |
|---|---|
| 90-day photo deletion | Limits liability; reduces data footprint; defensible to regulators |
| Supabase Row Level Security | Access controls built into database layer |
| `ai_raw_response JSONB` audit field | Creates full audit trail for any regulatory inquiry |
| Confidence threshold + manual review flag | Demonstrates human oversight of automated decisions — relevant to Dec 2026 disclosure requirement |
| Written data handling statement exists | Most MVPs launch with nothing |
| Privacy contact email specified | Required by APP 1 |

---

## SECTION 9 — Key Contacts & Resources

| Purpose | URL |
|---|---|
| ABN registration | abr.business.gov.au |
| ASIC business name registration | asic.gov.au/online-services/registers |
| OAIC privacy guidance | oaic.gov.au/privacy |
| OAIC data breach notification | oaic.gov.au/privacy/notifiable-data-breaches |
| ACMA spam compliance | acma.gov.au/avoid-sending-spam |
| Anthropic DPA | console.anthropic.com |
| Meta data processing terms | business.facebook.com |
| Supabase region settings | app.supabase.com → Settings → General |

---

## SECTION 10 — Version History

| Date | Change | Author |
|---|---|---|
| March 2026 | Initial document created | WrongAddy founding |

---

*This document is a working compliance reference, not legal advice. Consult an Australian privacy lawyer before signing institutional data agreements or processing data at scale.*

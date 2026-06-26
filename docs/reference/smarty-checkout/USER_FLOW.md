# Smarty.cz Checkout Reference Flow For FlipFlop

## Purpose

This reference captures the owner-provided Smarty.cz checkout screenshots as a UX benchmark for FlipFlop checkout modernization. Use it to reproduce the customer journey structure and interaction quality with FlipFlop branding, product data, copy, icons, and legal/payment contracts. Do not copy Smarty.cz logos, mascot artwork, proprietary source code, product photos, or protected presentation verbatim.

## Live Source Check

- Reference URL supplied by owner: `https://www.smarty.cz/Objednavka/Zbozi?id=9290272&productId=203750&fullPriceWithGifts=null&individualOffer=null&isWithoutGiftsFlex=null`.
- Automated `curl` inspection on 2026-06-26 returned Cloudflare HTTP 403, so this document is based on the owner screenshots and visible browser states.
- Screenshots are stored in `docs/reference/smarty-checkout/screenshots/`.

## User Flow

1. Product is added to cart and the user lands on an added-to-cart confirmation page.
2. The confirmation page shows the added product, price, VAT-excluded price, stock state, and two actions: continue shopping or go to cart.
3. Below the confirmation is accessory upsell grouped by categories with a side rail, product cards, color swatches, and add-to-cart buttons.
4. While scrolling accessory upsell, the store header remains compact/sticky and a bottom sticky bar repeats the added product summary and checkout actions.
5. Cart contents page shows purchase/rental tabs, line item controls, quantity stepper, removal, warranty/service upsells, return guarantee, voucher entry, and a sticky order summary.
6. Checkout step 2 uses a simplified header, support contacts, and progress tracker: cart complete, delivery/payment active, personal data pending.
7. Delivery selection offers pickup/store/box/courier rows with checkbox, icon, help affordance, and price. Missing selection marks the section with red border and specific error copy.
8. Expedition is selected separately from delivery and records one-shipment timing.
9. Payment selection offers in-store payment, installments, mobile QR/banking, rental, proforma invoice, card, and deferred payment options.
10. Optional delivery-in-another-day appears as a checkbox below payment. Exact date-picker behavior is [UNKNOWN].
11. Optional operator/courier tip block appears after valid delivery/payment choices.
12. Delivery details step shows optional login prompt, then guest contact fields, billing address fields, optional different delivery address, note, and optional account creation checkbox.
13. If account creation is selected, password and password confirmation fields appear. If not selected, guest checkout continues without registration.
14. Final CTA communicates legal payment obligation.
15. Completion page confirms invoice/payment instructions were sent by email, shows delivery estimate, payment instructions, copy icons, order detail, support contacts, and customer-line load.
16. FlipFlop addition: the bank-transfer/proforma payment instruction panel must include a QR payment code.

## Screenshot Inventory

| Screenshot | File | Required FlipFlop implementation notes |
| --- | --- | --- |
| 01 | `screenshots/01-add-to-cart-accessory-upsell-top.png` | Added-to-cart confirmation, product summary, primary/secondary actions, accessory upsell start. |
| 02 | `screenshots/02-add-to-cart-sticky-upsell-bottom.png` | Sticky bottom selected-product bar during upsell browsing, active accessory category rail, product cards. |
| 03 | `screenshots/03-cart-services-summary.png` | Cart item management, service/warranty upsells, return guarantee, order summary, voucher affordance. |
| 04 | `screenshots/04-delivery-payment-options.png` | Simplified checkout shell, three-step progress, delivery options, sticky summary. |
| 05 | `screenshots/05-delivery-validation-error.png` | Missing-delivery validation state with red section border and explicit copy. |
| 06 | `screenshots/06-expedition-payment-options.png` | Expedition block, payment options, deliver-another-day checkbox. |
| 07 | `screenshots/07-selected-delivery-payment-operator-tip.png` | Collapsed selected delivery/payment rows, operator-tip options, updated total. |
| 08 | `screenshots/08-delivery-details-contact-form.png` | Guest contact form with optional login prompt and persistent summary. |
| 09 | `screenshots/09-registration-fields-order-submit.png` | Optional account checkbox, password fields, legal final CTA, terms/privacy copy. |
| 10 | `screenshots/10-filled-address-registration.png` | Valid address and optional registration field state with green checkmarks. |
| 11 | `screenshots/11-filled-contact-details.png` | Valid contact field state with green checkmarks. |
| 12 | `screenshots/12-completion-payment-instructions-top.png` | Completion hero, bank transfer panel, variable symbol, amount, account number, order detail. |
| 13 | `screenshots/13-completion-payment-instructions-detail.png` | Support block, order delivery/payment detail, customer-line load indicator. |

## Acceptance Requirements

- Guest checkout must not redirect to login.
- Login remains optional and helpful, not blocking.
- Account creation must be a checkbox in the data step and must reveal password fields only when selected.
- Delivery, expedition, payment, delivery-in-another-day, and optional tip must each have visible state and appear in the summary.
- Summary must stay visible on desktop, collapse naturally on mobile, and immediately reflect selected costs.
- Validation must target the exact missing section and clear stale errors when the section becomes valid.
- Browser totals are display-only; backend must recalculate product prices and totals from server product/order data.
- Proforma/bank-transfer completion must show account number, variable symbol, amount, copy actions, and QR payment.
- Payment-provider gaps must remain visible; do not create fake paid states.

## Unknowns

- Mobile Smarty behavior is [UNKNOWN].
- Exact help-tooltip copy is [UNKNOWN].
- Exact rental tab flow is [UNKNOWN].
- Exact alternate-delivery-day date picker is [UNKNOWN].
- Exact payment provider redirects are [UNKNOWN].

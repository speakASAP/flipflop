# Smarty.cz Checkout Reference For FlipFlop Guest Checkout

```yaml
id: FF-REFERENCE-SMARTY-CHECKOUT
status: draft
owner: project owner
created: 2026-06-26
last_updated: 2026-06-26
completeness_level: implementation-reference
upstream:
  - ../../INTENT_MEMORY.md
  - ../../../01_vision/VISION.md
  - ../../../02_business_case/BUSINESS_CASE.md
  - ../../../SPEC.md
downstream:
  - ../../../implementation-goals/GOAL-09-smarty-checkout-reference-ux.md
  - ../../../21_execution_plans/EP-TASK-002-smarty-checkout-reference-ux.md
related_adrs:
  - ../../../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Purpose

Use Smarty.cz as the detailed UX reference for the FlipFlop checkout rewrite. The owner request is to let a customer buy without mandatory registration, while still offering account creation during checkout.

The FlipFlop target must provide two clear checkout modes:

1. Buy without registration.
2. Buy with optional registration by checking an account-creation checkbox after contact and address data are entered.

Password entry must not be required in checkout. If the customer opts to create an account, FlipFlop sends an email magic link after order submission; the link leads to account activation and password setup in the customer account flow.

## Source Evidence

Reference site:

- `https://www.smarty.cz/Objednavka/Zbozi?id=9290272&productId=203750&fullPriceWithGifts=null&individualOffer=null&isWithoutGiftsFlex=null`
- Current network note: a direct unauthenticated `curl -I` check on 2026-06-26 returned Cloudflare HTTP 403. The attached browser screenshots are therefore the primary reference artifact for this plan.

FlipFlop current URL:

- `https://flipflop.alfares.cz/cart`
- Current network note: `curl -I https://flipflop.alfares.cz/cart` returned HTTP 200 on 2026-06-26.

Reference screenshot folder:

```text
docs/reference/smarty-checkout/screenshots/
```

## Screenshot Catalog And Required Elements

| Screenshot | Reference stage | Required FlipFlop elements |
| --- | --- | --- |
| `01-add-to-cart-accessory-upsell-top.png` | Product added to cart, upsell top | Header with logo/search/account/cart, cart count and total, confirmation title, product image/name/price/VAT/storage, continue-shopping CTA, cart CTA, accessory category timeline, accessory cards, original accessory filter toggle, help/chat entry. |
| `02-add-to-cart-sticky-upsell-bottom.png` | Upsell scroll state | Sticky bottom bar with product thumbnail, product name, stock state, accessory badge, continue-shopping CTA, cart CTA; left accessory category rail remains scan-friendly while product grid scrolls. |
| `03-cart-services-summary.png` | Cart contents | Cart title, buy/rent tabs, item row with product image/name/stock/dispatch-today copy, quantity stepper, unit price, discount/original price, remove control, recommended services/warranty blocks, checked return guarantee, email/share/trash controls, right order summary with product/shipping/payment/expedition subtotals, discount-code entry, primary continue-to-delivery-payment CTA, help block. |
| `04-delivery-payment-options.png` | Checkout step 2 initial state | Simplified checkout header with contact details, three-step progress indicator, delivery options as selectable rows with icons/help, free/paid price labels, right sticky order summary, primary continue-to-personal-data CTA. |
| `05-delivery-validation-error.png` | Delivery validation | Red validation border around delivery group, error message "Neni vybran zpusob dopravy.", previously selected/remembered summary state on the right, CTA remains visible. |
| `06-expedition-payment-options.png` | Expedition/payment options | Expedition block with selected standard shipment and delivery ETA, payment options with icons/help/recommended badge, collapsed "change payment" row, optional different-day delivery checkbox, back link to cart, right summary. |
| `07-selected-delivery-payment-operator-tip.png` | Selected delivery/payment with optional tip | Selected delivery row, selected expedition row, selected payment row, operator-tip section with copy and selectable amounts, optional "different day" delivery checkbox, right summary total including shipping/payment. |
| `08-delivery-details-contact-form.png` | Step 3 top | Completed progress indicator, existing-account login prompt, login button, contact fields: email, phone, first name, last name; invoice section begins below fold; right summary remains sticky. |
| `09-registration-fields-order-submit.png` | Step 3 lower | Address fields: street/house number, city, postal code, country select; checkbox for different delivery vs invoice data; note textarea; account-creation checkbox; registration section appears when checked; submit CTA and terms/privacy copy. |
| `10-filled-address-registration.png` | Filled address with registration enabled | Field-level success checkmarks, filled address values, account checkbox checked, registration area visible. FlipFlop must not include password/password-confirmation fields; replace this area with magic-link explanation and no password input. |
| `11-filled-contact-details.png` | Filled contact data | Field-level success checkmarks for email and phone, filled first/last name, invoice section title, persistent right summary. |
| `12-completion-payment-instructions-top.png` | Completion top | Full storefront header, completion hero, proforma-invoice/payment instruction message, order preparation copy, expected delivery date, payment info panel, order detail panel, support chat. |
| `13-completion-payment-instructions-detail.png` | Completion lower | Payment transfer details with variable symbol, amount, account number and copy icons, important notice, order detail card with product/service/delivery/payment, support contact panel, customer-line load indicator. |

## Documented Reference User Flow

1. Customer adds a product to cart.
2. Site confirms the item was added and offers two choices: continue shopping or go to cart.
3. Site offers relevant accessory upsells without blocking checkout.
4. Customer opens cart.
5. Cart displays product, quantity, stock/dispatch state, optional services, return guarantee, and a right-side order summary.
6. Customer continues to delivery and payment.
7. Checkout switches to a simplified checkout header and a three-step progress bar: cart contents, delivery/payment, delivery details.
8. Customer selects delivery method.
9. If no delivery method is selected, checkout shows inline group validation and keeps the user on the same step.
10. Customer selects expedition/shipment timing and payment method.
11. Customer may choose a different delivery day.
12. Customer continues to delivery details.
13. Existing customers can sign in to prefill data, but sign-in is optional.
14. Guest customer enters email, phone, first name, last name, invoice address, country, optional different delivery address, and optional note.
15. Customer chooses whether to create an account by checking a checkbox.
16. Smarty currently asks for password after account checkbox. FlipFlop must not ask for password in checkout; it must create a pending account invitation and send a magic-link email after order submission.
17. Customer submits the order with payment obligation and accepts terms/privacy.
18. Payment initiation redirects or produces payment instructions depending on the payment method.
19. Completion page confirms the payment instruction or provider redirect result, shows order detail, expected delivery date, and support contacts.
20. If account creation was selected, the customer receives a registration magic link by email. The account activation flow is outside checkout and must not block the order.

## Element Implementation Matrix

| Element | Required in FlipFlop | Notes |
| --- | --- | --- |
| Header search/account/cart | Yes | Checkout pages may use a simplified header; cart and completion may use standard storefront header. |
| Cart count and total | Yes | Must work for guest cart and authenticated cart. |
| Add-to-cart confirmation | Yes | Current dirty guest-cart work may already support part of this. |
| Accessory upsell | Later phase allowed | Document as required UX reference, but implementation can start with stable layout placeholders if product recommendations are unavailable. Mark unavailable data as `[MISSING: recommendation source]`. |
| Sticky cart CTA bar | Yes | Important for long upsell/cart pages. |
| Buy/rent tabs | No for initial FlipFlop | Rent tab is Smarty-specific unless FlipFlop adds rentals. Do not add fake rental behavior. |
| Warranty/service options | Dependency-gated | Implement only if product/service SKU contract exists; otherwise preserve space and mark `[MISSING: service-product contract]`. |
| Return guarantee | Yes | Must align with Czech consumer-law policy and current FlipFlop return rules. |
| Discount code entry | Existing/verify | Keep if supported by `DiscountService`; validate against current backend contract. |
| Delivery method list | Yes | Needs selectable rows, icon, help tooltip, price, and validation. |
| Expedition date | Yes | Needs "ship today" vs delayed shipment/day choice. If backend ETA is missing, use deterministic configured estimates and mark data source gap. |
| Payment methods | Yes | Keep PayU, PayPal, GP WebPay, Stripe visibility but do not fake readiness. Blocked provider states must remain visible. |
| Operator tip | No for first implementation | Optional; do not add unless owner approves compensation/tip accounting. |
| Existing-account login prompt | Yes | Login is optional and prefill-only. |
| Contact fields | Yes | Email, phone, first name, last name with validation. |
| Invoice address fields | Yes | Street/house number, city, postal code, country. |
| Different delivery address | Yes | Checkbox reveals separate delivery fields. |
| Note field | Yes | Optional note to order/warehouse. |
| Account checkbox | Yes | Text: create account / activate customer account by email. |
| Password fields | No | Explicitly forbidden for checkout. Use post-order magic-link email. |
| Terms/privacy copy | Yes | Must link real FlipFlop legal documents; use `[MISSING: legal doc URL]` until located. |
| Completion/payment instructions | Yes | For bank transfer/proforma; provider redirects need a compatible payment-result page. |
| Support contact panel | Yes | Use real FlipFlop contact channels; mark unknown values. |
| Chat widget | Existing/verify | Include only if current support chat is deployed. |

## Visual And Typography Reference

Smarty uses a clean Czech e-commerce layout with strong black headings, magenta accent, bright green primary CTAs, pale gray page background, white cards, thin borders, and rounded-but-not-playful form controls.

Implementation guidance:

- Match the information hierarchy and interaction pattern more than the brand colors.
- Keep FlipFlop brand colors, but use the Smarty density, sticky summary, progress stepper, validation style, and large green primary CTA pattern.
- Typography should be a rounded geometric sans similar to the Smarty screenshots. `[UNKNOWN: exact Smarty font family and license]` until a browser/CSS inspection can access the site assets. Do not copy proprietary font assets unless their license allows it; if unavailable, use a compatible web-safe or licensed font stack.

## Current FlipFlop Gap Summary

- `/cart` is reachable and a dirty in-progress change already supports guest cart in local storage.
- `/checkout` still redirects unauthenticated users to `/login?redirect=/checkout`.
- API gateway guards `/api/orders*`, `/api/cart*`, `/api/payu/*`, and `/api/users/*` with JWT.
- Order service currently requires `userId`, persistent DB cart items, and `deliveryAddressId`.
- Prisma schema requires `User.password`, `DeliveryAddress.userId`, `Order.userId`, and `Order.deliveryAddressId`.
- No local magic-link/passwordless account contract was found in this repo.

## Implementation Boundary

Do not begin code changes until the GOAL-09 execution plan, context package, coding prompt, and IPS artifacts exist and pre-coding gates pass or record a blocker.

# Loading the app's data from Google Sheets

The app runs entirely in the browser, so each device keeps its own copy of the
data. Connect a Google Sheet and the sheet becomes the shared source of truth:
every device reads the same parts, tools, orders, sites and history.

## One-time setup

1. **Open the store's Google Sheet.** The script is already pointed at this one:

   `https://docs.google.com/spreadsheets/d/1thSXAHKVB_1M6ICV27P9Urr0mcIPQLHBZbGdCOEAwEY/edit`

   To use a different sheet, copy the id out of its URL — the part between
   `/d/` and `/edit` — and set `SHEET_ID` at the top of `Code_Store.gs`.
2. **Extensions → Apps Script.** Delete whatever is in the editor and paste in
   the whole of [`Code_Store.gs`](Code_Store.gs) from this repo. Save.
3. **Deploy → New deployment → Web app**, with:
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**

   Google will ask you to authorise the script the first time. Approve it.
4. **Copy the `/exec` URL** it gives you. It looks like
   `https://script.google.com/macros/s/AKfy…/exec`.
5. In the app, sign in as manager → **Settings → Google Sheets sync**, paste the
   URL into **Apps Script web app URL**, and press **Save URL**.

## Filling the sheet

Three ways, pick one:

- **Start from the app's demo data** — press **Push to Sheets** once. It writes
  what the device holds and creates every tab, so you can see the shape and
  edit over it.
- **Start from the entry workbook** — open
  [`voltgrid-data-entry.xlsx`](voltgrid-data-entry.xlsx), type your data into
  it, then in the sheet: **File → Import → Upload → Insert new sheet(s)**.
  Every tab is set up with the right headings, an example row to overwrite,
  dropdowns on the fixed-choice columns, and a note on each heading.
- **Start from empty tabs** — in the Apps Script editor, run `setupTabs()` once.
  It creates all five tabs with headers and nothing else.

Then bring it into the app with **Pull from Sheets**.

Keep the heading row exactly as written; columns are matched by name, so a
renamed or reordered column is read as blank.

## Column reference

Leave `id` blank on rows you add — the app fills it in and then uses it to
recognise the row. Never edit an existing `id`. Dates are `YYYY-MM-DD`; money
and quantities are plain numbers with no `$` or thousands separators.

**Parts** — `id`, `sku`, `name`, `cat`, `site`, `qty`, `min`, `unit`, `bin`,
`cost`, `sup`, `lt`, `war`, `warFrom`, `photo`, `updated`

| Column | Means |
|---|---|
| `sku` | Part number, must be unique |
| `cat` | Battery, PCS, HVAC, Electrical, Fire, Comms, Mechanical, Consumable |
| `site` | A code from the Sites tab, e.g. `TMP` |
| `qty` / `min` | On hand, and the level at or below which it counts as low |
| `unit` | pcs, m, box, set, cyl, tub … |
| `bin` | Shelf location, e.g. `A1-03` |
| `cost` / `lt` | Unit cost in USD, supplier lead time in days |
| `war` / `warFrom` | Warranty months (0 = none) and its start date |
| `updated` | Managed by the app — leave blank |

**Tools** — `id`, `code`, `name`, `cat`, `site`, `status`, `holder`, `outAt`,
`dueAt`, `calInt`, `calLast`, `calNext`, `cert`, `war`, `warFrom`, `photo`,
`cond`, `notes`

| Column | Means |
|---|---|
| `code` | Asset code, e.g. `TL-001`, must be unique |
| `cat` | Test & Measure, Mechanical, Safety, Comms, Lifting, Other |
| `status` | `in`, `out` or `maint` |
| `holder` / `dueAt` | Who has it and when it is due back, when status is `out` |
| `calInt` | Calibration interval in months, 0 = not required |
| `calLast` / `calNext` / `cert` | Last done, next due, certificate number |
| `cond` | Good, Fair or Needs repair |

**PurchaseOrders** — `id`, `no`, `sup`, `site`, `status`, `created`, `eta`,
`by`, `notes`, `linesJSON`. Status is `draft`, `ordered`, `shipped`,
`received` or `cancelled`. `linesJSON` holds the order lines as JSON, e.g.
`[{"part":"p_ab12","qty":6,"cost":310}]` — easier to build in the app than by
hand.

**Sites** — `id`, `name`, `code`. Use the same short code for `id` and `code`.

**ActivityLog** — `id`, `ts`, `type`, `by`, `site`, `part`, `qty`, `value`,
`txt`. This is the audit trail; the app writes it. There is no reason to type
into it by hand.

## Reading it automatically

Tick **Load from the sheet every time the app opens** in the same card. On every
open the app reads the sheet before it draws anything, so whoever opens it sees
the current numbers without pressing a button.

If the sheet cannot be reached — no connection, or Google is slow — the app says
so and carries on with the copy on that device rather than showing nothing.

## What travels and what does not

| Travels through the sheet | Stays on the device |
|---|---|
| Parts, tools, purchase orders | Accounts and passwords |
| Sites | Uploaded photos |
| Activity log | Branding (app name and logo) |

**Accounts are deliberately excluded.** Passwords would otherwise sit in a
spreadsheet anyone with the link could read. Set your team up per device with
**Settings → Accounts → Import list**, or add them by hand.

## Safety rails

- A pull that comes back with no parts is treated as a failure — a wrong URL or
  a broken deployment cannot silently wipe good data.
- Pull **replaces** local parts, tools, orders, sites and history. Anything
  changed on the device and not yet pushed is lost, so push before you pull if
  the device has newer work on it.
- `Who has access: Anyone` means anyone with the `/exec` URL can read and write
  the sheet. Treat that URL as a password, and use a Google account you control.

## Extras in the script

Two optional functions you can run from the Apps Script editor:

- `buildConsumption()` — pivots issued value by month and site onto a
  `Consumption` tab. `buildConsumption('receive')` does the same for goods in.
- `emailLowStock()` — emails a list of everything at or below minimum. Set the
  address at the top of the function and give it a daily trigger.

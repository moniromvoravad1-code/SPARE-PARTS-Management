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

Press **Push to Sheets** once. That writes the device's current data up and
creates the tabs: `Parts`, `Tools`, `PurchaseOrders`, `Sites`, `ActivityLog`.

From then on you can edit values directly in the sheet — quantities, minimums,
costs, bin locations, suppliers — and bring them back with **Pull from Sheets**.

Keep the header row exactly as written; the columns are matched by name.

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

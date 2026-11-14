# Sales and gross profit reports

Admin: open **Sales & profit** (`/staff/sales`). Choose Daily, Weekly, Monthly or Yearly, select a date inside that period, and click View report. Sort the breakdown by date, highest book sales or highest gross profit.

- Bangladesh time (UTC+06); weeks run Monday through Sunday.
- Daily reports show hours; weekly/monthly reports show days; yearly reports show months. Empty intervals are included.
- A sale counts on the date staff record received cash, not on order placement. Unpaid orders and bKash test receipts do not count.
- Refunds appear on the refund date, including refunds of older sales.
- Gross profit = discounted book revenue minus book refunds minus cost of copies sold. Delivery charges are excluded. Refunded cost is reversed only if copies were restocked.
- Net receipts = all received cash (including delivery) minus actual refunds. This is not profit.
- Gross profit excludes rent, salaries, delivery expenses and other overheads; it is not net profit. Buyback payouts are stock acquisition, not a direct deduction here; include the acquisition cost in the used-copy cost before its next sale to avoid double counting.

## Record book costs
Open Books & inventory, edit a title, and enter **Purchase cost per copy (BDT)** for each condition. Leave blank if unknown; use 0 only for genuinely free stock. Enter an inventory-update reason and save. For mixed acquisition batches, maintain a reasonable average cost for that condition.

Each new order snapshots its cost at checkout. Later inventory changes never rewrite historical profit. Old orders have no cost snapshot and will display Cost missing. There is no invented historical cost or automatic backfill. A period containing missing costs does not show a misleading profit total.

## Quick test
1. Use a test title priced at BDT 1,000 with cost BDT 600 and enough stock.
2. Place a cash order for one copy without a coupon. It should not yet increase paid sales.
3. Staff > Orders & payments > Record received cash (only record money actually received, or use a separate test database for classroom testing).
4. Admin > Sales & profit > Daily > select today's date. That order contributes BDT 1,000 book sales and BDT 400 gross profit, excluding delivery charges.
5. Switch through Weekly, Monthly and Yearly. That payment should appear in the correct date/month bucket. Try an empty past period and sort by sales/profit.
6. In a test database, record a full refund with restocking. The refund period shows the refund and reverses BDT 600 cost. Without restocking, the book cost is not reversed.
7. A student or staff-only account must not access /staff/sales. Only admins can see financial analytics.

## Deployment
Push the commit, let Render deploy the latest main branch (or use Manual Deploy > Deploy latest commit), and wait for Live. No new environment variables or manual database migration are needed. Startup creates date indexes; existing data is retained. Atlas and Compass show new variants.costPrice and orders.items.unitCost values in integer paisa after saving costs and placing new orders. Refresh Compass to see changes. Reports read existing payments.paidAt and refunds.createdAt.

Tests: npm test against a dedicated local replica set and bup_bookstore_test. Never point destructive test fixtures at the production database.

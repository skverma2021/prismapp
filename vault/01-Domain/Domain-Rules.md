# Domain Rules

## Ownership Rules
1. O1- An Individual can own one or more Units simultaneously.
2. O2- An Individual may own the same Unit multiple times across different time periods.
3. O3- A Unit cannot have more than one active owner at any given time.
4. O4- A Unit must always have exactly one active owner.
5. O5- Ownership continuity starts on `Units.inceptionDt`.
6. O6- The first owner on `Units.inceptionDt` is `BUILDER_INVENTORY` unless a migrated historical owner starts exactly on that same date.
7. O7- Ownership periods for a Unit must not have gaps; with current date-only inputs, `next.fromDt` must equal `previous.toDt + 1 day`.
8. O8- Ownership transfer is contiguous by rule: the outgoing owner ends on the day before the incoming owner starts.

## Unit Lifecycle Rules
1. U1- Each Unit has an `inceptionDt` that marks when it enters builder inventory and ownership continuity begins.
2. U2- Creating a Unit also creates its initial active ownership row for `BUILDER_INVENTORY` starting on `inceptionDt`.
3. U3- `BUILDER_INVENTORY` is a system identity, not a resident and not a normal payer/operator selection option.
4. U4- `Units.sqFt` is locked once any per-sq-ft contribution has been recorded for that unit.


## Residency Rules
1. R1- An Individual can be a resident of multiple Units simultaneously.
2. R2- An Individual may reside in the same Unit multiple times across different time periods.
3. R3- A Unit can have at most one active resident at any given time.
4. R4- A Unit may have zero or one active resident (i.e., can be vacant).
5. R5- Residency cannot start while the active owner is `BUILDER_INVENTORY`; transfer ownership to a real individual first.
6. R6- System identities cannot be selected as residents.

## Temporal Integrity Rules

1. No overlapping ownership periods for the same Unit.
2. No ownership gaps for the same Unit after `Units.inceptionDt`.
2. No overlapping residency periods for the same Unit.
## Contribution Rules
1. **contributionHeads**: This table defines different purposes (description) of payment, unit (payUnit) of payment, and applicable month or year for which payment is made.
2. **contributionRates**: This table defines historical rates (amt) related to a type of contribution (contributionHeadsId), a reference to how it was decided (reference to minutes of a meeting) , and Period (fromDt to toDt). A null in toDt means the current applicable rate.
	- interpretation of current/applicable rate: rate effective as on transactionDateTime.
	- revised rates (up/down) are forward effective only; historical posted entries are not recalculated.
3. **contributionPeriods**: This table defines year (refYear), and months (refMonth) of the year it belongs to. These rows are pre-populated (seeded). For each year there are 13 rows where refMonth = 0 indicates entire year and refMonth = 1..12 indicates individual months (Jan .. Dec).
4. **contributions**: This table defines reference to unit (unitId), purpose of contribution (contributionHeadsId), a basis for measuring payable amount (quantity),  transaction ID (transactionId), date of transaction (transactionDate), and the individual who is making the payment (depositedBy).
	- *quantity*: it has a reference to payUnit defined in contributionHeads. Here is how this field will be populated:
		- for contribution head = 1 (maintenance) , the field quantity will be the area of the flat (or unit) in Sq Ft. So in this case there is no user action since the app pulls it from units table. In any maintenance payment, user pays for only one unit based on its area
		- for contribution head = 2, 5, 6, 7 the field quantity will be 1. These charges are lumpsum per unit.
		- for contribution head = 3,4,8,9,10  the field quantity will indicate number of persons who will be availing the services, entered by operator at payment time.
		- eligibility rule for payUnit = 2: there must be at least one active resident for the unit on transaction date/time.
		- payable formula: total payable for a contribution = quantity x applicable rate x periodCount.
		- amount distribution rule: contributionDetails.amt stores per-period amount (quantity x applicable rate) for each selected period row.
	- *periodCount*: it is a count of applicable periods (months only; app will permit payment for one/current year only). This will decide the number of rows to be created in contributionDetails table.
		- for period = month, user must select explicit months (contributionPeriodIds); hidden auto-progression by count is not allowed.
		- for period = year, exactly one yearly period row (refMonth = 0) must be selected.
	- *transactionId* and transactionDate: A user can make UPI or Bank transfer payment. contributions table only records a reference and date of transaction. The amount is recorded in contributionDetails table.
		- payment can be made for multiple months (contribution head with period = month) or a single year (contribution head with period = year) 
		- in case of  contribution head with period = month, the amount gets distributed among selected months in the contributionDetails table (therefore multiple rows will be created).
		- in case of  contribution head with period = year, the amount gets associated with selected year in the contributionDetails table (therefore only one row will be created).
	- *depositedBy*: any person available in the individual table can pay, therefore the person can be a resident or an owner or neither of them (just an individual).
5. **contributionDetails**: This table maps payments to rows from contributionPeriods. A payment record in contributions table corresponds to a month (or months) or an year. A row in this table takes contributionId, contributionPeriodId, and the payable amount for each month or 1 year calculated on the basis of applicable rate from contributionRates table and quantity from contributions table.

## Contribution Period Constraints

1. Payments can only be made for periods within the current year.
2. For monthly contributions, only months of the same year can be selected.
3. Yearly contributions must use refMonth = 0.

## Duplicate Protection Rules

1. A Unit cannot have duplicate contribution entries for the same contributionHead and contributionPeriod.
2. The system must prevent double payment for the same period.
3. Net-zero unlock policy: if all entries for a unit + head + period are fully compensated (net amount = 0), reposting for that period is allowed.
4. UI helper: for monthly heads, app should provide a month ledger per unit + head + year showing Paid/Unpaid status, transaction references, and amount by month.
5. UI convenience: show latestPaidMonth derived from ledger rows (highest month with net paid amount > 0).

## Quantity Rules

1. quantity is computed by server using contributionHeads.payUnit.
2. For payUnit = 1 (per sqft), quantity is derived from Units.sqFt.
3. For payUnit = 3 (lumpsum), quantity is fixed as 1.
4. For payUnit = 2 (per person), quantity comes from operator input (availing person count).
5. For payUnit = 2, the system must enforce resident eligibility: at least one active resident must exist for the unit at transaction date/time.
6. For payUnit = 3, quantity is always 1 and amount depends only on contributionRate for the selected head and time.
## Financial Integrity Rules

1. Contributions are immutable once recorded.
2. ContributionDetails cannot be modified after creation.
3. Any correction must be done via a new compensating transaction.

4. **Amount Consistency Rule**: The sum of all rows in contributionDetails for a contributionId must equal the total payable amount for that contribution.

5. **Rate Locking Rule:**
	- Contribution rate must be determined at the time of payment using contributionRates.
	- Once applied, the rate must not change even if future rates are updated.

## Individual Rules
1. An Individual may be an owner, resident,  both, or just a person who makes payment against a contribution head.
2. Email and mobile must be unique per individual.

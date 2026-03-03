import pool from "../db/pool";
import { Contact, IdentifyRequest, IdentifyResponse } from "../models/contact";

/**
 * Core identity reconciliation logic.
 *
 * Algorithm:
 * 1. Find all contacts matching the incoming email OR phoneNumber.
 * 2. Walk up linkedId pointers to collect all distinct primary IDs.
 * 3. If no matches -> create a new primary contact.
 * 4. If matches exists:
 *    a. Determine the oldest primary (by createdAt) -> that's the primary.
 *    b. Demote any otehr primaries to secondary, pointing at THE primary.
 *    c. Re-link their secondaries to THE primary as well.
 *    d. If the request carries new info (email/phone not yet in the group),
 *       insert a new secondary row.
 * 5. Return the consolidated identity.
 */
export async function identify(req: IdentifyRequest): Promise<IdentifyResponse> {
  const { email, phoneNumber } = req;

  // Step 1. Find direct matches
  const conditions: string[] = [];
  const values: (string | null)[] = [];
  let idx = 1;

  if (email) {
    conditions.push(`email = $${idx++}`);
    values.push(email);
  }
  if (phoneNumber) {
    conditions.push(`"phoneNumber" = $${idx++}`);
    values.push(phoneNumber);
  }

  const matchQuery = `
    SELECT * FROM contacts
    WHERE (${conditions.join(" OR ")})
    AND "deletedAt" IS NULL
    ORDER BY "createdAt" ASC
  `;
  const { rows: directMatches } = await pool.query<Contact>(matchQuery, values);

  // Step 2: No match -> create primary
  if (directMatches.length === 0) {
    const insertQuery = `
      INSERT INTO contacts (email, "phoneNumber", "linkPrecedence")
      VALUES ($1, $2, 'primary')
      RETURNING *
    `;
    const { rows } = await pool.query<Contact>(insertQuery, [email ?? null, phoneNumber ?? null]);
    const createdContact = rows[0];
    return formatResponse(createdContact.id, [createdContact]);
  }

  // Step 3: Collect all primary IDs involved
  const primaryIds = new Set<number>();
  for (const c of directMatches) {
    if (c.linkPrecedence === "primary") {
      primaryIds.add(c.id);
    } else if (c.linkedId !== null) {
      primaryIds.add(c.id);
    }
  }

  // Fetch primaries to pick the oldest
  const primariesQuery = `
    SELECT * FROM contacts
    WHERE id = ANY($1) AND "deletedAt" IS NULL
    ORDER BY "createdAt" ASC
  `;
  const { rows: primaries } = await pool.query<Contact>(primariesQuery, [Array.from(primaryIds)]);

  const thePrimary = primaries[0]; // the oldest primary

  // Demote other primaries -> secondary
  const otherPrimaryIds = primaries.slice(1).map((p) => p.id);

  if (otherPrimaryIds.length > 0) {
    // Demote the primaries
    await pool.query(
      `UPDATE contacts
       SET "linkPrecedence" = 'secondary',
           "linkedId"       = $1,
           "updatedAt"      = NOW()
       WHERE id = ANY($2)`,
      [thePrimary.id, otherPrimaryIds],
    );

    // Re-point their former secondaries to the oldest primary
    await pool.query(
      `UPDATE contacts
       SET "linkedId" = $1,
           "updatedAt" = NOW()
       WHERE "linkedId" = ANY($2)
      `,
      [thePrimary.id, otherPrimaryIds],
    );
  }

  // Step 4: Maybe insert a new secondary
  // Fetch the full group now (after merges) to check for new info
  const groupQuery = `
    SELECT * FROM contacts
    WHERE (id = $1 OR "linkedId" = $1)
      AND "deletedAt" IS NULL
    ORDER BY "createdAt" ASC
  `;
  let { rows: group } = await pool.query(groupQuery, [thePrimary.id]);

  const existingEmails = new Set(group.map((c) => c.email).filter(Boolean));
  const existingPhones = new Set(group.map((c) => c.phoneNumber).filter(Boolean));

  const hasNewEmail = email && !existingEmails.has(email);
  const hasNewPhone = phoneNumber && !existingPhones.has(phoneNumber);

  if (hasNewEmail || hasNewPhone) {
    const insertSecondary = `
      INSERT INTO contacts (email, "phoneNumber", "linkedId", "linkPrecedence")
      VALUES ($1, $2, $3, 'secondary')
      RETURNING *
    `;

    const { rows: inserted } = await pool.query<Contact>(insertSecondary, [
      email ?? null,
      phoneNumber ?? null,
      thePrimary.id,
    ]);

    group.push(inserted[0]);
  }

  return formatResponse(thePrimary.id, group);
}

/**
 * Build the response shape from a primary id and all group contacts
 */
function formatResponse(primaryId: number, contacts: Contact[]): IdentifyResponse {
  const emails: string[] = [];
  const phoneNumbers: string[] = [];
  const secondaryIds: number[] = [];

  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();

  for (const c of contacts) {
    if (c.email && !seenEmails.has(c.email)) {
      seenEmails.add(c.email);
      emails.push(c.email);
    }

    if (c.phoneNumber && !seenPhones.has(c.phoneNumber)) {
      seenPhones.add(c.phoneNumber);
      phoneNumbers.push(c.phoneNumber);
    }

    if (c.id !== primaryId) {
      secondaryIds.push(c.id);
    }
  }

  return {
    contact: {
      primaryContactId: primaryId,
      emails: emails,
      phoneNumbers: phoneNumbers,
      secondaryContactsIds: secondaryIds,
    },
  };
}

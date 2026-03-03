CREATE TABLE IF NOT EXISTS contacts (
    id               SERIAL PRIMARY KEY,
    email            VARCHAR(320),
    "phoneNumber"    VARCHAR(20),
    "linkedId"       INT REFERENCES contacts(id) ON DELETE SET NULL,
    "linkPrecedence" VARCHAR(10) NOT NULL DEFAULT 'primary' CHECK ("linkPrecedence" IN ('primary', 'secondary')),
    "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deletedAt"      TIMESTAMPTZ
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_contacts_email
    ON contacts (email) WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_phone
    ON contacts ("phoneNumber") WHERE "phoneNumber" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_linked_id
    ON contacts ("linkedId") WHERE "linkedId" IS NOT NULL;

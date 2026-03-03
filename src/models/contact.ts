export interface Contact {
  id: number;
  email: string | null;
  phoneNumber: string | null;
  linkedId: number | null;
  linkPrecedence: "primary" | "secondary";
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface IdentityRequest {
  email?: string | null;
  phoneNumber?: string | null;
}

export interface IdentityResponse {
  contact: {
    primaryContactId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactsIds: number[];
  };
}

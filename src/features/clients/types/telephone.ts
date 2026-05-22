export type Telephone = {
  id: string;
  clientId: string;
  number: string;
  isActive: boolean;
  isMain: boolean;
};

export type CreateTelephoneInput = {
  number: string;
  isMain?: boolean;
  isActive?: boolean;
};

export type TelephonePatchInput = {
  id?: string;
  number?: string;
  isMain?: boolean;
  isActive?: boolean;
};

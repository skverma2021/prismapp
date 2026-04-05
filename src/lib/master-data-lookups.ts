export type UnitLookupOption = {
  id: string;
  description: string;
  blockId: string;
  block?: {
    description: string;
  };
};

export type IndividualLookupOption = {
  id: string;
  fName: string;
  mName?: string | null;
  sName: string;
};
import type { UserRole } from "./user-role";

export function maskEmail(email: string | null): string | null {
  if (!email) return email;
  const at = email.indexOf("@");
  if (at <= 1) return "***";
  return `${email.slice(0, 2)}***@${email.slice(at + 1)}`;
}

export function maskMobile(mobile: string | null): string | null {
  if (!mobile) return mobile;
  if (mobile.length <= 4) return "***";
  return `${mobile.slice(0, 3)}***${mobile.slice(-2)}`;
}

type WithPii = {
  eMail: string | null;
  mobile: string | null;
};

export function maskIndividualPii<T extends WithPii>(individual: T, role: UserRole): T {
  if (role === "READ_ONLY") {
    return {
      ...individual,
      eMail: maskEmail(individual.eMail),
      mobile: maskMobile(individual.mobile),
    };
  }
  return individual;
}

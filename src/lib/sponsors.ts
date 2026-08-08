export interface Sponsor {
  id: string;
  brand: string;
  title: string;
  description: string;
  href: string;
  label?: string;
  active: boolean;
}

export const homepagePrimarySponsor: Sponsor = {
  id: "homepage-primary",
  brand: "",
  title: "",
  description: "",
  href: "",
  active: false,
};

export const homepageSecondarySponsor: Sponsor = {
  id: "homepage-secondary",
  brand: "",
  title: "",
  description: "",
  href: "",
  active: false,
};

export const site = {
  name: "Sip & Nest",
  legalName: "Sip and Nest",
  city: "Chicago",
  neighborhood: "North Side",
  address: "2147 W Wilson Avenue, Chicago, IL 60625",
  phone: "(773) 555-0148",
  email: "hello@sipandnest.com",
  hours: "Tuesday–Sunday, 7:30am–4pm",
  hoursNote: "Closed Monday",
  hoursShort: "Tue–Sun 7:30am–4pm",
  pickupCopy:
    "We'll have it on the counter under your name. No payment online — settle up when you pick up. Closed Mondays.",
  owner: "Sai Reddy",
  domain: "sipandnest.com",
} as const;

export const ORDER_NUMBER_OFFSET = 1041;

export const pickupSlots = [
  "7:30am",
  "8:00am",
  "8:30am",
  "9:00am",
  "9:30am",
  "10:00am",
  "10:30am",
  "11:00am",
  "11:30am",
  "12:00pm",
  "12:30pm",
  "1:00pm",
  "1:30pm",
  "2:00pm",
  "2:30pm",
  "3:00pm",
  "3:30pm",
] as const;

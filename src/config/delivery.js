// Ghana regions shown at checkout, in the order customers see them.
// The live fee for each region comes from the `delivery_rates` table (edited
// in Admin → Settings). DEFAULT_DELIVERY_RATES is only a fallback for when the
// table can't be reached; the server always charges the database value.
export const ACCRA_REGION = 'Greater Accra';

export const DEFAULT_DELIVERY_RATES = [
  { region: 'Greater Accra', fee: 35 },
  { region: 'Ashanti', fee: 50 },
  { region: 'Western', fee: 50 },
  { region: 'Central', fee: 45 },
  { region: 'Eastern', fee: 45 },
  { region: 'Volta', fee: 45 },
  { region: 'Northern', fee: 60 },
  { region: 'Upper East', fee: 60 },
  { region: 'Upper West', fee: 60 },
  { region: 'Bono', fee: 55 },
  { region: 'Bono East', fee: 55 },
  { region: 'Ahafo', fee: 55 },
  { region: 'Western North', fee: 55 },
  { region: 'Oti', fee: 50 },
  { region: 'Savannah', fee: 60 },
  { region: 'North East', fee: 60 },
];

export const GHANA_REGIONS = DEFAULT_DELIVERY_RATES.map((r) => r.region);

// Highest fee an admin can enter, matching the database check constraint.
export const MAX_DELIVERY_FEE = 5000;

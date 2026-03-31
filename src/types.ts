/**
 * Continent enum for venue locations
 */
export enum Continent {
  NorthAmerica = 'North America',
  SouthAmerica = 'South America',
  Europe = 'Europe',
  Asia = 'Asia'
}

/**
 * Venue information for concerts
 */
export interface Venue {
  name: string;
  city: string;
  continent: Continent;
  capacity?: string;
}

export interface Relation {
  id: number;
  title: string;
  coverImage: string | null;
  relationType: string;
  format: string | null;
  status: string | null;
  startDate: {
    year: number | null;
    month: number | null;
    day: number | null;
  } | null;
}

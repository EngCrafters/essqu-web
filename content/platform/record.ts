/**
 * SAMPLE CONTENT: the society's output, year by year, for the About page's record.
 *
 * The society has not yet published yearly totals, so these are illustrative figures and the
 * page labels them as samples. The series starts with the society's founding year (2000–01,
 * from its own overview) and runs to the current year. Replace each year's numbers with the
 * society's own records (activities held; member projects active) and set `sample` to false.
 */

export interface YearRecord {
  year: number
  /** Activities and events held in the year. */
  activities: number
  /** Member projects active in the year. */
  projects: number
  /** The current year, still in progress. */
  toDate?: boolean
  /** The year the society was established (2000–01, from its own overview). */
  founded?: boolean
}

const FOUNDED = 2000

/** [year, activities, projects] */
const SAMPLE: [number, number, number][] = [
  [2000, 3, 0],
  [2001, 4, 1],
  [2002, 6, 1],
  [2003, 5, 2],
  [2004, 7, 2],
  [2005, 8, 2],
  [2006, 8, 3],
  [2007, 10, 3],
  [2008, 9, 4],
  [2009, 11, 3],
  [2010, 12, 4],
  [2011, 11, 5],
  [2012, 13, 5],
  [2013, 14, 6],
  [2014, 13, 6],
  [2015, 15, 7],
  [2016, 16, 7],
  [2017, 17, 8],
  [2018, 16, 9],
  [2019, 18, 9],
  [2020, 14, 8],
  [2021, 17, 9],
  [2022, 20, 10],
  [2023, 22, 11],
  [2024, 24, 12],
  [2025, 27, 14],
  [2026, 23, 12],
]

export const YEARLY_RECORD: { sample: boolean; years: YearRecord[] } = {
  sample: true,
  years: SAMPLE.map(([year, activities, projects], i) => ({
    year,
    activities,
    projects,
    ...(year === FOUNDED ? { founded: true } : {}),
    ...(i === SAMPLE.length - 1 ? { toDate: true } : {}),
  })),
}

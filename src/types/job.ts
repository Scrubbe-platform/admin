/**
 * Job model. The zod schema it came from was described as complete and
 * trustworthy, so field names are kept as-is, with two deliberate changes
 * flagged in the handoff:
 *
 *   applicationDeadline: mm/dd/yy -> ISO 8601 date (YYYY-MM-DD)
 *   responsibilities / requirements / benefits: string -> string[]
 *
 * The public careers page already accepts arrays or newline-separated text for
 * the bullet fields, so arrays are safe in that direction. If the backend turns
 * out to store TEXT, lib/api/jobs.ts is the single place that joins/splits.
 */

export const DEPARTMENTS = [
  "Engineering",
  "Design",
  "Marketing",
  "Sales",
  "HR",
  "Finance",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export const EMPLOYMENT_TYPES = [
  "Full-Time",
  "Part-Time",
  "Contract",
  "Internship",
  "Temporary",
] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const JOB_LEVELS = [
  "Entry-Level",
  "Mid-Level",
  "Senior",
  "Executive",
  "Director",
] as const;

export type JobLevel = (typeof JOB_LEVELS)[number];

export const JOB_STATUSES = ["OPEN", "CLOSED"] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export interface Job {
  id: string;
  title: string;
  department: Department;
  employmentType: EmploymentType;
  location: string;
  jobLevel: JobLevel;
  salaryRange: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  /** ISO 8601 date, YYYY-MM-DD. */
  applicationDeadline: string;
  applicationLink: string | null;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
}

export interface JobWriteInput {
  title: string;
  department: Department;
  employmentType: EmploymentType;
  location: string;
  jobLevel: JobLevel;
  salaryRange: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  applicationDeadline: string;
  applicationLink: string | null;
}

/**
 * The public careers page reads `employmentType` but falls back to `type`, so
 * raw records may carry either. Normalisation lives in lib/api/jobs.ts.
 */
export interface RawJobRecord extends Partial<Omit<Job, "responsibilities" | "requirements" | "benefits">> {
  type?: string;
  responsibilities?: string[] | string;
  requirements?: string[] | string;
  benefits?: string[] | string;
}

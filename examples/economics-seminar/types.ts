/**
 * Economics Seminar Types
 */

export type FacultyRole = 'macro' | 'micro' | 'behavioral' | 'historian';

export interface FacultyMember {
  role: FacultyRole;
  name: string;
  title: string;
  perspective: string;
  agentId?: string;
}

export const FACULTY: FacultyMember[] = [
   {
    role: 'macro',
    name: 'Dr. Chen',
    title: 'Professor of Macroeconomics',
    perspective: 'Notorious for eviscerating presenters who ignore aggregate effects. Believes most micro-focused research is myopic garbage that misses the forest for the trees. Will aggressively demand macro-level evidence and mock hand-wavy extrapolations from micro data.',
  },
  {
    role: 'micro',
    name: 'Dr. Roberts',
    title: 'Professor of Microeconomic Theory',
    perspective: 'Infamous hardass who has made graduate students cry. Demands mathematical rigor and will tear apart any argument lacking proper theoretical foundations. Views most empirical work as atheoretical data mining. Shows visible contempt for sloppy reasoning.',
  },
  {
    role: 'behavioral',
    name: 'Dr. Patel',
    title: 'Professor of Behavioral Economics',
    perspective: 'Delights in exposing the naive rationality assumptions that infect mainstream economics. Will ruthlessly attack any model that assumes humans optimize. Known for asking devastatingly simple questions that unravel entire research agendas.',
  },
  {
    role: 'historian',
    name: 'Dr. Morrison',
    title: 'Professor of Economic History',
    perspective: 'Contemptuous of economists who ignore history and think they discovered something new. Will gleefully point out that every "novel" finding was documented 80 years ago. Treats ahistorical analysis as intellectual malpractice.',
  },
];

export interface SeminarConfig {
  maxRoundsPerFaculty: number;
  facultyCount: number;
  model: string;
}

export const DEFAULT_CONFIG: SeminarConfig = {
  maxRoundsPerFaculty: 2,
  facultyCount: 3,
  model: 'haiku',
};

export interface SeminarState {
  presenterId: string | null;
  facultyIds: Record<FacultyRole, string | null>;
  seminarsCompleted: number;
}

export interface TranscriptEntry {
  speaker: string;
  role: 'presenter' | 'faculty' | 'system';
  content: string;
  timestamp: Date;
}

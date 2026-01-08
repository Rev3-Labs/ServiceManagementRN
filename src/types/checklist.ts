// Checklist types based on the configuration screen example

export type QuestionType = 
  | 'Yes/No/NA' 
  | 'Single Choice' 
  | 'Multiple Choice' 
  | 'Number' 
  | 'Date' 
  | 'Text';

export type ConditionalBranch = 'IF YES' | 'IF NO';

export interface Choice {
  id: string;
  label: string;
}

export interface ConditionalQuestion {
  branch: ConditionalBranch;
  question: ChecklistQuestion;
}

export interface ChecklistQuestion {
  id: string;
  text: string;
  description?: string;
  type: QuestionType;
  required: boolean;
  tags?: string[];
  choices?: Choice[]; // For Single Choice and Multiple Choice
  conditionalQuestions?: ConditionalQuestion[]; // Sub-questions based on answers
}

export interface Checklist {
  id: string;
  name: string;
  description?: string;
  customerId?: string;
  customerName?: string;
  status: 'Active' | 'Inactive';
  questions: ChecklistQuestion[];
  created?: string;
  createdBy?: string;
  lastModified?: string;
  lastModifiedBy?: string;
}

export interface ChecklistAnswer {
  questionId: string;
  value: string | string[] | number | Date | null;
}

export interface ChecklistResponse {
  checklistId: string;
  answers: ChecklistAnswer[];
  completedAt?: Date;
}


export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}

export interface TaskCreate {
  title: string;
  description: string;
  status: TaskStatus;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  status?: TaskStatus;
}

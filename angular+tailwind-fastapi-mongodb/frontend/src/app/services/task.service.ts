import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Task, TaskCreate, TaskUpdate } from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly base = '/api/tasks';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Task[]> {
    return this.http.get<Task[]>(this.base);
  }

  getOne(id: string): Observable<Task> {
    return this.http.get<Task>(`${this.base}/${id}`);
  }

  create(task: TaskCreate): Observable<Task> {
    return this.http.post<Task>(this.base, task);
  }

  update(id: string, task: TaskUpdate): Observable<Task> {
    return this.http.put<Task>(`${this.base}/${id}`, task);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

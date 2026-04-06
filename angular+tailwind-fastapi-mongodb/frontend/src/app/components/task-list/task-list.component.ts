import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-4xl mx-auto px-4 py-8">
        <div class="flex items-center justify-between mb-8">
          <h1 class="text-3xl font-bold text-gray-800">Task Manager</h1>
          <a
            routerLink="/create"
            class="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg transition">
            + New Task
          </a>
        </div>

        <div *ngIf="loading" class="text-center text-gray-500 py-12">Loading tasks...</div>

        <div *ngIf="errorMsg" class="text-center text-red-500 py-12">{{ errorMsg }}</div>

        <div *ngIf="!loading && tasks.length === 0" class="text-center text-gray-400 py-12">
          No tasks yet. Create your first one!
        </div>

        <div class="grid gap-4">
          <div
            *ngFor="let task of tasks"
            class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start justify-between hover:shadow-md transition">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 mb-1">
                <h2 class="text-lg font-semibold text-gray-800 truncate">{{ task.title }}</h2>
                <span [class]="statusClass(task.status)" class="text-xs font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap">
                  {{ task.status }}
                </span>
              </div>
              <p class="text-gray-500 text-sm line-clamp-2">{{ task.description }}</p>
              <p class="text-gray-400 text-xs mt-2">{{ task.created_at | date:'medium' }}</p>
            </div>
            <div class="flex gap-2 ml-4 shrink-0">
              <a
                [routerLink]="['/edit', task.id]"
                class="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition">
                Edit
              </a>
              <button
                (click)="deleteTask(task.id)"
                class="text-red-500 hover:text-red-700 text-sm font-medium px-3 py-1 rounded-lg hover:bg-red-50 transition">
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class TaskListComponent implements OnInit {
  tasks: Task[] = [];
  loading = true;
  errorMsg = '';

  constructor(private taskService: TaskService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    console.log('TaskListComponent ngOnInit fired');
    this.loadTasks();
  }

  loadTasks() {
    this.loading = true;
    this.errorMsg = '';
    console.log('Fetching tasks...');
    this.taskService.getAll().subscribe({
      next: (tasks) => {
        console.log('Tasks received:', tasks);
        this.tasks = tasks;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching tasks:', err);
        this.errorMsg = 'Failed to load tasks: ' + (err.message ?? JSON.stringify(err));
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  deleteTask(id: string) {
    if (!confirm('Delete this task?')) return;
    this.taskService.delete(id).subscribe(() => {
      this.tasks = this.tasks.filter((t) => t.id !== id);
      this.cdr.detectChanges();
    });
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      'todo': 'bg-gray-100 text-gray-600',
      'in-progress': 'bg-yellow-100 text-yellow-700',
      'done': 'bg-green-100 text-green-700',
    };
    return map[status] ?? 'bg-gray-100 text-gray-600';
  }
}

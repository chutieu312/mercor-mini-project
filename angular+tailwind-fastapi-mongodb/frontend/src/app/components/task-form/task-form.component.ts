import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { TaskStatus } from '../../models/task.model';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-2xl mx-auto px-4 py-8">
        <div class="flex items-center gap-3 mb-8">
          <a routerLink="/" class="text-gray-400 hover:text-gray-600 transition">
            ← Back
          </a>
          <h1 class="text-2xl font-bold text-gray-800">
            {{ isEditMode ? 'Edit Task' : 'New Task' }}
          </h1>
        </div>

        <div *ngIf="loading" class="text-center text-gray-500 py-12">Loading...</div>

        <form *ngIf="!loading" (ngSubmit)="onSubmit()" class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Title <span class="text-red-500">*</span></label>
            <input
              type="text"
              [(ngModel)]="title"
              name="title"
              required
              placeholder="Task title"
              class="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              [(ngModel)]="description"
              name="description"
              rows="4"
              placeholder="Optional description..."
              class="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              [(ngModel)]="status"
              name="status"
              class="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white">
              <option value="todo">Todo</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>

          <div class="flex gap-3 pt-2">
            <button
              type="submit"
              [disabled]="submitting || !title.trim()"
              class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-lg transition">
              {{ submitting ? 'Saving...' : (isEditMode ? 'Update Task' : 'Create Task') }}
            </button>
            <a
              routerLink="/"
              class="flex-1 text-center border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-lg transition">
              Cancel
            </a>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class TaskFormComponent implements OnInit {
  isEditMode = false;
  taskId: string | null = null;
  loading = false;
  submitting = false;

  title = '';
  description = '';
  status: TaskStatus = 'todo';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private taskService: TaskService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.taskId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.taskId;

    if (this.isEditMode && this.taskId) {
      this.loading = true;
      this.taskService.getOne(this.taskId).subscribe({
        next: (task) => {
          this.title = task.title;
          this.description = task.description;
          this.status = task.status;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.router.navigate(['/']);
        },
      });
    }
  }

  onSubmit() {
    if (!this.title.trim()) return;
    this.submitting = true;

    const payload = { title: this.title.trim(), description: this.description.trim(), status: this.status };

    const request = this.isEditMode && this.taskId
      ? this.taskService.update(this.taskId, payload)
      : this.taskService.create(payload);

    request.subscribe({
      next: () => this.router.navigate(['/']),
      error: () => { this.submitting = false; this.cdr.detectChanges(); },
    });
  }
}

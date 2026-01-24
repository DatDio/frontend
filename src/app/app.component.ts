import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { LoaderComponent } from './shared/components/loader/loader.component';
import { AnnouncementPopupComponent } from './shared/components/announcement-popup/announcement-popup.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, LoaderComponent],
  template: `
    <router-outlet></router-outlet>
    <app-toast></app-toast>
    <app-loader></app-loader>
  `,
  styles: []
})
export class AppComponent {
  title = 'EmailSieuRe-fe';
}

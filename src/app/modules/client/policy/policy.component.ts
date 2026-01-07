import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-policy',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './policy.component.html',
  styleUrls: ['./policy.component.scss']
})
export class PolicyComponent implements OnInit {
  private readonly seoService = inject(SeoService);

  ngOnInit(): void {
    this.seoService.setPageMeta(
      'Chính Sách Bảo Mật - EmailSieuRe',
      'Chính sách bảo mật và quyền riêng tư của EmailSieuRe. Cam kết bảo vệ thông tin khách hàng.',
      'chính sách bảo mật, privacy policy, bảo mật, EmailSieuRe'
    );
  }
}

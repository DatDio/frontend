import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-terms-of-service',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './terms-of-service.component.html',
  styleUrls: ['./terms-of-service.component.scss']
})
export class TermsOfServiceComponent implements OnInit {
  private readonly seoService = inject(SeoService);

  ngOnInit(): void {
    this.seoService.setPageMeta(
      'Điều Khoản Dịch Vụ - EmailSieuRe',
      'Điều khoản và điều kiện sử dụng dịch vụ EmailSieuRe. Quy định về quyền và trách nhiệm của người dùng.',
      'điều khoản dịch vụ, terms of service, quy định, EmailSieuRe'
    );
  }
}

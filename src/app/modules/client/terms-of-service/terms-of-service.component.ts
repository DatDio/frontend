import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-terms-of-service',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './terms-of-service.component.html',
  styleUrls: ['./terms-of-service.component.scss']
})
export class TermsOfServiceComponent implements OnInit {
  private readonly seoService = inject(SeoService);

  ngOnInit(): void {
    this.seoService.setPageMeta(
      'Điều Khoản Dịch Vụ - MailShop',
      'Điều khoản và điều kiện sử dụng dịch vụ MailShop. Quy định về quyền và trách nhiệm của người dùng.',
      'điều khoản dịch vụ, terms of service, quy định, MailShop'
    );
  }
}

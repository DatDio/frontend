import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pricing.component.html',
  styleUrls: ['./pricing.component.scss']
})
export class PricingComponent implements OnInit {
  plans = [
    {
      name: 'Basic',
      price: 9.99,
      features: [
        '5 Mail Accounts',
        'Gmail & Yahoo',
        'Basic Support',
        '30 Days Validity'
      ],
      popular: false
    },
    {
      name: 'Pro',
      price: 29.99,
      features: [
        '20 Mail Accounts',
        'All Providers',
        'Priority Support',
        '90 Days Validity',
        'Account Management'
      ],
      popular: true
    },
    {
      name: 'Enterprise',
      price: 99.99,
      features: [
        'Unlimited Accounts',
        'All Providers',
        '24/7 Dedicated Support',
        'Lifetime Validity',
        'API Access',
        'Custom Domains'
      ],
      popular: false
    }
  ];

  constructor(private seoService: SeoService) {}

  ngOnInit(): void {
    this.seoService.setPageMeta(
      'Pricing Plans - MailShop',
      'Choose the perfect plan for your needs. Affordable pricing for premium mail accounts.',
      'pricing, plans, mail accounts pricing'
    );
  }
}

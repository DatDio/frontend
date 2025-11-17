import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  features = [
    {
      icon: 'shield-check',
      title: 'Secure & Verified',
      description: 'All mail accounts are verified and secured with encryption'
    },
    {
      icon: 'lightning',
      title: 'Instant Delivery',
      description: 'Get your mail account credentials instantly after purchase'
    },
    {
      icon: 'cash',
      title: 'Best Prices',
      description: 'Competitive pricing with flexible payment options'
    },
    {
      icon: 'headset',
      title: '24/7 Support',
      description: 'Round-the-clock customer support for all your queries'
    }
  ];

  constructor(private seoService: SeoService) {}

  ngOnInit(): void {
    this.seoService.setTitle('MailShop - Premium Mail Accounts Marketplace');
    this.seoService.setMetaDescription('Buy and sell premium mail accounts securely. Gmail, Outlook, Yahoo and more. Verified accounts with instant delivery.');
    this.seoService.setOpenGraph({
      title: 'MailShop - Premium Mail Accounts',
      description: 'Secure marketplace for premium mail accounts',
      image: '/assets/images/og-home.jpg',
      url: 'https://mailshop.com'
    });
  }
}
